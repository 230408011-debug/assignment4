class GameStateManager {
    constructor() {
        this.ensureGameState();
    }

    init() {
        console.log("GameStateManager initialized");
        this.ensureGameState();
    }

    ensureGameState() {
        if (!window.gameState) {
            window.gameState = {};
        }
        if (!window.gameState.career) {
            window.gameState.career = {
                started: false,
                currentClubId: null,
                currentClub: null,
                contract: null,
                currentSeason: 1,
                currentWeek: 0,
                fixtures: [],
                standings: [],
                cups: [],
                transfers: [],
                completedMatches: [],
                playerCareerStats: { matches: 0, goals: 0, assists: 0, averageRating: "-", rewards: 0, trophyCount: 0 },
                activeView: 'season',
                ez: 1000,
                rating: 100,
                adsWatchedToday: 0,
                lastAdDate: new Date().toDateString()
            };
        }
    }

    getCareerData() {
        this.ensureGameState();
        return window.gameState.career;
    }

    getEZ() {
        this.ensureGameState();
        return (window.gameState && window.gameState.career && typeof window.gameState.career.ez === 'number')
            ? window.gameState.career.ez
            : 1000;
    }

    setEZ(amount) {
        this.ensureGameState();
        const valid = Math.max(0, Math.round(Number(amount) || 0));
        window.gameState.career.ez = valid;
        if (window.gameState.ez !== undefined) window.gameState.ez = valid;
        return valid;
    }

    addEZ(delta) {
        return this.setEZ(this.getEZ() + (Number(delta) || 0));
    }

    setCareerData(data) {
        this.ensureGameState();
        window.gameState.career = { ...window.gameState.career, ...data };
    }

    resetCareerData() {
        this.ensureGameState();
        window.gameState.career = {
            started: false,
            currentClubId: null,
            currentClub: null,
            contract: null,
            currentSeason: 1,
            currentWeek: 0,
            fixtures: [],
            standings: [],
            cups: [],
            transfers: [],
            completedMatches: [],
            playerCareerStats: { matches: 0, goals: 0, assists: 0, averageRating: "-", rewards: 0, trophyCount: 0 },
            activeView: 'season',
            ez: 1000,
            rating: 100,
            adsWatchedToday: 0,
            lastAdDate: new Date().toDateString()
        };
    }

    /**
     * FORMULA: Pozisyona Göre Ağırlıklı Oyuncu OVR (Genel Güç) Hesabı
     * -------------------------------------------------------------
     * Her pozisyon, sahadaki rolüne göre niteliklere farklı ağırlık verir:
     * - Forvet (ST/CF/RW/LW):
     *     Şut: %30, Hız: %25, Dribbling: %20, Pas: %10, Dayanıklılık: %10, Fizik: %5
     * - Orta Saha (MID/CM/CAM/CDM):
     *     Pas: %30, Dribbling: %20, Dayanıklılık: %15, Şut: %15, Hız: %10, Fizik: %10
     * - Defans (DEF/CB/LB/RB):
     *     Fizik: %30, Dayanıklılık: %20, Hız: %20, Pas: %15, Dribbling: %10, Şut: %5
     * - Kaleci (GK):
     *     Fizik: %30, Hız: %20, Pas: %20, Dayanıklılık: %15, Dribbling: %10, Şut: %5
     *
     * Takım Gücü Hesabı:
     *   Kadro OVR = Math.round((GK * 0.25) + (DEF/MID * 0.35) + (ST * 0.40))
     */
    calculateOverall(playerOrAttrs = null, position = null) {
        let attr = null;
        let pos = position;

        if (playerOrAttrs && playerOrAttrs.attributes) {
            attr = playerOrAttrs.attributes;
            pos = pos || playerOrAttrs.position;
        } else if (playerOrAttrs && (playerOrAttrs.speed !== undefined || playerOrAttrs.pace !== undefined)) {
            attr = playerOrAttrs;
            pos = pos || playerOrAttrs.position;
        } else if (window.gameState && window.gameState.player) {
            attr = window.gameState.player.attributes;
            pos = pos || window.gameState.player.position;
        }

        if (!attr) return 50;

        const spd = attr.speed !== undefined ? attr.speed : (attr.pace || 50);
        const sht = attr.shooting !== undefined ? attr.shooting : (attr.shot || 50);
        const pas = attr.passing !== undefined ? attr.passing : (attr.pass || 50);
        const drb = attr.dribbling !== undefined ? attr.dribbling : (attr.dribble || 50);
        const phy = attr.physical !== undefined ? attr.physical : (attr.defense || 50);
        const sta = attr.stamina !== undefined ? attr.stamina : 50;

        const p = String(pos || 'ST').toUpperCase();
        let ovr = 50;

        if (p === 'GK') {
            ovr = (phy * 0.30) + (spd * 0.20) + (pas * 0.20) + (sta * 0.15) + (drb * 0.10) + (sht * 0.05);
        } else if (p.includes('DEF') || p === 'CB' || p === 'LB' || p === 'RB') {
            ovr = (phy * 0.30) + (sta * 0.20) + (spd * 0.20) + (pas * 0.15) + (drb * 0.10) + (sht * 0.05);
        } else if (p.includes('MID') || p === 'CM' || p === 'CAM' || p === 'CDM') {
            ovr = (pas * 0.30) + (drb * 0.20) + (sta * 0.15) + (sht * 0.15) + (spd * 0.10) + (phy * 0.10);
        } else {
            // Default: Forvet (ST, CF, RW, LW)
            ovr = (sht * 0.30) + (spd * 0.25) + (drb * 0.20) + (pas * 0.10) + (sta * 0.10) + (phy * 0.05);
        }

        ovr = Math.round(Math.max(45, Math.min(99, ovr)));

        // Sync with window.gameState.player if checking user player
        if ((!playerOrAttrs || playerOrAttrs === window.gameState?.player) && window.gameState?.player) {
            window.gameState.player.overall = ovr;
        }

        return ovr;
    }

    /**
     * Kadro Genel Gücü (Team OVR) Hesabı:
     * Sahadaki 3 oyuncunun ağırlıklı ortalaması: Kaleci %25, Defans/Orta Saha %35, Forvet %40
     */
    calculateTeamPower(squadOrClub) {
        if (!squadOrClub) return 65;
        let starting = [];
        if (squadOrClub.starting) {
            starting = squadOrClub.starting;
        } else if (squadOrClub.squad) {
            const sq = squadOrClub.squad;
            if (Array.isArray(sq)) starting = sq.slice(0, 3);
            else starting = [sq.gk, sq.mid || sq.def, sq.st].filter(Boolean);
        } else if (squadOrClub.roster) {
            starting = squadOrClub.roster.slice(0, 3);
        }

        if (starting.length === 0) return squadOrClub.overall || 65;

        const gk = starting.find(p => p && p.position === 'GK') || starting[0];
        const mid = starting.find(p => p && (p.position === 'MID' || p.position === 'DEF' || p.position === 'CB')) || starting[1] || starting[0];
        const st = starting.find(p => p && (p.position === 'ST' || p.position === 'CF' || p.position === 'FW')) || starting[2] || starting[0];

        const gkOvr = (gk && (gk.overall || gk.rating)) || 65;
        const midOvr = (mid && (mid.overall || mid.rating)) || 65;
        const stOvr = (st && (st.overall || st.rating)) || 65;

        const teamPower = Math.round((gkOvr * 0.25) + (midOvr * 0.35) + (stOvr * 0.40));
        return Math.max(50, Math.min(99, teamPower));
    }
}

window.GameStateManager = new GameStateManager();
