import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Un utilisateur s\'est connecté !');
    socket.on('chat message', (msg) => {
        io.emit('message', msg);
    });
});

server.listen(3001, () => {
    console.log(`Server running on port 3001`);
});