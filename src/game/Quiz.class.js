import { personnalites } from './personalities.js';
import fs from 'fs';
import config from '../../config.json' with { type: 'json' };

/**
 * @brief Convertit une image en base 64
 * @param filePath Chemin d'accès à l'image
 * @returns {string} Image convertie en base 64
 */
function getBase64Image(filePath) {
    const fileData = fs.readFileSync(filePath);
    return `data:image/png;base64,${fileData.toString('base64')}`;
}

/**
 * @brief Classe Quiz
 * @details Classe permettant de gérer une partie de quiz
 */
export class Quiz {

    /**
     * @brief Constructeur de la classe Quiz
     * @param id Identifiant de la partie
     * @param nbRounds Nombre de manches
     * @param duration Durée d'une manche
     * @param players Liste des joueurs
     * @param token Token de la partie
     */
    constructor(id, nbRounds = 5, duration = 30, players = [], token) {
        this._id = id;                          // Identifiant de la partie
        this._currentRound = 0;                 // Numéro de la manche actuelle
        this._currentPersonality = null;        // Personnalité de la manche actuelle
        this._isRoundActive = false;            // Indique si une manche est en cours
        this._nbRounds = nbRounds;              // Nombre de manches
        this._usedPersonalities = new Set();    // Personnalités déjà utilisées au cours de la partie
        this._scores = new Map();               // Scores et autres informations à propos des participants
        this._roundDuration = duration;         // Durée d'une manche
        this._timeLeft = duration;              // Temps restant dans la manche actuelle
        this._token = token;                    // Token de la partie

        // Initialisation des joueurs
        players.forEach(player => this.addPlayer(player));
    }

    get currentRound() {
        return this._currentRound;
    }

    set currentRound(value) {
        this._currentRound = value;
    }

    get scores() {
        return this._scores;
    }

    set scores(value) {
        this._scores = value;
    }

    get currentPersonality() {
        return this._currentPersonality;
    }

    set currentPersonality(value) {
        this._currentPersonality = value;
    }

    get isRoundActive() {
        return this._isRoundActive;
    }

    set isRoundActive(value) {
        this._isRoundActive = value;
    }

    get timeLeft() {
        return this._timeLeft;
    }

    set timeLeft(value) {
        this._timeLeft = value;
    }

    get roundDuration() {
        return this._roundDuration;
    }

    set roundDuration(value) {
        this._roundDuration = value
    }

    /**
     * @brief Ajoute un joueur à la partie
     * @param player Joueur à ajouter
     */
    addPlayer(player) {
        this._scores.set(player.username, {
            uuid: player.uuid,      // Identifiant unique du joueur
            token: player.token,    // Token unique pour identifier le joueur dans la partie
            score: 0,               // Score du joueur
            connected: false        // Indique si le joueur est connecté
        });
    }

    /**
     * @brief Supprime un joueur de la partie
     * @param playerUsername Nom d'utilisateur du joueur à supprimer
     */
    removePlayer(playerUsername) {
        this._scores.delete(playerUsername);
    }

    /**
     * @brief Démarre une nouvelle manche
     * @param personality Personnalité à deviner pour la manche
     */
    startNewRound(personality) {
        this._currentPersonality = personality;
        this._isRoundActive = true;
        this._currentRound++;

        // Réinitialise le temps restant à la manche
        this._timeLeft = this._roundDuration;
    }

    /**
     * @brief Termine une manche
     */
    endRound() {
        this._currentPersonality = null;
        this._isRoundActive = false;
    }

    /**
     * @brief Vérifie si la partie est terminée
     * @returns {boolean} Vrai si la partie est terminée, faux sinon
     */
    isGameOver() {
        // Vérifie si le numéro de la manche courante est supérieur ou égale au nombre de manches total
        return this._currentRound >= this._nbRounds;
    }

