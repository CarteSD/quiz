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

app.get('/game/:gameId', (req, res) => {
    const gameId = Number(req.params.gameId); // Conversion de la chaîne en nombre pour éviter tout conflit

    // Rediriger vers une page 404 si la partie n'existe pas
    if (!games.has(gameId)) {
        res.redirect('/404');
        return;
    }

    // Renvoyer la page du jeu
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', '404.html'));
});

app.post('/game/init', express.json(), (req, res) => {
    const { gameId, nbRound, players } = req.body;
    try {
        games.set(gameId, new Quiz(gameId, nbRound, players));
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
    const gameId = Number(socket.handshake.query.gameId);

    // Vérifier si la partie existe
    if (!games.has(gameId)) {
        console.log(`La partie ${gameId} n'existe pas`);
        return;
    }

    console.log(`Nouveau joueur connecté pour la partie ${gameId}`);

    let currentGame = games.get(gameId);

    // Attribution d'un pseudonyme unique pour ce joueur
    const pseudonyme = currentGame.getRandomPseudonyme();
    console.log(`Nom du joueur : ${pseudonyme}`);

    // Ajout du joueur au jeu
    currentGame.addPlayer(pseudonyme);

    // Rejoindre la room de cette partie
    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', pseudonyme);

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
            process.exit(0);
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
            // Incrémentation du score
            currentGame.scores.set(playerName, currentGame.scores.get(playerName) + 1);

            // Envoi de messages aux joueurs
            io.to(gameId).emit('message', {
                playerName: 'System',
                msg: `Bonne réponse de ${playerName}, la personnalité était ${currentGame.currentPersonality.answer[0]} !`
            });

            // Envoyer la mise à jour du leaderboard à tous les clients
            io.to(gameId).emit('update leaderboard', currentGame.getLeaderboard());

            await sendDelayedMessageToSocket({
                playerName: 'System',
                msg: `Votre score : ${currentGame.scores.get(playerName)} point(s)`
            }, 1000);

            if (currentGame.currentRound >= currentGame.nbRounds) {
                await sendDelayedMessage({
                    playerName: 'System',
                    msg: 'Fin de la partie !'
                }, 1000);

                let scores = Array.from(currentGame.scores.entries()).sort((a, b) => b[1] - a[1]);
                await sendDelayedMessage({
                    playerName: 'System',
                    msg: `Classement final :<br> - ${scores.map(([player, score]) => `${player} : ${score} point(s)`).join(',<br> - ')}`
                }, 2500);
            } else {
                setTimeout(() => {
                    currentGame.startNewRound(currentGame.getRandomPersonality());
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
