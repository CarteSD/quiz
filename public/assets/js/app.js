const socket = io();

const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');

socket.on('connect', () => {
    console.log('connected to server');
    socket.emit('chat message', 'Un nouvel utilisateur s\'est connecté');
});

// Fonction permettant l'envoi du message au serveur via le socket
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('chat message', message);
        messageInput.value = '';
    }
}

// Les deux moyens différents d'envoyer un message (le bouton ou la touche "Enter")
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Fonction traitant la réception du signal 'message' provenant du serveur
socket.on('message', (msg) => {
    console.log('message: ' + msg);
    messagesDiv.innerHTML += `<p>${msg}</p>`;
});