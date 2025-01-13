// Récupérer le gameId depuis l'URL
const gameId = window.location.pathname.split('/')[1];
const token = window.location.pathname.split('/')[2];

// Connexion au serveur Socket.IO en envoyant le gameId
const socket = io({
    query: {
        gameId: gameId,
        token: token
    }
});

// Récupération de tous les éléments du DOM qui sont manipulés
const messageInput = document.getElementById('message-input');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('send-btn');
const imgPersonality = document.getElementById('img-personality');
const question = document.getElementById('question');
const leaderboard_players = document.getElementById('leaderboard-players');
const timer = document.getElementById('timer');
const timerCircle = document.querySelector('.timer-circle');
const timerNumber = document.getElementById('timer');

// Initialisation de la variable playerName
let playerName = null;

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

// Fonction traitant la réception du signal 'join' provenant du serveur
socket.on('join', (pseudonyme) => {
    messagesDiv.innerHTML += `<p class="text-center">Vous avez rejoint la partie...</p>`;
    playerName = pseudonyme;
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

// Fonction traitant la réception du signal 'message' provenant du serveur
socket.on('message', ({playerName, msg}) => {
    let messageParagraph = document.createElement('p');
    // Vérification si le message est envoyé par le système
    if (playerName === 'System') {
        messageParagraph.classList.add("text-center");

        // Vérification du cas où le serveur annonce d'une mauvaise réponse proposée
        if (msg.includes("Mauvaise réponse")) {
            messageParagraph.classList.add("text-red-400");
        }

        // Vérification du cas où le serveur annonce d'une bonne réponse proposée
        if (msg.includes("Bonne réponse")) {
            messageInput.disabled = true;
            sendBtn.disabled = true;
        }

        // Ajoute le contenu du message au paragraphe et ajoute le paragraphe à la div des messages
        messageParagraph.innerText = msg;
        messagesDiv.appendChild(messageParagraph);
    }
    else { // Si ce n'est pas le système (donc un joueur)
        // Affichage du pseudonyme du joueur dans un span en gras
        let span = document.createElement('span');
        span.classList.add('font-bold');
        span.innerText = playerName;
        messageParagraph.appendChild(span);

        // Affichage du message du joueur à la suite du pseudonyme
        let message = document.createTextNode(` : ${msg}`);
        messageParagraph.appendChild(message);

        // Ajout du message entier à la div des messages
        messagesDiv.appendChild(messageParagraph);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
});

// Fonction traitant la réception du signal 'new round' provenant du serveur
socket.on('new round', ({roundNumber, personality, timeLeft}) => {
    // Affiche l'image de la personnalité et le message de l'indice
    imgPersonality.classList.remove('hidden');
    question.classList.remove('hidden');

    // Active la zone de saisi de réponse
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();

    // Initialise le timer et enlève la couleur rouge de la manche précédente
    timer.innerHTML = timeLeft;
    timer.classList.remove('text-red-500');

    // Affiche le numéro de la manche et l'image de la personnalité avec l'indice
    messagesDiv.innerHTML += `<p class="font-bold">Manche n°${roundNumber}</p>`;
    messagesDiv.innerHTML += `<p>Indice : ${personality.hint}</p>`;
    imgPersonality.src = `${personality.image}`;

    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Permet de mettre le scroll en bas
})

// Fonction traitant la réception du signal 'update leaderboard' provenant du serveur
socket.on('update leaderboard', (leaderboard) => {
    leaderboard_players.innerHTML = ''; // Réinitialise le contenu

    // Parcours le tableau des joueurs et les ajoute à la liste
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

        // Ajoute le contenu du message au paragraphe et ajoute le paragraphe à la div des messages
        rowP.innerText = `${medal}${player.username} : ${player.score} point(s)`;
        leaderboard_players.appendChild(rowP);
    });
});

// Fonction traitant la réception du signal 'timer' provenant du serveur
socket.on('timer', ({totalTime, timeLeft}) => {
    // On calcule le pourcentage de cercle à afficher
    const progress = ((totalTime - timeLeft) / totalTime) * 360;
    timerCircle.style.setProperty('--progress', `${progress}deg`);

    // Si le timer est égal à 0 (plus de temps restant), on désactive la zone de saisi et on vide le champ
    if (timeLeft === 0) {
        messageInput.disabled = true;
        messageInput.value = '';
        sendBtn.disabled = true;
    }

    // Si le timer est inférieur ou égal à 5, on change la couleur du timer en rouge
    if (timeLeft > 0 && timeLeft <= 5) {
        timerNumber.classList.add('text-red-500');
        timerCircle.classList.add('text-red-500');

        // Le cercle en rouge qui se vide
        timerCircle.style.background = `conic-gradient(rgba(239, 68, 68, 0.2) var(--progress), transparent 0deg)`;
    }

    // Sinon le timer est supérieur à 5, on enlève la couleur rouge
    if (timeLeft > 5) {
        timerNumber.classList.remove('text-red-500');
        timerCircle.classList.remove('text-red-500');

        // Le cercle normal qui se vide
        timerCircle.style.background = `conic-gradient(rgba(200, 200, 200, 0.2) var(--progress), transparent 0deg)`;
    }

    // Affiche le temps restant dans le timer
    timerNumber.textContent = timeLeft;
});

// Fonction traitant la réception du signal 'end game' provenant du serveur
socket.on('end game', () => {
    // Cache l'image de la personnalité et le message de l'indice
    imgPersonality.classList.add('hidden');
    question.classList.add('hidden');
});

socket.on('redirect', data => {
    window.parent.postMessage('redirectHome', data.url);
})