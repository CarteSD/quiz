const socket = io();

const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');
const imgPersonality = document.getElementById('img-personality');
const question = document.getElementById('question');

let playerName = null;

socket.on('connect', () => {
    console.log('connected to server');
    socket.emit('chat message', 'Un nouvel utilisateur s\'est connecté');
});

// Fonction permettant l'envoi du message au serveur via le socket
function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('guess', {playerName, message});
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
socket.on('message', ({playerName, msg}) => {
    console.log('message: ' + msg);
    messagesDiv.innerHTML += `<p><span class="font-bold">${playerName} : </span>${msg}</p>`;
});

socket.on('new round', ({roundNumber, personality}) => {
    imgPersonality.classList.remove('hidden');
    question.classList.remove('hidden');
    console.log(personality);
    messagesDiv.innerHTML += `<p class="font-bold">Manche n°${roundNumber}</p>`;
    messagesDiv.innerHTML += `<p>Indice : ${personality.hint}</p>`;
    imgPersonality.src = `/assets/images/${personality.image}`;
})

socket.on('join', ({pseudonyme, score}) => {
    messagesDiv.innerHTML += `<p>Bienvenue ${pseudonyme} ! Votre score : ${score}pts</p>`;
    playerName = pseudonyme;
});