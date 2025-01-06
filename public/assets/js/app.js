// Récupérer le gameId depuis l'URL
const gameId = window.location.pathname.split('/')[2];
const token = window.location.pathname.split('/')[3];

// Connexion au serveur Socket.IO en envoyant le gameId
const socket = io({
    query: {
        gameId: gameId,
        token: token
    }
});

const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');
const imgPersonality = document.getElementById('img-personality');
const question = document.getElementById('question');
const leaderboard_players = document.getElementById('leaderboard-players');
const timer = document.getElementById('timer');

let playerName = null;

function purifyHTML(unsafeHTML) {
    return DOMPurify.sanitize(unsafeHTML);
}

socket.on('connect', () => {
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
    if (playerName === 'System') {
        messagesDiv.innerHTML += `<p class="text-center">${purifyHTML(msg)}</p>`;
    }
    else {
        messagesDiv.innerHTML += `<p><span class="font-bold">${playerName} : </span>${purifyHTML(msg)}</p>`;
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

socket.on('new round', ({roundNumber, personality, timeLeft}) => {
    imgPersonality.classList.remove('hidden');
    question.classList.remove('hidden');
    messageInput.disabled = false;
    sendBtn.disabled = false;
    timer.innerHTML = timeLeft;
    timer.classList.remove('text-red-500');
    messagesDiv.innerHTML += `<p class="font-bold">Manche n°${roundNumber}</p>`;
    messagesDiv.innerHTML += `<p>Indice : ${personality.hint}</p>`;
    imgPersonality.src = `${personality.image}`;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
})

socket.on('join', (pseudonyme) => {
    messagesDiv.innerHTML += `<p class="text-center">Vous avez rejoint la partie...</p>`;
    playerName = pseudonyme;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

socket.on('update leaderboard', (leaderboard) => {
    leaderboard_players.innerHTML = ''; // Réinitialise le contenu
    leaderboard.forEach(player => {
        leaderboard_players.innerHTML += `<p>${purifyHTML(player.username)} : ${player.score} point(s)</p>`;
    });
});

socket.on('timer', timeLeft => {
    if (timeLeft === 0) {
        messageInput.disabled = true;
        sendBtn.disabled = true;
    }
    if (timeLeft > 0 && timeLeft <= 5) {
        timer.classList.add('text-red-500');
    }
    if (timeLeft > 5) {
        timer.classList.remove('text-red-500');
    }
    timer.innerHTML = timeLeft;
})