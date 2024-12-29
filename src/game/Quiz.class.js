export class Quiz {

    constructor(nbRounds, players) {
        this._currentRound = 0;
        this._scores = new Map(players);
        this._currentPersonality = null;
        this._isRoundActive = false;
        this.nbRounds = nbRounds;
        this._minPlayers = 2;
        this._maxPlayers = 5;
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
}