import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Quiz } from "./game/Quiz.class.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

// Stockage des différentes instances de quiz
const games = new Map();

// Serveur de jeu
const NB_ROUNDS = 5;
const maxPlayers = 10;
const minPlayers = 2;

app.get('/', (req, res) => {
    // Redirection vers une nouvelle partie avec un ID aléatoire
    const newGameId = Math.floor(Math.random() * 1000000);
    console.log('Nouvelle partie créée ! : ' + newGameId);
    // Ajouter le jeu aux parties
    games.set(newGameId, new Quiz(newGameId, NB_ROUNDS));
    res.redirect(`/game/${newGameId}`);
});

app.get('/game/:gameId/:uuid', (req, res) => {
    const gameId = Number(req.params.gameId); // Conversion de la chaîne en nombre pour éviter tout conflit
    const playerUuid = req.params.uuid;

    // Rediriger vers une page 404 si la partie n'existe pas
    if (!games.has(gameId)) {
        res.redirect('/404');
        return;
    }

    // Recherche de l'adresse IP dans la partie
    let playerFound = false;
    const game = games.get(gameId);
    game._scores.forEach((playerData, playerName) => {
        if (playerData.uuid === playerUuid) {
            playerFound = true;
        }
    })
    if (playerFound) {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    }
    else {
        // Rediriger vers une page 404 si l'adresse IP n'est pas trouvée
        res.redirect('/404');
    }
});

app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '404.html'));
});

app.post('/game/init', express.json(), (req, res) => {
    const { gameId, nbRound, players } = req.body;
    try {
        games.set(Number(gameId), new Quiz(Number(gameId), nbRound, players));
        res.status(200).json({
            success: true,
            message: 'Partie initialisée avec succès'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'initialisation de la partie'
        });
    }

});

app.use(express.static('public'));

// Connexion des utilisateurs
io.on('connection', (socket) => {
    const playerUuid = socket.handshake.query.uuid;
    const gameId = Number(socket.handshake.query.gameId);

    // Vérifier si la partie existe
    if (!games.has(gameId)) {
        console.log(`La partie ${gameId} n'existe pas`);
        return;
    }

    console.log(`Nouveau joueur connecté pour la partie ${gameId}`);

    let currentGame = games.get(gameId);
    let pseudonyme = '';

    // Récupération du pseudonyme du joueur
    currentGame._scores.forEach((playerData, playerName) => {
        if (playerData.uuid === playerUuid) {
            pseudonyme = playerName;
        }
    })
    console.log(`Nom du joueur : ${pseudonyme}`);

    // Rejoindre la room de cette partie
    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', pseudonyme);
    socket.emit('update leaderboard', currentGame.getLeaderboard());

    // Envoi de la manche déjà en cours (s'il y en a une)
    if (currentGame.isRoundActive) {
        socket.emit('new round', {
            roundNumber: currentGame.currentRound,
            personality: currentGame.currentPersonality
        });
    }

    // Envoi du leaderboard à jour
    io.to(gameId).emit('update leaderboard', currentGame.getLeaderboard());

    // Annonce dans le chat
    socket.broadcast.emit('message', {
        playerName: 'System',
        msg: `${pseudonyme} a rejoint la partie !`,
    });

    // Vérification si la partie peut commencer
    if (currentGame.scores.size >= minPlayers && !currentGame.isRoundActive) {
        io.to(gameId).emit('message', {
            playerName: 'System',
            msg: 'La partie commence !'
        });
        currentGame.startNewRound(currentGame.getRandomPersonality());
        io.to(gameId).emit('new round', {
            roundNumber: currentGame.currentRound,
            personality: currentGame.currentPersonality
        })
    }

    // Lorsque l'utilisateur se déconnecte
    socket.on('disconnect', () => {
        console.log(`${socket.username} a quitté la partie numéro ${gameId}`);
        currentGame._usedPersonalities.delete(socket.username);  // Re-liberer le pseudonyme
        currentGame.removePlayer(socket.username); // Retirer le joueur du jeu

        // Mise à jour du leaderboard après la déconnexion
        io.to(gameId).emit('update leaderboard', currentGame.getLeaderboard());

        // Si après la déconnexion il n'y a plus assez de joueurs, on arrête la partie
        if (currentGame.scores.size < minPlayers) {
            io.to(gameId).emit('message', {
                playerName: 'System',
                msg: 'Pas assez de joueurs pour continuer la partie, elle va être fermée.'
            });
            games.delete(gameId);
        }
    });

    // Lorsque les joueurs se connectent
    socket.on('guess', async ({playerName, message}) => {
        const sendDelayedMessage = (message, delay) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    io.to(gameId).emit('message', message);
                    resolve();
                }, delay);
            });
        };

        const sendDelayedMessageToSocket = (message, delay) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    socket.emit('message', message);
                    resolve();
                }, delay);
            });
        };

        // Envoi immédiat du message du joueur
        io.to(gameId).emit('message', {
            playerName: playerName,
            msg: message,
        });

        if (!currentGame.isRoundActive) {
            return;
        }

        if (currentGame.currentPersonality.answer.includes(message.toLowerCase())) {
            // Arrêt du round en cours pour éviter les réponses multiples
            currentGame.isRoundActive = false;

            // Incrémentation du score
            let player = currentGame.scores.get(playerName);
            player.score++;
            currentGame.scores.set(playerName, player);

            // Envoi de messages aux joueurs
            io.to(gameId).emit('message', {
                playerName: 'System',
                msg: `Bonne réponse de ${playerName}, la personnalité était ${currentGame.currentPersonality.answer[0]} !`
            });

            // Envoyer la mise à jour du leaderboard à tous les clients
            io.to(gameId).emit('update leaderboard', currentGame.getLeaderboard());

            await sendDelayedMessageToSocket({
                playerName: 'System',
                msg: `Votre score : ${currentGame.scores.get(playerName).score} point(s)`
            }, 1000);

            if (currentGame.currentRound >= currentGame.nbRounds) {
                await sendDelayedMessage({
                    playerName: 'System',
                    msg: 'Fin de la partie !'
                }, 1000);

                await sendDelayedMessage({
                    playerName: 'System',
                    msg: `Classement final :<br> - ${currentGame.getLeaderboard().map(player => `${player.username} : ${player.score} point(s)`).join('<br> - ')}`
                }, 2500);

                // Envoi du résultat final au serveur de Comus Party
                const data = {
                    gameCode: gameId,
                    scores: currentGame.scores,
                    winnerUuid: currentGame.getLeaderboard()[0].uuid
                };
                const response = await fetch('http://localhost:8000/game/end', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                if (response.ok) {
                    console.log(`Résultat de la partie ${gameId} envoyé avec succès`);
                } else {
                    console.error(`Erreur lors de l'envoi du résultat de la partie ${gameId}`);
                }

            } else {
                setTimeout(() => {
                    currentGame.startNewRound(currentGame.getRandomPersonality());
                    io.to(gameId).emit('new round', {
                        roundNumber: currentGame.currentRound,
                        personality: currentGame.currentPersonality
                    });
                }, 3000);
            }
        } else {
            // Message d'erreur
            socket.emit('message', {
                playerName: 'System',
                msg: `<p class="text-red-400">${message} : Mauvaise réponse ! Tenez bon...</p>`
            });
        }
    });
});

server.listen(3001, () => {
    console.log(`Server running on port 3001`);
});
