import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { personnalites } from './game/personalities.js';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

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

let personality = getRandomPersonality();

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté !');
    io.emit('new round', personality);


    // Lorsqu'un client envoie un message
    socket.on('chat message', (msg) => {
        io.emit('message', msg); // On le renvoie à tous les clients
        if (personality.answer.includes(msg.toLowerCase())) {
            personality = getRandomPersonality();
            io.emit('message', 'Un joueur a trouvé la réponse !');
            io.emit('new round', personality);
        }
    });
});

server.listen(3001, () => {
    console.log(`Server running on port 3001`);
});