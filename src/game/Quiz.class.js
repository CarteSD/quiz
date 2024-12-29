export class Quiz {

    #_currentRound;
    #_scores;
    #_currentPersonality;
    #_isRoundActive;
    #_nbRounds;

    constructor(nbRounds, players) {
        this._currentRound = 0;
        this._scores = new Map(players);
        this._currentPersonality = null;
        this._isRoundActive = false;
        this._nbRounds = nbRounds;
    }

    get nbRounds() {
        return this._nbRounds;
    }

    set nbRounds(value) {
        this._nbRounds = value;
    }

    get players() {
        return this._players;
    }

    set players(value) {
        this._players = value;
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

    startNewRound(personality) {
        this.currentPersonality = personality;
        this.isRoundActive = true;
        this.currentRound++;
    }

    endRound() {
        this.currentPersonality = null;
        this.isRoundActive = false;
    }

    isGameOver() {
        return this.currentRound > this.nbRounds;
    }
}