    /**
     * @brief Récupère une personnalité aléatoire parmi celles qui n'ont pas encore été utilisées
     * @returns {any} Personnalité aléatoire
     */
    getRandomPersonality() {
        // Génère un tableau des personnalités disponibles en comparant le contenu de personnalites et _usedPersonalities
        const availablePersonalities = Array.from(personnalites).filter(p => !this._usedPersonalities.has(p));

        // Si aucune personnalité n'est disponible, on réinitialise _usedPersonalities et on en choisit une aléatoirement
        if (availablePersonalities.length === 0) {
            this._usedPersonalities.clear();

            // Sélectionne une personnalité aléatoire parmi toutes les personnalités puis l'ajoute à _usedPersonalities
            const personality = Array.from(personnalites)[Math.floor(Math.random() * personnalites.size)];
            this._usedPersonalities.add(personality);

            // Conversion de l'image en base64
            personality.image = getBase64Image(`./src/img/${personality.image}`);

            return personality;
        }

        // Sinon, on choisit une personnalité aléatoire parmi les personnalités disponibles puis on l'ajoute à _usedPersonalities
        const personality = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
        this._usedPersonalities.add(personality);

        // Conversion de l'image en base64
        personality.image = getBase64Image(`./src/img/${personality.image}`);

        return personality;
    }

    /**
     * @brief Retourne le classement des joueurs de la partie
     * @returns {{score: *, uuid: *, username: *}[]} Tableau des scores triés par ordre décroissant
     */
    getLeaderboard() {
        return Array.from(this._scores.entries())                                   // Convertit le Map en tableau
            .filter(([, data]) => data.connected)                                   // Filtre et garde les joueurs connectés
            .sort(([, dataA], [, dataB]) => dataB.score - dataA.score)    // Tri par ordre décroissant des scores
            .map(([username, data]) => ({                                      // Convertit chaque joueur en tableau associatif
                username: username,
                score: data.score,
                uuid: data.uuid
            }));
    }

    /**
     * @brief Démarre le timer de la manche
     * @param io Instance du serveur socket.io (utilisée pour envoyer des messages aux clients)
     * @returns {Promise<void>} Promesse résolue lorsque le timer est terminé
     */
    async startTimer(io) {
        const timer = setInterval(async () => {
            // Vérifie si le temps restant est supérieur à 0 et si une manche est en cours
            if (this._timeLeft > 0 && this.isRoundActive) {
                this._timeLeft--;

                // Envoi un signal à la room pour mettre à jour le timer des joueurs
                io.to(this._id).emit('timer', {
                    totalTime: this._roundDuration,
                    timeLeft: this._timeLeft});

            } else { // Le temps supérieur est inférieur ou égal à 0 (manche terminée, et personne n'a trouvé)

                // Réinitialise le timer
                clearInterval(timer);

                // Vérifie si une manche est en cours
                if (this._isRoundActive) {
                    // Récupère la personnalité et arrête la manche
                    let personality = this._currentPersonality;
                    this.endRound();

                    // Envoie un message à la room pour indiquer la fin de la manche
                    io.to(this._id).emit('message', {
                        playerName: 'System',
                        msg: `Temps écoulé ! La réponse était : ${personality.answer[0]}`,
                    });

                    // Vérifie si la partie est terminée (le numéro de la manche courante est supérieur ou égal au nombre de manches total)
                    if (!this.isGameOver()) {

                        // Attend 3 secondes avant de démarrer une nouvelle manche (pour laisser le temps aux joueurs de lire le message)
                        setTimeout(() => {

                            // Démarre une nouvelle manche avec une personnalité aléatoire et envoie la personnalité et le numéro de la manche à la room
                            this.startNewRound(this.getRandomPersonality());
                            io.to(this._id).emit('new round', {
                                roundNumber: this._currentRound,
                                personality: this._currentPersonality
                            });

                            // Envoie un signal à la room pour mettre à jour le timer des joueurs
                            io.to(this._id).emit('timer', {
                                totalTime: this._roundDuration,
                                timeLeft: this._timeLeft
                            });

                            // Démarre le timer de la nouvelle manche
                            this.startTimer(io);
                        }, 3000);

                    } else { // Sinon (la partie est terminée)
                        await this.endGame(io);
                    }
                }
            }
        }, 1000); // Le timer tourne toutes les secondes
    }

