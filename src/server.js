import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { personnalites } from './game/personalities.js';
import { Quiz } from "./game/Quiz.class.js";


const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const NB_ROUNDS = 5;
const PLAYERS = new Map([
    ['Joueur 1', 0],
    ['Joueur 2', 0],
    ['Joueur 3', 0],
    ['Joueur 4', 0]
]);
let quiz = new Quiz(NB_ROUNDS, new Map()); // Instanciation d'un objet Quiz

if (PLAYERS.size > quiz.maxPlayers) {
    console.error('Le nombre de joueurs est trop élevé');
    process.exit(1);
}

let usedPersonalities = new Set(); // Personnalités déjà utilisées

function getRandomPersonality() {
    const availablePersonalities = personnalites.filter(p => !usedPersonalities.has(p));
    if (availablePersonalities.length === 0) {
        usedPersonalities.clear();
        const personality = personnalites[Math.floor(Math.random() * personnalites.length)];
        usedPersonalities.add(personality);
        return personality;
    }
    const personality = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
    usedPersonalities.add(personality);
    return personality;
}

function startNewRound() {
    quiz.startNewRound(getRandomPersonality());
    io.emit('new round', {
        roundNumber : quiz.currentRound,
        personality : quiz.currentPersonality
    });
}

const sendDelayedMessage = (message, delay) => {
    return new Promise(resolve => {
        setTimeout(() => {
            io.emit('message', message);
            resolve();
        }, delay);
    });
};

let availablePlayers = Array.from(PLAYERS.keys());

io.on('connection', (socket) => {
    // Attribution d'un pseudonyme disponible parmi ceux du tableau
    let pseudonyme = availablePlayers.shift();
    console.log('Un utilisateur s\'est connecté ! Pseudonyme : ' + pseudonyme);
    quiz.addPlayer(pseudonyme);
    socket.username = pseudonyme;
    socket.emit('join', {
        pseudonyme : pseudonyme,
        score : quiz.scores.get(pseudonyme),
    });

    socket.broadcast.emit('message', {
        playerName : 'System',
        msg : `${pseudonyme} a rejoint la partie !`,
    })

    // Lorsqu'un utilisateur se déconnecte
    socket.on('disconnect', () => {
        console.log('Un utilisateur s\'est déconnecté ! ' + socket.username);
        availablePlayers.push(pseudonyme);
    });

    // Vérification du nombre de joueurs
    if (quiz.scores.size < quiz.minPlayers) {
        console.log('Pas assez de joueurs pour commencé la partie');
        socket.emit('message', {
            playerName : 'System',
            msg : 'En attente de joueurs...',
        })
    }
    // S'il y a assez de joueurs
    else {
        // Envoi de la manche en cours (s'il y en a une)
        if (quiz.isRoundActive) {
            socket.emit('new round', {
                roundNumber : quiz.currentRound,
                personality : quiz.currentPersonality
            });
        }
        // Sinon, début d'une nouvelle partie
        else {
            io.emit('message', {
                playerName : 'System',
                msg : 'Début d\'une nouvelle partie !'
            });
            startNewRound();
        }
    }

    socket.on('guess', async ({playerName, message}) => {
        // Envoi immédiat du message du joueur
        io.emit('message', {
            playerName: playerName,
            msg: message,
        });

        if (!quiz.isRoundActive) {
            return;
        }

        if (quiz.currentPersonality.answer.includes(message.toLowerCase())) {
            // Incrémentation du score
            quiz.scores.set(playerName, quiz.scores.get(playerName) + 1);

            // Envoi de messages aux joueurs
            await sendDelayedMessage({
                playerName: 'System',
                msg: `Bonne réponse de ${playerName}, la personnalité était ${quiz.currentPersonality.answer[0]} !`
            }, 1000);

            await sendDelayedMessage({
                playerName: 'System',
                msg: `Votre score : ${quiz.scores.get(playerName)} point(s)`
            }, 1000);

            if (quiz.currentRound >= quiz.nbRounds) {
                await sendDelayedMessage({
                    playerName: 'System',
                    msg: 'Fin de la partie !'
                }, 1000);

                let scores = Array.from(quiz.scores.entries()).sort((a, b) => b[1] - a[1]);
                await sendDelayedMessage({
                    playerName: 'System',
                    msg: `Classement final :<br> - ${scores.map(([player, score]) => `${player} : ${score} point(s)`).join(',<br> - ')}`
                }, 2500);
            } else {
                setTimeout(() => {
                    startNewRound();
                }, 3000);
            }
        } else {
            // Message d'erreur immédiat
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