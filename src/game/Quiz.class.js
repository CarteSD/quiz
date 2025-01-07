import { personnalites } from './personalities.js';
import fs from 'fs';
import config from '../../config.json' with { type: 'json' };

function getBase64Image(filePath) {
    const fileData = fs.readFileSync(filePath);
    return `data:image/png;base64,${fileData.toString('base64')}`;
}

export class Quiz {

    constructor(id, nbRounds = 5, duration = 30, players = []) {
        this._id = id;
        this._currentRound = 0;
        this._currentPersonality = null;
        this._isRoundActive = false;
        this.nbRounds = nbRounds;
        this._minPlayers = 2;
        this._maxPlayers = 10;
        this._usedPersonalities = new Set();
        this._allPersonalities = new Set();
        personnalites.forEach(personality => this.addPersonality(personality));
        this._scores = new Map();
        players.forEach(player => this.addPlayer(player));
        this._roundDuration = duration;
        this._timeLeft = duration;
    }

    addPersonality(personality) {
        // Conversion de l'image en base 64
        personality.image = getBase64Image(`./src/img/${personality.image}`);
        this._allPersonalities.add(personality);
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

    get minPlayers() {
        return this._minPlayers;
    }

    set minPlayers(value) {
        this._minPlayers = value;
    }

    get maxPlayers() {
        return this._maxPlayers;
    }

    set maxPlayers(value) {
        this._maxPlayers = value;
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

    addPlayer(player) {
        this._scores.set(player.username, {
            uuid: player.uuid,
            token: player.token,
            score: 0,
            connected: false
        });
    }

    removePlayer(playerUsername) {
        this._scores.delete(playerUsername);
    }

    startNewRound(personality) {
        this._currentPersonality = personality;
        this._isRoundActive = true;
        this._currentRound++;
        this._timeLeft = this._roundDuration;
    }

    endRound() {
        if (this._roundTimer) {
            this._roundTimer = null;
        }
        this._currentPersonality = null;
        this._isRoundActive = false;
    }

    isGameOver() {
        return this._currentRound >= this.nbRounds;
    }

    getRandomPersonality() {
        const availablePersonalities = Array.from(this._allPersonalities).filter(p => !this._usedPersonalities.has(p));
        if (availablePersonalities.length === 0) {
            this._usedPersonalities.clear();
            const personality = Array.from(this._allPersonalities)[Math.floor(Math.random() * this._allPersonalities.size)];
            this._usedPersonalities.add(personality);
            return personality;
        }
        const personality = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
        this._usedPersonalities.add(personality);
        return personality;
    }

    getLeaderboard() {
        return Array.from(this._scores.entries())
            .filter(([, data]) => data.connected)
            .sort(([, dataA], [, dataB]) => dataB.score - dataA.score) // Tri par ordre décroissant des scores
            .map(([username, data]) => ({
                username,
                score: data.score,
                uuid: data.uuid
            }));
    }

    async startTimer(io) {
        if (this.isRoundActive) {
            this._timeLeft = this._roundDuration;
        }
        const timer = setInterval(async () => {
            if (this._timeLeft > 0 && this.isRoundActive) {
                this._timeLeft--;
                io.to(this._id).emit('timer', {
                    totalTime: this._roundDuration,
                    timeLeft: this._timeLeft});
            } else {
                clearInterval(timer);
                if (this._isRoundActive) {
                    let personality = this._currentPersonality;
                    this.endRound();

                    io.to(this._id).emit('message', {
                        playerName: 'System',
                        msg: `Temps écoulé ! La réponse était : ${personality.answer[0]}`,
                    });

                    if (!this.isGameOver()) {
                        setTimeout(() => {
                            this.startNewRound(this.getRandomPersonality());
                            io.to(this._id).emit('new round', {
                                roundNumber: this._currentRound,
                                personality: this._currentPersonality
                            });
                            io.to(this._id).emit('timer', {
                                totalTime: this._roundDuration,
                                timeLeft: this._timeLeft
                            });
                            this.startTimer(io);
                        }, 3000);
                    } else {
                        await this.endGame(io);
                    }
                }
            }
        }, 1000);
    }

    async endGame(io) {
        await this.sendDelayedMessage(io, {
            playerName: 'System',
            msg: 'Fin de la partie !'
        }, 1000);

        io.to(this._id).emit('end game');

        await this.sendDelayedMessage(io, {
            playerName: 'System',
            msg: `Classement final : \n- ${this.getLeaderboard().map(player => `${player.username} : ${player.score} point(s)`).join('\n- ')}`
        }, 2500);

        let winner = null;

        // Vérification qu'au moins un joueur ait marqué un point
        if (this.getLeaderboard()[0].score === 0) {
            await this.sendDelayedMessage(io, {
                playerName: 'System',
                msg: 'Personne n\'a marqué de points...'
            }, 1000);
        }

        // Vérification si plusieurs joueurs ont le même nombre de points
        else {
            let bestScore = this.getLeaderboard()[0].score;
            winner = this.getLeaderboard().filter(player => player.score === bestScore);
        }

        try {
            const response = await fetch(`${config.URL_COMUS}/game/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameCode: this._id,
                    SCORE: Object.fromEntries([...this._scores].map(([_, playerData]) => [playerData.uuid, playerData.score])),
                    WINNER: winner
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de l\'envoi des résultats');
            }
            console.log(`Résultat de la partie ${this._id} envoyé au serveur de Comus Party avec succès`);
            return true;
        } catch (error) {
            console.error(`Erreur lors de l'envoi du résultat de la partie ${this._id} au serveur de Comus Party:`, error);
            return false;
        }
    }

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