    /**
     * @brief Termine la partie
     * @param io Instance du serveur socket.io (utilisée pour envoyer des messages aux clients)
     * @returns {Promise<boolean>} Vrai si les résultats ont été envoyés avec succès, faux sinon
     */
    async endGame(io) {
        // Envoie un message à la room pour indiquer la fin de la partie
        await this.sendDelayedMessage(io, {
            playerName: 'System',
            msg: 'Fin de la partie !'
        }, 1000); // Attend 1 seconde avant d'envoyer le message

        // Envoie un signal à la room pour indiquer la fin de la partie (permet de cacher certains éléments du DOM
        io.to(this._id).emit('end game');

        // Envoie un message à la room pour indiquer le classement final
        await this.sendDelayedMessage(io, {
            playerName: 'System',
            msg: `Classement final :
            - ${this.getLeaderboard()
                .map(player => `${player.username} : ${player.score} point(s)`) // Affiche chacun des membres avec son score
                .join('\n- ')}` // Sépare chaque membre par un retour à la ligne
        }, 2500); // Attend 2.5 secondes avant d'envoyer le message

        // Initialisation de la variable winner
        let winner = null;

        // Vérifie s'il y a au moins un joueur dans la partie
        if (this.getLeaderboard().length === 0) {
            console.error('Aucun joueur n\'a été trouvé dans le classement de la partie ' + this._id);
        } else if (this.getLeaderboard().length === 1) {
            await this.sendDelayedMessage(io, {
                playerName: 'System',
                msg: 'Vous êtes seul dans la partie, que faites-vous ici ?'
            }, 1000);
        } else {
            // Vérification du cas exæquo total (aucun joueur n'a marqué de points ou tous les joueurs ont le même nombre de points)
            if (this.getLeaderboard()[0].score === 0 || this.getLeaderboard()[0].score === this.getLeaderboard()[this.getLeaderboard().length - 1].score) {
                await this.sendDelayedMessage(io, {
                    playerName: 'System',
                    msg: 'Tout le monde a le même score, quelle surprise !'
                }, 1000);
            }

            // Vérification si plusieurs joueurs ont le même nombre de points
            else {
                // Récupère le meilleur socre (le classement étant trié par ordre de score décroissant, le meilleur score est le premier)
                let bestScore = this.getLeaderboard()[0].score;

                // Récupère les joueurs ayant le meilleur score en les comparant à bestScore
                winner = this.getLeaderboard().filter(player => player.score === bestScore).map(player => player.uuid);
            }
        }

        // Envoie les résultats de la partie au serveur de Comus Party
        let results = Object.fromEntries([...this._scores].map(([_, playerData]) => [
            playerData.uuid,
            {
                token: playerData.token,
                score: playerData.score,
                winner: winner !== null && winner.includes(playerData.uuid)
            }
        ]));
        try {
            let request = new FormData();
            request.append('token', this._token);
            request.append('results', JSON.stringify(results));

            const response = await fetch(`${config.URL_COMUS}/game/${this._id}/end`, {
                method: 'POST',
                body: request
            }).then(response => response.json());

            if (!response.success) {
                throw new Error(response.message);
            }

            console.log(`Résultat de la partie ${this._id} envoyé au serveur de Comus Party avec succès`);
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi du résultat de la partie ${this._id} au serveur de Comus Party:`, error);
            return false;
        }
    }

    /**
     * @brief Envoie un message à la room après un certain délai
     * @param io Instance du serveur socket.io (utilisée pour envoyer des messages aux clients)
     * @param message Message à envoyer
     * @param delay Délai avant l'envoi du message
     * @returns {Promise<unknown>} Promesse résolue lorsque le message est envoyé
     */
    sendDelayedMessage(io, message, delay) {
        return new Promise(resolve => {
            setTimeout(() => {
                io.to(this._id).emit('message', {
                    playerName: message.playerName,
                    msg: message.msg
                });
                resolve();
            }, delay);
        });
    }
}