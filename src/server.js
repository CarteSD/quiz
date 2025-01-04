import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { personnalites } from './game/personalities.js';
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

app.use(express.static('public'));

// Fonction pour obtenir un pseudonyme unique parmi les joueurs
let availablePlayers = Array.from({length: maxPlayers}, (_, index) => `Joueur ${index + 1}`);

function getAvailablePlayer() {
    return availablePlayers.shift();
}

// Connexion des utilisateurs
io.on('connection', (socket) => {
    const gameId = socket.handshake.query.gameId;

    if (!gameId) {
        console.error('Game ID est undefined. Déconnexion du socket.');
        socket.disconnect(true);
        return;
    }

    console.log(`Nouveau joueur connecté pour la partie ${gameId}`);

    let currentGame = games.get(gameId);

    function getRandomPersonality() {
        const availablePersonalities = Array.from(currentGame._allPersonalities).filter(p => !currentGame._usedPersonalities.has(p));
        if (availablePersonalities.length === 0) {
            currentGame._usedPersonalities.clear();
            const personality = currentGame._allPersonalities[Math.floor(Math.random() * currentGame._allPersonalities.length)];
            currentGame._usedPersonalities.add(personality);
            return personality;
        }
        const personality = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
        currentGame._usedPersonalities.add(personality);
        return personality;
    }

    // Si le jeu n'existe pas, en créer un
    if (!currentGame) {
        currentGame = new Quiz(gameId, NB_ROUNDS);
        games.set(gameId, currentGame);
    }

    // Attribution d'un pseudonyme unique pour ce joueur
    const pseudonyme = getAvailablePlayer();
    console.log(`Nom du joueur : ${pseudonyme}`);

    // Ajout du joueur au jeu
    currentGame.addPlayer(pseudonyme);

    // Rejoindre la room de cette partie
    socket.join(gameId);
    socket.username = pseudonyme;
    socket.emit('join', {
        pseudonyme: pseudonyme,
        score: currentGame.scores.get(pseudonyme),
    });

    // Annonce dans le chat
    io.to(gameId).emit('message', {
        playerName: 'System',
        msg: `${pseudonyme} a rejoint la partie !`,
    });

    // Vérification si la partie peut commencer
    if (currentGame.scores.size >= minPlayers && !currentGame.isRoundActive) {
        io.to(gameId).emit('message', {
            playerName: 'System',
            msg: 'La partie commence !'
        });
        currentGame.startNewRound(getRandomPersonality());
        io.to(gameId).emit('new round', {
            roundNumber: currentGame.currentRound,
            personality: currentGame.currentPersonality
        })
    }

    // Lorsque l'utilisateur se déconnecte
    socket.on('disconnect', () => {
        console.log(`${socket.username} a quitté la partie numéro ${gameId}`);
        availablePlayers.push(socket.username);  // Re-liberer le pseudonyme
        currentGame.removePlayer(socket.username); // Retirer le joueur du jeu

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
                    currentGame.startNewRound(getRandomPersonality());
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
