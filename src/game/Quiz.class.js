import { personnalites } from './personalities.js';

export class Quiz {

    constructor(id, nbRounds = 5, players = []) {
        this._id = id;
        this._currentRound = 0;
        this._currentPersonality = null;
        this._isRoundActive = false;
        this.nbRounds = nbRounds;
        this._minPlayers = 2;
        this._maxPlayers = 10;
        this._usedPersonalities = new Set();
        this._allPersonalities = new Set();
        personnalites.forEach(personality => this._allPersonalities.add(personality));
        this._scores = new Map();
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

    addPlayer(player) {
        this._scores.set(player.username, {
            uuid: player.uuid,
            score: 0,
        });
    }

    removePlayer(playerUsername) {
        this._scores.delete(playerUsername);
    }

    startNewRound(personality) {
        this._currentPersonality = personality;
        this._isRoundActive = true;
        this._currentRound++;
    }

    endRound() {
        this._currentPersonality = null;
        this._isRoundActive = false;
    }

    isGameOver() {
        return this._currentRound > this.nbRounds;
    }

    getRandomPersonality() {
        const availablePersonalities = Array.from(this._allPersonalities).filter(p => !this._usedPersonalities.has(p));
        if (availablePersonalities.length === 0) {
            this._usedPersonalities.clear();
            const personality = this._allPersonalities[Math.floor(Math.random() * this._allPersonalities.length)];
            this._usedPersonalities.add(personality);
            return personality;
        }
        const personality = availablePersonalities[Math.floor(Math.random() * availablePersonalities.length)];
        this._usedPersonalities.add(personality);
        return personality;
    }

    getLeaderboard() {
        return Array.from(this._scores.entries())
            .sort(([, dataA], [, dataB]) => dataB.score - dataA.score) // Tri par ordre décroissant des scores
            .map(([username, data]) => ({
                username,
                score: data.score,
                uuid: data.uuid
            }));
    }
}