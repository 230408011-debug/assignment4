class MatchManager {
    constructor() {
        this.gs = window.GameStateManager;
        this.db = window.TeamDatabase;
    }

    setupMatch(fixtureId) {
        if (!this.gs) this.gs = window.GameStateManager;
        if (!this.db) this.db = window.TeamDatabase;

        const data = this.gs.getCareerData();
        data.currentFixtureId = fixtureId;

        const item = data.fixtures[data.currentWeek - 1];
        if (item && item.fixture) {
            data.currentOpponentId = (item.home === data.currentClubId) ? item.away : item.home;
            data.currentCompetition = item.competition;
            data.currentRound = item.round;
        } else if (item) {
            // Support direct item mapping from the new fixture structure
            data.currentOpponentId = (item.home === data.currentClubId) ? item.away : item.home;
            data.currentCompetition = item.competition;
            data.currentRound = item.round;
        }

        this.gs.setCareerData(data);
    }

    getCurrentMatchInfo() {
        if (!this.gs) this.gs = window.GameStateManager;
        if (!this.db) this.db = window.TeamDatabase;

        const data = this.gs.getCareerData();
        const playerClubId = data.currentClubId;
        const opponentClubId = data.currentOpponentId;

        const playerClub = this.db.getClub(playerClubId);
        const opponentClub = this.db.getClub(opponentClubId);

        let isHome = true;
        const item = data.fixtures ? data.fixtures[data.currentWeek - 1] : null;
        if (item && item.home) {
            isHome = (item.home === playerClubId);
        }

        return {
            playerClub: playerClub,
            opponentClub: opponentClub,
            isHome: isHome,
            competition: data.currentCompetition || (item ? item.competition : 'League'),
            round: data.currentRound || (item ? item.round : 1)
        };
    }
}

window.MatchManager = new MatchManager();
