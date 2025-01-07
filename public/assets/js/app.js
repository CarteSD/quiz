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
        let messageParagraph = document.createElement('p');
        messageParagraph.classList.add("text-center");
        if (msg.includes("Mauvaise réponse")) {
            messageParagraph.classList.add("text-red-400");
        }
        if (msg.includes("Bonne réponse")) {
            messageInput.disabled = true;
            sendBtn.disabled = true;
        }
        messageParagraph.innerText = msg;
        messagesDiv.appendChild(messageParagraph);
    }
    else {
        let messageParagraph = document.createElement('p');
        let span = document.createElement('span');
        span.classList.add('font-bold');
        span.innerText = playerName;
        messageParagraph.appendChild(span);
        let message = document.createTextNode(` : ${msg}`);
        messageParagraph.appendChild(message);
        messagesDiv.appendChild(messageParagraph);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

socket.on('new round', ({roundNumber, personality, timeLeft}) => {
    imgPersonality.classList.remove('hidden');
    question.classList.remove('hidden');
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
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
    leaderboard.forEach((player, index) => {
        let rowP = document.createElement('p');
        let medal = '';

        // Attribue les émojis de médailles selon la position
        switch (index) {
            case 0:
                medal = '🥇・';
                break;
            case 1:
                medal = '🥈・';
                break;
            case 2:
                medal = '🥉・';
                break;
        }
        rowP.innerText = `${medal}${player.username} : ${player.score} point(s)`;
        leaderboard_players.appendChild(rowP);
    });
});

socket.on('timer', ({totalTime, timeLeft}) => {
    const timerCircle = document.querySelector('.timer-circle');
    const timerNumber = document.getElementById('timer');

    // On inverse le calcul du progress pour que ça se vide
    const progress = ((totalTime - timeLeft) / totalTime) * 360;
    timerCircle.style.setProperty('--progress', `${progress}deg`);

    if (timeLeft === 0) {
        messageInput.disabled = true;
        messageInput.value = '';
        sendBtn.disabled = true;
    }

    if (timeLeft > 0 && timeLeft <= 5) {
        timerNumber.classList.add('text-red-500');
        timerCircle.classList.add('text-red-500');
        // Le cercle en rouge qui se vide
        timerCircle.style.background = `conic-gradient(rgba(239, 68, 68, 0.2) var(--progress), transparent 0deg)`;
    }

    if (timeLeft > 5) {
        timerNumber.classList.remove('text-red-500');
        timerCircle.classList.remove('text-red-500');
        // Le cercle normal qui se vide
        timerCircle.style.background = `conic-gradient(rgba(200, 200, 200, 0.2) var(--progress), transparent 0deg)`;
    }

    timerNumber.textContent = timeLeft;
});

socket.on('end game', () => {
    imgPersonality.classList.add('hidden');
    question.classList.add('hidden');
});