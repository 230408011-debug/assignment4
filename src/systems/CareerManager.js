class CareerManager {
    constructor() {
        // Dependencies
        this.gs = window.GameStateManager;
        this.db = window.TeamDatabase;
    }

    acceptContract(offer) {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        if (!this.gs) this.gs = window.GameStateManager;

        // 1. Validate selected offer and club.
        if (!offer || !offer.clubId) {
            console.error('[CareerManager] Invalid contract offer');
            return false;
        }

        // Initialize missing player attributes
        if (!window.gameState.player) window.gameState.player = {};
        if (!window.gameState.player.attributes) {
            window.gameState.player.attributes = { speed: 50, shooting: 50, passing: 50, physical: 50, dribbling: 50, stamina: 50 };
        } else {
            // Ensure all properties exist
            ['speed', 'shooting', 'passing', 'physical', 'dribbling', 'stamina'].forEach(attr => {
                if (window.gameState.player.attributes[attr] === undefined) {
                    window.gameState.player.attributes[attr] = 50;
                }
            });
        }

        this.initSeason(offer.clubId, offer);
        return true;
    }

        getOrInitSquad(clubId) {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        if (!this.gs) this.gs = window.GameStateManager;
        const data = this.gs ? this.gs.getCareerData() : (window.gameState ? window.gameState.career : null);
        if (!data) return null;

        if (!data.activeSquads) data.activeSquads = {};
        
        const targetClubId = clubId || data.currentClubId || 'ENG_MANCHESTER_BLUE';
        const club = this.db ? this.db.getClub(targetClubId) : null;
        if (!club) return null;

        // Return existing squad if stored
        if (data.activeSquads[targetClubId] && Array.isArray(data.activeSquads[targetClubId].starting) && Array.isArray(data.activeSquads[targetClubId].bench)) {
            const sq = data.activeSquads[targetClubId];
            
            // Sync user player attributes if this is current club
            if (targetClubId === data.currentClubId && window.gameState && window.gameState.player) {
                const uPlayer = window.gameState.player;
                const userPlayerObj = {
                    id: 'user_player',
                    isUserPlayer: true,
                    displayName: uPlayer.name || uPlayer.username || 'Sen (Kaptan)',
                    clubId: targetClubId,
                    position: (uPlayer.position || 'ST').toUpperCase(),
                    overall: uPlayer.overall || 75,
                    rating: uPlayer.overall || 75,
                    speed: (uPlayer.attributes && uPlayer.attributes.speed) || 75,
                    shot: (uPlayer.attributes && uPlayer.attributes.shooting) || 75,
                    pass: (uPlayer.attributes && uPlayer.attributes.passing) || 75,
                    dribble: (uPlayer.attributes && uPlayer.attributes.dribbling) || 75,
                    physical: (uPlayer.attributes && uPlayer.attributes.physical) || 75,
                    stamina: (uPlayer.attributes && uPlayer.attributes.stamina) || 75,
                    nationality: 'Türkiye'
                };

                let found = false;
                sq.starting.forEach((p, idx) => {
                    if (p.isUserPlayer || p.id === 'user_player') {
                        sq.starting[idx] = { ...p, ...userPlayerObj };
                        found = true;
                    }
                });
                if (!found) {
                    sq.bench.forEach((p, idx) => {
                        if (p.isUserPlayer || p.id === 'user_player') {
                            sq.bench[idx] = { ...p, ...userPlayerObj };
                            found = true;
                        }
                    });
                }
                if (!found) {
                    const slot = userPlayerObj.position === 'GK' ? 0 : (userPlayerObj.position === 'MID' ? 1 : 2);
                    const oldP = sq.starting[slot];
                    sq.starting[slot] = userPlayerObj;
                    if (oldP && !oldP.isUserPlayer) {
                        sq.bench.push(oldP);
                        if (sq.bench.length > 3) sq.bench.pop();
                    }
                }
            }

            if (club.squad && sq.starting.length >= 3) {
                if (sq.starting[0]) club.squad.gk = sq.starting[0];
                if (sq.starting[1]) club.squad.mid = sq.starting[1];
                if (sq.starting[2]) club.squad.st = sq.starting[2];
            }
            return sq;
        }

        // Initialize 6-player squad from club.roster or database
        let pool = [];
        if (Array.isArray(club.roster) && club.roster.length > 0) {
            pool = club.roster.map(p => {
                const pos = (p.position || 'ST').toUpperCase();
                const baseRating = p.overall || p.rating || 60;
                return {
                    id: p.id || `p_${club.id}_${Math.random()}`,
                    displayName: p.displayName || p.name || (p.firstName ? `${p.firstName} ${p.lastName}` : 'Oyuncu'),
                    clubId: club.id,
                    position: pos,
                    overall: baseRating,
                    rating: baseRating,
                    speed: p.speed || p.pace || baseRating,
                    shot: p.shot || p.shooting || baseRating,
                    pass: p.pass || p.passing || baseRating,
                    dribble: p.dribble || p.dribbling || baseRating,
                    physical: p.physical || p.defense || baseRating,
                    stamina: p.stamina || 70,
                    nationality: p.nationality || club.country || 'Global'
                };
            });
        } else if (club.squad) {
            if (club.squad.gk) pool.push(club.squad.gk);
            if (club.squad.mid) pool.push(club.squad.mid);
            if (club.squad.st) pool.push(club.squad.st);
        }

        // If user club, inject user player object
        if (targetClubId === data.currentClubId && window.gameState && window.gameState.player) {
            const uPlayer = window.gameState.player;
            const userPlayerObj = {
                id: 'user_player',
                isUserPlayer: true,
                displayName: uPlayer.name || uPlayer.username || 'Sen (Kaptan)',
                clubId: targetClubId,
                position: (uPlayer.position || 'ST').toUpperCase(),
                overall: uPlayer.overall || 75,
                rating: uPlayer.overall || 75,
                speed: (uPlayer.attributes && uPlayer.attributes.speed) || 75,
                shot: (uPlayer.attributes && uPlayer.attributes.shooting) || 75,
                pass: (uPlayer.attributes && uPlayer.attributes.passing) || 75,
                dribble: (uPlayer.attributes && uPlayer.attributes.dribbling) || 75,
                physical: (uPlayer.attributes && uPlayer.attributes.physical) || 75,
                stamina: (uPlayer.attributes && uPlayer.attributes.stamina) || 75,
                nationality: 'Türkiye'
            };
            pool.unshift(userPlayerObj);
        }

        let gks = pool.filter(p => p.position === 'GK').sort((a, b) => (b.overall || b.rating || 0) - (a.overall || a.rating || 0));
        let startingGk = gks[0] || pool[0] || { id: 'gk_1', displayName: 'Kaleci', position: 'GK', overall: 70 };

        let remainingPool = pool.filter(p => p.id !== startingGk.id).sort((a, b) => (b.overall || b.rating || 0) - (a.overall || a.rating || 0));

        let startingDef = remainingPool.find(p => p.isUserPlayer && ['DEF', 'CB', 'LB', 'RB', 'MID'].includes(p.position)) ||
                          remainingPool.find(p => ['DEF', 'CB', 'LB', 'RB'].includes(p.position)) ||
                          remainingPool.find(p => ['MID', 'CM', 'CDM'].includes(p.position)) || remainingPool[0];
        if (!startingDef) startingDef = { id: 'def_1', displayName: 'Defans', position: 'DEF', overall: 72 };

        remainingPool = remainingPool.filter(p => p.id !== startingDef.id);

        let startingSt = remainingPool.find(p => p.isUserPlayer && ['ST', 'ATT', 'LW', 'RW'].includes(p.position)) ||
                         remainingPool.find(p => ['ST', 'ATT', 'LW', 'RW'].includes(p.position)) || remainingPool[0];
        if (!startingSt) startingSt = { id: 'st_1', displayName: 'Forvet', position: 'ST', overall: 75 };

        remainingPool = remainingPool.filter(p => p.id !== startingSt.id);

        let benchSt = remainingPool.find(p => ['ST', 'ATT', 'LW', 'RW'].includes(p.position)) || remainingPool[0];
        if (benchSt) remainingPool = remainingPool.filter(p => p.id !== benchSt.id);

        let benchMid = remainingPool.find(p => ['MID', 'CM', 'CAM', 'CDM', 'RM', 'LM'].includes(p.position)) || remainingPool[0];
        if (benchMid) remainingPool = remainingPool.filter(p => p.id !== benchMid.id);

        let benchDef = remainingPool.find(p => ['DEF', 'CB', 'LB', 'RB'].includes(p.position)) || remainingPool[0];
        if (benchDef) remainingPool = remainingPool.filter(p => p.id !== benchDef.id);

        const baseClubOvr = club.overall || 68;
        const namePools = {
            'switzerland': ['Fabian Frei', 'Noah Okafor', 'Silvan Hefti', 'Leo Lacroix', 'Miro Muheim', 'Dereck Kutesa'],
            'italy': ['Matteo Rossi', 'Lorenzo Colombo', 'Gianluca Gaetano', 'Samuele Ricci', 'Federico Bonazzoli'],
            'england': ['Callum Wilson', 'Harvey Elliott', 'Jacob Ramsey', 'Curtis Jones', 'Lewis Hall'],
            'turkey': ['Emre Mor', 'Berkay Özcan', 'Salih Uçan', 'Umut Nayir', 'Doğan Alemdar', 'Onur Bulut'],
            'germany': ['Maximilian Eggestein', 'Janik Haberer', 'Robin Hack', 'Linton Maina', 'Paul Nebel'],
            'spain': ['Sergio Camello', 'Fran Beltrán', 'Ander Guevara', 'Manu Sánchez', 'Jon Moncayola'],
            'france': ['Ludovic Blas', 'Adrien Thomasson', 'Romain Faivre', 'Florent Mollet', 'Kader Bamba']
        };
        const country = (club.country || club.league || 'switzerland').toLowerCase();
        const names = namePools[country] || namePools['switzerland'];

        const bench = [benchSt, benchMid, benchDef].filter(Boolean);

        while (bench.length < 3) {
            const defaultPos = bench.length === 0 ? 'ST' : (bench.length === 1 ? 'MID' : 'DEF');
            const nameIdx = (bench.length + 1) % names.length;
            const resName = names[nameIdx] || `Oyuncu ${bench.length + 1}`;
            const resOvr = Math.max(58, Math.min(84, baseClubOvr - (bench.length === 0 ? 1 : 3)));
            const pSpeed = defaultPos === 'ST' ? resOvr + 2 : (defaultPos === 'MID' ? resOvr : resOvr - 2);
            const pShot = defaultPos === 'ST' ? resOvr + 4 : (defaultPos === 'MID' ? resOvr - 2 : resOvr - 12);
            const pPass = defaultPos === 'MID' ? resOvr + 4 : (defaultPos === 'ST' ? resOvr - 3 : resOvr - 1);
            const pDribble = defaultPos === 'ST' ? resOvr + 1 : (defaultPos === 'MID' ? resOvr + 3 : resOvr - 4);
            const pPhys = defaultPos === 'DEF' ? resOvr + 4 : (defaultPos === 'MID' ? resOvr : resOvr - 2);
            const pStam = Math.min(88, resOvr + 1);

            bench.push({
                id: `b_${club.id}_${bench.length + 1}`,
                displayName: resName,
                position: defaultPos,
                overall: resOvr,
                rating: resOvr,
                speed: pSpeed,
                shot: pShot,
                pass: pPass,
                dribble: pDribble,
                physical: pPhys,
                stamina: pStam,
                nationality: club.country || 'Global'
            });
        }

        const activeSquad = {
            starting: [startingGk, startingDef, startingSt],
            bench: bench
        };

        data.activeSquads[targetClubId] = activeSquad;

        if (club.squad) {
            club.squad.gk = activeSquad.starting[0];
            club.squad.mid = activeSquad.starting[1];
            club.squad.st = activeSquad.starting[2];
        }

        this.gs.setCareerData(data);
        return activeSquad;
    }

    swapSquadPlayers(clubId, benchIndex, startingIndex) {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        if (!this.gs) this.gs = window.GameStateManager;
        const data = this.gs.getCareerData();
        if (!data) return false;

        const sq = this.getOrInitSquad(clubId);
        if (!sq || !sq.starting || !sq.bench) return false;

        const benchPlayer = sq.bench[benchIndex];
        const startingPlayer = sq.starting[startingIndex];

        if (!benchPlayer || !startingPlayer) return false;

        // Position Rule Check:
        // GK slot (index 0) MUST be a GK
        if (startingIndex === 0 && benchPlayer.position !== 'GK') {
            console.warn('[CareerManager] Cannot put a field player into GK slot');
            return false;
        }

        // Field slots (index 1 & 2) MUST NOT be a GK
        if (startingIndex !== 0 && benchPlayer.position === 'GK') {
            console.warn('[CareerManager] Cannot put a GK into a field slot');
            return false;
        }

        // Swap players
        sq.starting[startingIndex] = benchPlayer;
        sq.bench[benchIndex] = startingPlayer;

        // Sync club 3v3 squad
        const club = this.db.getClub(clubId);
        if (club && club.squad) {
            club.squad.gk = sq.starting[0];
            club.squad.mid = sq.starting[1];
            club.squad.st = sq.starting[2];
        }

        data.activeSquads[clubId] = sq;
        this.gs.setCareerData(data);
        if (window.SaveManager) window.SaveManager.save();

        console.log(`[CareerManager] Swapped player ${benchPlayer.displayName} into starting slot ${startingIndex}`);
        return true;
    }

    generateLeagueFixtures(leagueId) {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        const allClubs = this.db.getClubsByLeague(leagueId);
        if (!allClubs || allClubs.length < 2) return [];

        const list = allClubs.map(c => c.id);
        const roundsCount = list.length - 1;
        const matchesPerRound = list.length / 2;
        const tempFixtures = [];
        
        let temp = [...list];
        for (let round = 0; round < roundsCount; round++) {
            for (let i = 0; i < matchesPerRound; i++) {
                let home = temp[i];
                let away = temp[temp.length - 1 - i];
                
                if (round % 2 === 1) {
                    const swap = home;
                    home = away;
                    away = swap;
                }
                
                tempFixtures.push({ round: round + 1, home, away });
            }
            temp.splice(1, 0, temp.pop());
        }
        
        const firstHalfCount = tempFixtures.length;
        for (let idx = 0; idx < firstHalfCount; idx++) {
            const fx = tempFixtures[idx];
            tempFixtures.push({
                round: fx.round + roundsCount,
                home: fx.away,
                away: fx.home
            });
        }
        
        return tempFixtures.map(fx => {
            const id = `${leagueId}_w${fx.round}_${fx.home}_${fx.away}`;
            return {
                id: id,
                week: fx.round,
                round: fx.round,
                home: fx.home,
                away: fx.away,
                homeScore: 0,
                awayScore: 0,
                completed: false,
                competition: "league"
            };
        });
    }

    acceptContractMidSeason(offer) {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        if (!this.gs) this.gs = window.GameStateManager;
        
        let data = this.gs.getCareerData();
        if (!data || !data.started) return false;

        const newClub = this.db.getClub(offer.clubId);
        if (!newClub) {
            console.error('[CareerManager] Target transfer club not found:', offer.clubId);
            return false;
        }

        const oldClubId = data.currentClubId;
        const oldClubName = data.currentClub ? data.currentClub.name : 'Unknown';

        // 1. Log transfer history
        if (!data.transferHistory) data.transferHistory = [];
        data.transferHistory.push({
            season: data.currentSeason || 1,
            week: data.currentWeek || 1,
            fromClubId: oldClubId,
            fromClubName: oldClubName,
            toClubId: newClub.id,
            toClubName: newClub.name,
            reason: 'Transfer Offer Accepted'
        });

        // 2. Update active club & contract
        data.currentClubId = newClub.id;
        data.currentClub = newClub;
        
        const leagueId = newClub.league || newClub.leagueId;
        data.currentLeagueId = leagueId;
        const lg = this.db.getLeague(leagueId);
        data.leagueName = lg ? lg.name : 'League';

        // Check if leagueFixtures has fixtures for the new club, generate if missing
        if (!data.leagueFixtures || !data.leagueFixtures.some(f => f.home === newClub.id || f.away === newClub.id)) {
            const newLeagueFixtures = this.generateLeagueFixtures(leagueId);
            if (newLeagueFixtures.length > 0) {
                const currentWk = data.currentWeek || 1;
                newLeagueFixtures.forEach(fx => {
                    if (fx.week < currentWk) {
                        fx.homeScore = Math.floor(Math.random() * 3);
                        fx.awayScore = Math.floor(Math.random() * 3);
                        fx.completed = true;
                    }
                });
                data.leagueFixtures = newLeagueFixtures;
            }
        }

        // Ensure standings exist for the new league clubs
        const allLeagueClubs = this.db.getClubsByLeague(leagueId);
        const hasAllClubs = data.standings && typeof data.standings === 'object' && allLeagueClubs.length > 0 && allLeagueClubs.every(c => data.standings[c.id]);
        if (!hasAllClubs) {
            const newStandings = {};
            allLeagueClubs.forEach(c => {
                newStandings[c.id] = {
                    clubId: c.id,
                    clubName: c.name,
                    name: c.name,
                    played: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    points: 0,
                    form: [],
                    primaryColor: c.primaryColor,
                    secondaryColor: c.secondaryColor
                };
            });
            data.standings = newStandings;
        }

        // Replay any completed matches into standings synchronously so form and stats match
        if (data.leagueFixtures && data.standings) {
            data.leagueFixtures.filter(fx => fx && fx.completed).forEach(fx => {
                this.updateTable(data.standings, fx.home, fx.away, fx.homeScore || 0, fx.awayScore || 0);
            });
        }

        data.contract = {
            id: offer.id || `contract_${Date.now()}`,
            clubId: offer.clubId,
            clubName: offer.clubName || newClub.name,
            leagueId: offer.leagueId || leagueId,
            leagueName: offer.leagueName || data.leagueName,
            signingBonus: offer.signingBonus || 0,
            matchBonus: offer.matchBonus || 30,
            goalBonus: offer.goalBonus || 15,
            assistBonus: offer.assistBonus || 10,
            objective: offer.objective || 'Ligde Kal',
            role: offer.role || 'Starter',
            seasons: offer.seasons || 1,
            contractLength: offer.contractLength || '1 Sezon'
        };

        // Grant signing bonus immediately
        data.ez = (data.ez || 0) + (offer.signingBonus || 0);

        // 3. Ensure season state remains active and NOT completed
        data.seasonCompleted = false;

        // 4. Rebuild full match schedule for the new club
        data.fixtures = this.buildMatchSchedule(data);

        // 5. Ensure the first uncompleted fixture is playable and unlocked
        let foundPlayable = false;
        if (data.fixtures) {
            data.fixtures.forEach(fx => {
                if (!fx.completed && !foundPlayable) {
                    fx.playable = true;
                    fx.locked = false;
                    foundPlayable = true;
                } else if (!fx.completed) {
                    fx.playable = false;
                    fx.locked = true;
                }
            });
        }

        // 6. Remove accepted offer from transferOffers
        if (data.transferOffers) {
            data.transferOffers = data.transferOffers.filter(o => String(o.id) !== String(offer.id));
        }
        data.midSeasonOffer = null;

        // 7. Save state to persistent storage
        this.gs.setCareerData(data);
        if (window.SaveManager) window.SaveManager.save();
        
        console.log(`[CareerManager] Mid-season transfer successful: ${oldClubName} -> ${newClub.name} (Week ${data.currentWeek}, Season ${data.currentSeason})`);
        return true;
    }

initSeason(clubId, contractOffer) {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        if (!this.gs) this.gs = window.GameStateManager;

        // 1. Validate selected offer and club.
        const playerClub = this.db.getClub(clubId);
        if (!playerClub) {
            console.error('[CareerManager] Club not found:', clubId);
            return false;
        }
        if (!contractOffer) {
            console.error('[CareerManager] Contract offer is missing!');
            return false;
        }

        const leagueId = playerClub.league || playerClub.leagueId;
        const league = this.db.getLeague(leagueId);
        if (!league) {
            console.error('[CareerManager] League not found for leagueId:', leagueId);
            return false;
        }

        // 2-6. Initialize career state structure.
        const prev = (window.gameState && window.gameState.career && window.gameState.career.started) ? window.gameState.career : {};
        const isFreshCareer = !prev || !prev.started || (contractOffer && contractOffer.isNewCareer);
        
        const career = {
            started: true,
            completed: false,
            seasonCompleted: false,
            currentClubId: clubId,
            currentClub: playerClub,
            contract: {
                id: contractOffer.id,
                clubId: contractOffer.clubId,
                clubName: contractOffer.clubName,
                leagueId: contractOffer.leagueId,
                leagueName: contractOffer.leagueName,
                signingBonus: contractOffer.signingBonus || 200,
                matchBonus: contractOffer.matchBonus || 30,
                goalBonus: contractOffer.goalBonus || 15,
                assistBonus: contractOffer.assistBonus || 10,
                objective: contractOffer.objective || 'Ligde Kal',
                role: contractOffer.role || 'Starter',
                seasons: contractOffer.seasons || 1,
                contractLength: contractOffer.contractLength || '1 Sezon'
            },
            currentLeagueId: leagueId,
            leagueName: league.name,
            currentSeason: isFreshCareer ? 1 : (prev.currentSeason || 1),
            currentWeek: 1,
            activeView: "season",
            leagueFixtures: [],
            fixtures: [],
            standings: {},
            cups: [],
            transfers: [],
            completedMatches: isFreshCareer ? [] : (prev.completedMatches || []),
            seasonRewards: [],
            wonTrophies: isFreshCareer ? [] : (prev.wonTrophies || []),
            
            ez: (window.gameState.career && window.gameState.career.ez) || 1000,
            rating: (window.gameState.career && window.gameState.career.rating) || 100,
            adsWatchedToday: (window.gameState.career && window.gameState.career.adsWatchedToday) || 0,
            lastAdDate: (window.gameState.career && window.gameState.career.lastAdDate) || new Date().toDateString(),
            
            playerCareerStats: isFreshCareer ? { matches: 0, goals: 0, assists: 0, averageRating: "-", rewards: 0, trophyCount: 0 } : (prev.playerCareerStats || { matches: 0, goals: 0, assists: 0, averageRating: "-", rewards: 0, trophyCount: 0 }),
            
            careerStats: isFreshCareer ? {
                goals: 0, assists: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
                avgRating: 0, totalRating: 0, cleanSheets: 0, motmCount: 0, shots: 0, passes: 0, tackles: 0, dribbles: 0
            } : (prev.careerStats || {
                goals: 0, assists: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
                avgRating: 0, totalRating: 0, cleanSheets: 0, motmCount: 0, shots: 0, passes: 0, tackles: 0, dribbles: 0
            }),

            seasonStats: {
                goals: 0, assists: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0,
                avgRating: 0, totalRating: 0, cleanSheets: 0, motmCount: 0, shots: 0, passes: 0, tackles: 0, dribbles: 0
            }
        };

        // Grant signing bonus
        career.ez += contractOffer.signingBonus || 0;

        // 8. Generate the full league fixture schedule (double round robin).
        const allClubs = this.db.getClubsByLeague(leagueId);
        if (allClubs.length < 2) {
            console.error('[CareerManager] League has fewer than two valid clubs!');
            return false;
        }

        const list = allClubs.map(c => c.id);
        const roundsCount = list.length - 1;
        const matchesPerRound = list.length / 2;
        const tempFixtures = [];
        
        let temp = [...list];
        for (let round = 0; round < roundsCount; round++) {
            for (let i = 0; i < matchesPerRound; i++) {
                let home = temp[i];
                let away = temp[temp.length - 1 - i];
                
                if (round % 2 === 1) {
                    const swap = home;
                    home = away;
                    away = swap;
                }
                
                tempFixtures.push({
                    round: round + 1,
                    home,
                    away
                });
            }
            temp.splice(1, 0, temp.pop());
        }
        
        // Add return fixtures (away rounds)
        const firstHalfCount = tempFixtures.length;
        for (let idx = 0; idx < firstHalfCount; idx++) {
            const fx = tempFixtures[idx];
            tempFixtures.push({
                round: fx.round + roundsCount,
                home: fx.away,
                away: fx.home
            });
        }
        
        // Store all 132 fixtures in leagueFixtures
        career.leagueFixtures = tempFixtures.map(fx => {
            const id = `${leagueId}_w${fx.round}_${fx.home}_${fx.away}`;
            return {
                id: id,
                week: fx.round,
                round: fx.round,
                home: fx.home,
                away: fx.away,
                homeScore: 0,
                awayScore: 0,
                completed: false,
                competition: "league"
            };
        });

        // 9. Generate the initial standings.
        const newStandings = {};
        allClubs.forEach(c => {
            const row = {
                clubId: c.id,
                clubName: c.name,
                name: c.name,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0,
                form: [],
                primaryColor: c.primaryColor,
                secondaryColor: c.secondaryColor
            };
            newStandings[c.id] = row;
        });
        career.standings = newStandings;

        // 10. Generate cup data.
        let globalStandings = null;
        if (prev.standings && Object.keys(prev.standings).length > 0) {
            globalStandings = this.generateGlobalStandingsForInit(leagueId, prev.standings);
        }
        
        career.globalStandings = globalStandings;
        career.cups = {
            [leagueId]: this.generateDomesticCup(allClubs, leagueId),
            'champions_cup': this.generateContinentalCup('champions_cup', globalStandings, clubId),
            'europa_cup': this.generateContinentalCup('europa_cup', globalStandings, clubId),
            'conference_cup': this.generateContinentalCup('conference_cup', globalStandings, clubId)
        };

        // Build the player's match schedule including cups
        career.fixtures = this.buildMatchSchedule(career);

        window.gameState.career = career;
        if (window.SaveManager) {
            window.SaveManager.save();
        }

        // Telemetry Events
        if (window.AnalyticsService) {
            window.AnalyticsService.trackOnce('first_contract_accepted', {
                club_id: clubId,
                club_overall: playerClub.overall || 60
            }, 'first_contract_accepted');

            window.AnalyticsService.trackOnce('first_offer_accepted', {
                club_id: clubId,
                club_name: playerClub.name
            }, 'first_offer_accepted');

            window.AnalyticsService.setFtueCompleteTimestamp();

            window.AnalyticsService.trackOnce('ftue_complete', {
                club_id: clubId,
                elapsed_sec: Math.max(1, Math.round((Date.now() - window.AnalyticsService.getAppOpenTimestamp()) / 1000))
            }, 'ftue_complete');
        }

        console.log('[CareerManager] initSeason: Completed order successfully');
        return true;
    }




    startNewSeason() {
        if (!this.gs) this.gs = window.GameStateManager;
        let data = this.gs.getCareerData();
        if (data && data.started) {
            const nextSeasonNum = (data.currentSeason || 1) + 1;
            
            // Reconstruct the contract payload to prevent initSeason from crashing
            const currentContract = data.contract || {};
            const contractPayload = {
                id: currentContract.id || `contract_${Date.now()}`,
                clubId: data.currentClubId,
                clubName: currentContract.clubName || data.currentClub?.name || 'Club',
                leagueId: currentContract.leagueId || data.currentLeagueId,
                leagueName: currentContract.leagueName || data.leagueName || 'League',
                signingBonus: 0, // No new signing bonus for a rollover season
                matchBonus: currentContract.matchBonus || 30,
                goalBonus: currentContract.goalBonus || 15,
                assistBonus: currentContract.assistBonus || 10,
                objective: currentContract.objective || 'Şampiyon Ol',
                role: currentContract.role || 'Starter',
                seasons: currentContract.seasons || 1,
                contractLength: currentContract.contractLength || '1 Sezon'
            };
            
            // Retain the current club, re-initialize the season logic
            this.initSeason(data.currentClubId, contractPayload);
            
            // Overwrite the season counter which initSeason resets to 1
            const newData = this.gs.getCareerData();
            newData.currentSeason = nextSeasonNum;
            newData.seasonCompleted = false;
        }
    }

    generateRoundRobin(clubs, competitionId) {
        const fixtures = [];
        const n = clubs.length;
        const ids = clubs.map(c => c.id);
        let d = [...ids];
        // First half of the season
        for (let round = 0; round < n - 1; round++) {
            for (let i = 0; i < n / 2; i++) {
                let home = d[i];
                let away = d[n - 1 - i];
                if (i === 0 && round % 2 !== 0) {
                    home = d[n - 1 - i];
                    away = d[i];
                }
                fixtures.push({
                    round: round + 1,
                    home: home,
                    away: away,
                    competition: competitionId,
                    played: false,
                    result: null
                });
            }
            d.splice(1, 0, d.pop());
        }
        
        // Second half of the season (reverse home/away)
        const firstHalf = [...fixtures];
        firstHalf.forEach(fx => {
            fixtures.push({
                round: fx.round + n - 1,
                home: fx.away,
                away: fx.home,
                competition: competitionId,
                played: false,
                result: null
            });
        });
        
        return fixtures;
    }

    initLeagueTable(clubs) {
        const table = {};
        clubs.forEach(club => {
            table[club.id] = {
                clubId: club.id, name: club.name, shortName: club.shortName,
                played: 0, wins: 0, draws: 0, losses: 0,
                goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
                form: [], primaryColor: club.primaryColor
            };
        });
        return table;
    }

    generateDomesticCup(clubs, leagueId) {
        let sorted = [...clubs].sort((a,b) => b.reputation - a.reputation);
        let selected = sorted.slice(0, 8).map(c=>c.id).sort(()=>Math.random()-0.5);

        return {
            type: 'domestic_cup',
            leagueId: leagueId,
            rounds: [
                { name: 'Quarter-Final', matches: [
                    { home: selected[0], away: selected[1], played: false, result: null },
                    { home: selected[2], away: selected[3], played: false, result: null },
                    { home: selected[4], away: selected[5], played: false, result: null },
                    { home: selected[6], away: selected[7], played: false, result: null }
                ]},
                { name: 'Semi-Final', matches: [
                    { home: null, away: null, played: false, result: null, waitingForH: 0, waitingForA: 1 },
                    { home: null, away: null, played: false, result: null, waitingForH: 2, waitingForA: 3 }
                ]},
                { name: 'Final', matches: [
                    { home: null, away: null, played: false, result: null, waitingForH: 0, waitingForA: 1 }
                ]}
            ],
            winner: null
        };
    }

    generateContinentalCup(cupType, globalStandings, playerClubId = null) {
        let eligible = [];
        if (globalStandings) {
            Object.keys(globalStandings).forEach(leagueId => {
                const leagueTable = globalStandings[leagueId];
                if (leagueTable && leagueTable.length >= 4) {
                    if (cupType === 'champions_cup') {
                        eligible.push(leagueTable[0].clubId, leagueTable[1].clubId);
                    } else if (cupType === 'europa_cup') {
                        eligible.push(leagueTable[2].clubId);
                    } else if (cupType === 'conference_cup') {
                        eligible.push(leagueTable[3].clubId);
                    }
                }
            });
        } else {
            // Fallback for new game or invalid data
            const allClubs = this.db.clubs.sort((a,b) => b.reputation - a.reputation);
            if (cupType === 'champions_cup') eligible = allClubs.slice(0, 20).map(c=>c.id);
            if (cupType === 'europa_cup') eligible = allClubs.slice(20, 30).map(c=>c.id);
            if (cupType === 'conference_cup') eligible = allClubs.slice(30, 40).map(c=>c.id);
        }

        // FORCE INJECT PLAYER'S CLUB INTO EUROPA CUP IF THEY ARE NOT QUALIFIED
        // This ensures the player always experiences a European cup in their first season
        if (playerClubId && cupType === 'europa_cup') {
            if (!eligible.includes(playerClubId)) {
                // Replace the lowest reputation team with the player's team
                eligible.pop();
                eligible.push(playerClubId);
            }
        }

        // Shuffle teams
        eligible.sort(() => Math.random() - 0.5);

        const isChampions = cupType === 'champions_cup';
        const numGroups = isChampions ? 4 : 2;
        const groupNames = ['A', 'B', 'C', 'D'];
        
        const groups = {};
        for(let i=0; i<numGroups; i++) {
            const groupTeams = eligible.slice(i*5, i*5 + 5);
            const standings = {};
            groupTeams.forEach(id => {
                standings[id] = { 
                    clubId: id,
                    played: 0, wins: 0, draws: 0, losses: 0, 
                    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, 
                    points: 0, form: [] 
                };
            });
            groups[groupNames[i]] = { name: `Group ${groupNames[i]}`, teams: groupTeams, standings };
        }

        const rounds = [];
        
        // Generate Group Stage Matches (5 rounds per group)
        for(let r=1; r<=5; r++) {
            const roundMatches = [];
            for(let i=0; i<numGroups; i++) {
                const gTeams = groups[groupNames[i]].teams;
                const d = [...gTeams, 'BYE'];
                const half = 3;
                
                // Helper to get round matches for 6 teams (5+1 bye)
                const fixtures = [];
                let shift = [...d];
                for(let rd=0; rd<5; rd++) {
                    if (rd + 1 === r) {
                        for(let k=0; k<half; k++) {
                            let home = shift[k];
                            let away = shift[5 - k];
                            if (k===0 && rd%2!==0) { home = away; away = shift[k]; }
                            if (home !== 'BYE' && away !== 'BYE') {
                                fixtures.push({ home, away, played: false, result: null, group: groupNames[i] });
                            }
                        }
                    }
                    shift.splice(1, 0, shift.pop());
                }
                roundMatches.push(...fixtures);
            }
            rounds.push({ name: `Group Matchday ${r}`, isGroup: true, matches: roundMatches });
        }

        // Knockout brackets
        if (isChampions) {
            rounds.push({ name: 'Quarter-Final', isGroup: false, matches: Array.from({length: 4}, (_,i) => ({ home: null, away: null, played: false, result: null, waitingForH: i*2, waitingForA: i*2+1 })) });
            rounds.push({ name: 'Semi-Final', isGroup: false, matches: Array.from({length: 2}, (_,i) => ({ home: null, away: null, played: false, result: null, waitingForH: i*2, waitingForA: i*2+1 })) });
            rounds.push({ name: 'Final', isGroup: false, matches: [ { home: null, away: null, played: false, result: null, waitingForH: 0, waitingForA: 1 } ] });
        } else {
            rounds.push({ name: 'Semi-Final', isGroup: false, matches: Array.from({length: 2}, (_,i) => ({ home: null, away: null, played: false, result: null, waitingForH: i*2, waitingForA: i*2+1 })) });
            rounds.push({ name: 'Final', isGroup: false, matches: [ { home: null, away: null, played: false, result: null, waitingForH: 0, waitingForA: 1 } ] });
        }

        return {
            type: cupType,
            groups: groups,
            rounds: rounds,
            winner: null,
            phase: 'groups' // 'groups' or 'knockout'
        };
    }

    generateGlobalStandingsForInit(playerLeagueId, playerStandings) {
        const standings = {};
        const leagues = Object.values(this.db.leagues);
        
        leagues.forEach(league => {
            const leagueClubs = this.db.getClubsByLeague(league.id);
            if (league.id === playerLeagueId && playerStandings) {
                const table = Object.values(playerStandings);
                table.sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
                standings[league.id] = table.map(t => ({ clubId: t.clubId, points: t.points }));
            } else {
                const simTable = leagueClubs.map(c => ({ clubId: c.id, points: (c.reputation || 50) * 10 + Math.random() * 50 }));
                simTable.sort((a,b) => b.points - a.points);
                standings[league.id] = simTable;
            }
        });
        
        return standings;
    }

    generateSuperCup() {
        return { type: 'super_cup', rounds: [{ name: 'Final', matches: [{ home: null, away: null, played: false, result: null }] }], winner: null };
    }

    buildMatchSchedule(data) {
        const fixtures = [];
        const playerClub = data.currentClubId;
        const playerLeagueMatches = (data.leagueFixtures || []).filter(f => f.home === playerClub || f.away === playerClub);
        playerLeagueMatches.sort((a,b) => a.round - b.round);
        
        let currentWeek = 0;
        const addWeek = (type, fx, compName) => {
            if (!fx) return;
            currentWeek++;
            // MUST clone to prevent reference issues where same match is mutated across multiple places
            fixtures.push({
                week: currentWeek, 
                type: type,
                competition: compName,
                id: fx.id || `${type}_w${currentWeek}_${fx.home}_${fx.away}`,
                round: fx.round || fx.week || currentWeek,
                home: fx.home,
                away: fx.away,
                homeScore: fx.homeScore || 0,
                awayScore: fx.awayScore || 0,
                completed: fx.completed || false,
                playable: false,
                locked: true
            });
        };

        const getCupMatch = (cup, rIdx) => {
            if(!cup || !cup.rounds || !cup.rounds[rIdx]) return null;
            return cup.rounds[rIdx].matches.find(m => m.home === playerClub || m.away === playerClub);
        };
        
        const getContMatch = (rIdx) => {
            if (!data.cups) return null;
            let match = null;
            let compName = '';
            
            const check = (key, name) => {
                if (match) return;
                const c = getCupMatch(data.cups[key], rIdx);
                if (c) { match = c; compName = name; }
            };
            
            check('champions_cup', 'FURIO CHAMPIONS CUP');
            check('europa_cup', 'FURIO EUROPE CUP');
            check('conference_cup', 'FURIO CONFERENCE CUP');
            
            return match ? { match, compName } : null;
        };

        const league = this.db.getLeague(data.currentLeagueId);
        const leagueName = league ? league.name : 'League';

        let leagueIdx = 0;
        let w = 1;
        
        while (leagueIdx < playerLeagueMatches.length || w <= 40) { // safeguard
            let scheduledThisWeek = false;

            // Check Continental (weeks 3, 7, 11, 15, 19, 23, 27, 31)
            let cIdx = -1;
            if (w===3) cIdx=0; if (w===7) cIdx=1; if (w===11) cIdx=2; if (w===15) cIdx=3;
            if (w===19) cIdx=4; if (w===23) cIdx=5; if (w===27) cIdx=6; if (w===31) cIdx=7;
            
            if (cIdx >= 0) {
                const contMatch = getContMatch(cIdx);
                if (contMatch && contMatch.match) {
                    addWeek('continental', contMatch.match, contMatch.compName);
                    scheduledThisWeek = true;
                }
            }

            // Check Domestic Cup (weeks 5, 10, 16, 21, 26)
            if (!scheduledThisWeek && data.cups && data.cups[data.currentLeagueId]) {
                let dIdx = -1;
                if (w===5) dIdx=0; if (w===10) dIdx=1; if (w===16) dIdx=2; if(w===21) dIdx=3; if(w===26) dIdx=4;
                
                if (dIdx >= 0) {
                    const domMatch = getCupMatch(data.cups[data.currentLeagueId], dIdx);
                    if (domMatch) {
                        addWeek('cup', domMatch, 'Domestic Cup');
                        scheduledThisWeek = true;
                    }
                }
            }

            // Otherwise League
            if (!scheduledThisWeek && leagueIdx < playerLeagueMatches.length) {
                addWeek('league', playerLeagueMatches[leagueIdx], leagueName);
                leagueIdx++;
            }
            
            w++;
            if (leagueIdx >= playerLeagueMatches.length && w > 35) break;
        }

        // Set the first uncompleted match as playable
        let firstPlayableFound = false;
        fixtures.forEach(fx => {
            if (!fx.completed && !firstPlayableFound) {
                fx.playable = true;
                fx.locked = false;
                firstPlayableFound = true;
            }
        });

        return fixtures;
    }

    getSortedTable(leagueId) {
        const data = this.gs.getCareerData();
        if (!data.standings || typeof data.standings !== 'object') {
            data.standings = {};
        }
        
        // Auto-populate missing league clubs into standings
        if (leagueId && this.db) {
            const leagueClubs = this.db.getClubsByLeague(leagueId);
            if (leagueClubs && leagueClubs.length > 0) {
                let changed = false;
                leagueClubs.forEach(c => {
                    if (!data.standings[c.id]) {
                        data.standings[c.id] = {
                            clubId: c.id,
                            clubName: c.name,
                            name: c.name,
                            played: 0,
                            wins: 0,
                            draws: 0,
                            losses: 0,
                            goalsFor: 0,
                            goalsAgainst: 0,
                            goalDifference: 0,
                            points: 0,
                            form: [],
                            primaryColor: c.primaryColor,
                            secondaryColor: c.secondaryColor
                        };
                        changed = true;
                    }
                });
                
                // Replay completed league fixtures to rebuild stats for any newly added clubs
                if (changed && data.leagueFixtures) {
                    // Reset all standings first
                    Object.values(data.standings).forEach(row => {
                        row.played = 0; row.wins = 0; row.draws = 0; row.losses = 0;
                        row.goalsFor = 0; row.goalsAgainst = 0; row.goalDifference = 0; row.points = 0;
                    });
                    // Replay completed league fixtures
                    data.leagueFixtures.filter(fx => fx.completed).forEach(fx => {
                        this.updateTable(data.standings, fx.home, fx.away, fx.homeScore, fx.awayScore);
                    });
                    // Also replay completed player fixtures (league type)
                    if (data.fixtures) {
                        data.fixtures.filter(fx => fx.completed && (fx.competition === 'league' || fx.type === 'league')).forEach(fx => {
                            // Only replay if not already counted from leagueFixtures
                            const alreadyCounted = data.leagueFixtures && data.leagueFixtures.some(lf => 
                                lf.completed && lf.home === fx.home && lf.away === fx.away && lf.round === fx.round
                            );
                            if (!alreadyCounted) {
                                this.updateTable(data.standings, fx.home, fx.away, fx.homeScore, fx.awayScore);
                            }
                        });
                    }
                }
            }
        }
        
        const table = data.standings;
        if (!table) return [];
        const targetLId = leagueId || (data.currentClub && (data.currentClub.league || data.currentClub.leagueId)) || data.currentLeagueId;
        const validClubIds = (targetLId && this.db) ? new Set(this.db.getClubsByLeague(targetLId).map(c => c.id)) : null;

        let rows = Object.values(table).filter(r => r && r.clubId);
        if (validClubIds && validClubIds.size > 0) {
            rows = rows.filter(r => validClubIds.has(r.clubId));
        }

        return rows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return (a.name || '').localeCompare(b.name || '');
        });
    }

    isTransferWindowOpen(week) {
        if (!this.gs) this.gs = window.GameStateManager;
        const data = this.gs ? this.gs.getCareerData() : (window.gameState ? window.gameState.career : null);
        const wk = (week !== undefined && week !== null) ? week : (data ? data.currentWeek : 1);
        return (wk >= 1 && wk <= 3) || (wk >= 9 && wk <= 11);
    }

    acceptTransfer(offerId) {
        if (!this.gs) this.gs = window.GameStateManager;
        let data = this.gs.getCareerData();
        if (!data || !data.transferOffers) return false;

        const offer = data.transferOffers.find(o => String(o.id) === String(offerId));
        if (!offer) {
            console.error('[CareerManager] Transfer offer not found for id:', offerId);
            return false;
        }

        if (offer.season && offer.season !== (data.currentSeason || 1)) {
            console.error('[CareerManager] Expired offer from previous season');
            return false;
        }

        offer.status = 'accepted';
        return this.acceptContractMidSeason(offer);
    }

    updateTable(standings, homeId, awayId, homeScore, awayScore) {
        if (!standings || !homeId || !awayId) return;
        
        const getRow = (id) => {
            if (!standings[id]) {
                const club = window.TeamDatabase ? window.TeamDatabase.getClub(id) : null;
                standings[id] = {
                    clubId: id,
                    clubName: club ? club.name : id,
                    name: club ? club.name : id,
                    played: 0, wins: 0, draws: 0, losses: 0,
                    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
                    form: []
                };
            }
            return standings[id];
        };

        const home = getRow(homeId);
        const away = getRow(awayId);

        home.played += 1;
        away.played += 1;
        home.goalsFor += homeScore;
        home.goalsAgainst += awayScore;
        away.goalsFor += awayScore;
        away.goalsAgainst += homeScore;
        home.goalDifference = home.goalsFor - home.goalsAgainst;
        away.goalDifference = away.goalsFor - away.goalsAgainst;

        if (!home.form) home.form = [];
        if (!away.form) away.form = [];

        if (homeScore > awayScore) {
            home.wins += 1;
            home.points += 3;
            away.losses += 1;
            home.form.push('W');
            away.form.push('L');
        } else if (homeScore < awayScore) {
            away.wins += 1;
            away.points += 3;
            home.losses += 1;
            home.form.push('L');
            away.form.push('W');
        } else {
            home.draws += 1;
            away.draws += 1;
            home.points += 1;
            away.points += 1;
            home.form.push('D');
            away.form.push('D');
        }

        if (home.form.length > 5) home.form = home.form.slice(-5);
        if (away.form.length > 5) away.form = away.form.slice(-5);
    }

    processMatchResult(arg1, arg2, arg3, arg4, arg5) {
        if (!this.gs) this.gs = window.GameStateManager;
        const data = this.gs.getCareerData();
        if (!data) return;

        let item = null;
        let homeGoals = 0;
        let awayGoals = 0;
        let playerStats = null;
        let isHome = true;

        if (typeof arg1 === 'object' && arg1 !== null && arg1.home !== undefined) {
            item = arg1;
            homeGoals = arg2 || 0;
            awayGoals = arg3 || 0;
            playerStats = arg4 || null;
            isHome = arg5 !== undefined ? Boolean(arg5) : (item.home === data.currentClubId);
        } else {
            homeGoals = arg1 || 0;
            awayGoals = arg2 || 0;
            playerStats = arg3 || null;
            let matchIndexOverride = -1;
            if (typeof arg4 === 'number') {
                matchIndexOverride = arg4;
            } else if (typeof arg4 === 'boolean') {
                isHome = arg4;
            }
            if (typeof arg5 === 'boolean') {
                isHome = arg5;
            }

            let matchIndex = matchIndexOverride;
            if (matchIndex === -1 && data.fixtures) {
                for (let i = 0; i < data.fixtures.length; i++) {
                    if (data.fixtures[i] && !data.fixtures[i].completed) {
                        matchIndex = i;
                        break;
                    }
                }
            }
            if (matchIndex >= 0 && data.fixtures[matchIndex]) {
                item = data.fixtures[matchIndex];
            }
        }

        if (!item || item.completed) return;

        item.homeScore = homeGoals;
        item.awayScore = awayGoals;
        item.completed = true;
        item.playable = false;

        if (item.competition === 'league' || item.type === 'league') {
            if (data.leagueFixtures) {
                const lf = data.leagueFixtures.find(f => f.round === item.round && f.home === item.home && f.away === item.away);
                if (lf) {
                    lf.homeScore = homeGoals;
                    lf.awayScore = awayGoals;
                    lf.completed = true;
                }
            }
            this.updateTable(data.standings, item.home, item.away, homeGoals, awayGoals);
        }

        if (playerStats) {
            if (!data.seasonStats) data.seasonStats = { goals:0, assists:0, matchesPlayed:0, wins:0, draws:0, losses:0, totalRating:0, avgRating:0, cleanSheets:0, motmCount:0, shots:0, passes:0, tackles:0, dribbles:0 };
            if (!data.careerStats) data.careerStats = { goals:0, assists:0, matchesPlayed:0, wins:0, draws:0, losses:0, totalRating:0, avgRating:0, cleanSheets:0, motmCount:0, shots:0, passes:0, tackles:0, dribbles:0 };

            const pGoals = playerStats.goals || 0;
            const pAssists = playerStats.assists || 0;
            const pRating = playerStats.rating || 0;
            const pShots = playerStats.shots || 0;
            const pPasses = playerStats.passes || 0;
            const pTackles = playerStats.tackles || 0;
            const pDribbles = playerStats.dribbles || 0;

            let playerClubGoals = isHome ? homeGoals : awayGoals;
            let oppClubGoals = isHome ? awayGoals : homeGoals;

            let isWin = playerClubGoals > oppClubGoals;
            let isLoss = playerClubGoals < oppClubGoals;
            let isDraw = playerClubGoals === oppClubGoals;
            let isCleanSheet = oppClubGoals === 0;
            let isMotm = !!playerStats.isMotm;

            // Update seasonStats
            data.seasonStats.matchesPlayed++;
            data.seasonStats.goals += pGoals;
            data.seasonStats.assists += pAssists;
            data.seasonStats.totalRating += pRating;
            data.seasonStats.avgRating = data.seasonStats.totalRating / data.seasonStats.matchesPlayed;
            data.seasonStats.shots = (data.seasonStats.shots || 0) + pShots;
            data.seasonStats.passes = (data.seasonStats.passes || 0) + pPasses;
            data.seasonStats.tackles = (data.seasonStats.tackles || 0) + pTackles;
            data.seasonStats.dribbles = (data.seasonStats.dribbles || 0) + pDribbles;

            if (isMotm) data.seasonStats.motmCount++;
            if (isWin) data.seasonStats.wins++;
            else if (isLoss) data.seasonStats.losses++;
            else if (isDraw) data.seasonStats.draws++;
            if (isCleanSheet) data.seasonStats.cleanSheets++;

            // Update careerStats
            data.careerStats.matchesPlayed++;
            data.careerStats.goals += pGoals;
            data.careerStats.assists += pAssists;
            data.careerStats.totalRating += pRating;
            data.careerStats.avgRating = data.careerStats.totalRating / data.careerStats.matchesPlayed;
            data.careerStats.shots = (data.careerStats.shots || 0) + pShots;
            data.careerStats.passes = (data.careerStats.passes || 0) + pPasses;
            data.careerStats.tackles = (data.careerStats.tackles || 0) + pTackles;
            data.careerStats.dribbles = (data.careerStats.dribbles || 0) + pDribbles;

            if (isMotm) data.careerStats.motmCount++;
            if (isWin) data.careerStats.wins++;
            else if (isLoss) data.careerStats.losses++;
            else if (isDraw) data.careerStats.draws++;
            if (isCleanSheet) data.careerStats.cleanSheets++;

            // Sync to window.gameState.player.stats
            if (window.gameState && window.gameState.player) {
                if (!window.gameState.player.stats) window.gameState.player.stats = {};
                window.gameState.player.stats.matchesPlayed = data.careerStats.matchesPlayed;
                window.gameState.player.stats.goals = data.careerStats.goals;
                window.gameState.player.stats.assists = data.careerStats.assists;
                window.gameState.player.stats.wins = data.careerStats.wins;
                window.gameState.player.stats.losses = data.careerStats.losses;
                window.gameState.player.stats.draws = data.careerStats.draws;
            }
        }

        data.currentWeek = (data.currentWeek || 1) + 1;
        
        // Seasonal Transfer Window Logic (Weeks 1-3 & 9-11)
        const wk = data.currentWeek;
        if ((wk >= 1 && wk <= 3) || (wk >= 9 && wk <= 11)) {
            data.transferWindowOpen = true;
            if (window.TransferManager) window.TransferManager.processCpuTransfers();
            if (!data.transferOffers || data.transferOffers.length === 0) {
                this.generateTransferOffers(data);
            }
        } else {
            data.transferWindowOpen = false;
            data.transferOffers = [];
        }

        this.gs.setCareerData(data);
        this.advanceGlobalSimulation();
    }

    advanceGlobalSimulation() {
        if (!this.gs) this.gs = window.GameStateManager;
        const data = this.gs.getCareerData();
        if (!data || !data.started) return;

        const currentWk = data.currentWeek || 1;

        // 1. Simulate unplayed CPU league fixtures up to current week
        if (data.leagueFixtures) {
            data.leagueFixtures.forEach(fx => {
                if (fx.week < currentWk && !fx.completed) {
                    const hClub = this.db.getClub(fx.home);
                    const aClub = this.db.getClub(fx.away);
                    const hOvr = hClub ? hClub.overall : 65;
                    const aOvr = aClub ? aClub.overall : 65;
                    
                    const diff = (hOvr + 3) - aOvr;
                    let hScore = Math.max(0, Math.floor(Math.random() * 3 + (diff > 0 ? 1 : 0)));
                    let aScore = Math.max(0, Math.floor(Math.random() * 3 - (diff > 0 ? 0.5 : 0)));
                    
                    fx.homeScore = hScore;
                    fx.awayScore = aScore;
                    fx.completed = true;
                    
                    this.updateTable(data.standings, fx.home, fx.away, hScore, aScore);
                }
            });
        }

        // 2. Simulate unplayed Cup matches for previous weeks
        if (data.cups) {
            Object.keys(data.cups).forEach(cupKey => {
                const cup = data.cups[cupKey];
                if (!cup || !cup.rounds) return;

                cup.rounds.forEach((round, rIdx) => {
                    if (round.isGroup && cup.groups) {
                        round.matches.forEach(m => {
                            if (!m.played && m.home && m.away) {
                                const hScore = Math.floor(Math.random() * 3);
                                const aScore = Math.floor(Math.random() * 3);
                                m.played = true;
                                m.result = { homeGoals: hScore, awayGoals: aScore };
                                
                                if (m.group && cup.groups[m.group] && cup.groups[m.group].standings) {
                                    this.updateTable(cup.groups[m.group].standings, m.home, m.away, hScore, aScore);
                                }
                            }
                        });
                    } else if (round.matches) {
                        round.matches.forEach((m, mIdx) => {
                            if (!m.played && m.home && m.away) {
                                let hScore = Math.floor(Math.random() * 3);
                                let aScore = Math.floor(Math.random() * 3);
                                if (hScore === aScore) {
                                    if (Math.random() > 0.5) hScore++; else aScore++;
                                }
                                m.played = true;
                                m.result = { homeGoals: hScore, awayGoals: aScore };
                                const winnerId = hScore > aScore ? m.home : m.away;
                                this.promoteCupWinner(cup, rIdx, mIdx, winnerId);
                            }
                        });
                    }
                });

                if (cup.phase === 'groups' && cup.rounds[4] && cup.rounds[4].matches.every(m => m.played)) {
                    cup.phase = 'knockout';
                    this.promoteGroupsToKnockout(cup, 5);
                }
            });
        }

        // 3. Rebuild player match schedule to include cup progressions
        data.fixtures = this.buildMatchSchedule(data);

        // 4. Set next playable match
        let foundNext = false;
        if (data.fixtures) {
            data.fixtures.forEach(fx => {
                if (!fx.completed && !foundNext) {
                    fx.playable = true;
                    fx.locked = false;
                    foundNext = true;
                } else if (!fx.completed) {
                    fx.playable = false;
                    fx.locked = true;
                }
            });
        }

        this.gs.setCareerData(data);
        if (window.SaveManager) window.SaveManager.save();
    }

    generateTransferOffers(data) {
        if (!data || !window.gameState || !window.gameState.career) return [];
        
        const wk = data.currentWeek || 1;
        if (!this.isTransferWindowOpen(wk)) {
            data.transferWindowOpen = false;
            data.transferOffers = [];
            return [];
        }

        const playerRating = window.gameState.career.rating || 60;
        const playerRep = window.gameState.career.reputation || 30;
        const stats = data.seasonStats || {};
        const avgRating = stats.avgRating || 0;
        
        data.transferOffers = [];
        
        let eligibleTiers = [4, 5, 6];
        
        // Progression Logic
        if (playerRating >= 70 && avgRating >= 7.0 && (stats.goals >= 5 || stats.assists >= 5)) {
            eligibleTiers.push(3);
        }
        if (playerRating >= 82 && avgRating >= 8.0 && playerRep >= 70 && (stats.goals >= 10 || stats.assists >= 10)) {
            eligibleTiers.push(1, 2);
        }

        // Gather all eligible clubs
        const possibleClubs = this.db.clubs.filter(c => c.id !== data.currentClubId && eligibleTiers.includes(c.tier));
        if (!possibleClubs || possibleClubs.length === 0) return [];
        
        // Shuffle and pick up to 3 clubs
        if (typeof Phaser !== 'undefined' && Phaser.Utils && Phaser.Utils.Array) {
            Phaser.Utils.Array.Shuffle(possibleClubs);
        } else {
            possibleClubs.sort(() => 0.5 - Math.random());
        }
        const selectedClubs = possibleClubs.slice(0, 3);
        
        selectedClubs.forEach((club, i) => {
            const isMid = club.tier === 3 || club.tier === 4;
            const isElite = club.tier === 1 || club.tier === 2;
            let displayTier = 'BASIC';
            if (isMid) displayTier = 'MID';
            if (isElite) displayTier = 'ELITE';
            
            let sBonus = 300 + Math.floor(Math.random() * 200);
            let mBonus = 30 + Math.floor(Math.random() * 20);
            let gBonus = 15 + Math.floor(Math.random() * 10);
            
            if (isMid) {
                sBonus *= 2.5; mBonus *= 2; gBonus *= 2;
            } else if (isElite) {
                sBonus *= 5; mBonus *= 4; gBonus *= 4;
            }
            
            const league = this.db.getLeague(club.league);
            data.transferOffers.push({
                id: 'transfer_s' + (data.currentSeason || 1) + '_w' + wk + '_' + i,
                week: wk,
                season: data.currentSeason || 1,
                playerId: (window.gameState.player && window.gameState.player.id) || 'player_1',
                fromClubId: data.currentClubId,
                toClubId: club.id,
                clubId: club.id,
                clubName: club.name,
                leagueId: club.league,
                leagueName: league ? league.name : 'League',
                tier: displayTier,
                prestige: club.reputation || club.prestige || 50,
                role: isElite ? 'Yıldız Oyuncu' : (isMid ? 'Önemli Oyuncu' : 'Rotasyon'),
                signingBonus: Math.floor(sBonus),
                matchBonus: Math.floor(mBonus),
                goalBonus: Math.floor(gBonus),
                assistBonus: Math.floor(gBonus * 0.8),
                salaryPerSeason: Math.floor(sBonus * 4),
                contractLength: 1 + Math.floor(Math.random() * 2) + ' YIL',
                objective: isElite ? 'Şampiyonluk' : (isMid ? 'İlk 4' : 'Ligde Kalma'),
                difficulty: club.difficulty || 3,
                seasons: 1,
                status: 'pending'
            });
        });

        data.transferWindowOpen = true;
        return data.transferOffers;
    }

    promoteCupWinner(cup, currentRoundIdx, matchIdx, winnerId) {
        if (!cup || !cup.rounds[currentRoundIdx]) return;
        if(currentRoundIdx + 1 < cup.rounds.length) {
            const nextRound = cup.rounds[currentRoundIdx + 1];
            nextRound.matches.forEach(nm => {
                if(nm.waitingFor === matchIdx) nm.away = winnerId;
                if(nm.waitingForH === matchIdx) nm.home = winnerId;
                if(nm.waitingForA === matchIdx) nm.away = winnerId;
            });
        } else {
            cup.winner = winnerId;
        }
    }

    promoteGroupsToKnockout(cup, nextRoundIdx) {
        if (!cup || !cup.groups || !cup.rounds[nextRoundIdx]) return;
        const qualified = [];
        // Extract top 2 from each group
        Object.keys(cup.groups).forEach(gName => {
            const st = cup.groups[gName].standings;
            const table = Object.keys(st).map(id => ({ id, ...st[id] }));
            table.sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
            if (table.length >= 2) {
                qualified.push(table[0].id, table[1].id);
            }
        });
        
        // Feed qualified teams into the next round matches
        const nextRound = cup.rounds[nextRoundIdx];
        let qIdx = 0;
        nextRound.matches.forEach(nm => {
            if (qIdx < qualified.length) { nm.home = qualified[qIdx++]; }
            if (qIdx < qualified.length) { nm.away = qualified[qIdx++]; }
        });
    }

    // ===== VALIDATE AND REPAIR CAREER STATE =====
    validateAndRepairCareerState() {
        if (!this.db) this.db = window.TeamDatabase || window.ClubDatabase;
        if (!this.gs) this.gs = window.GameStateManager;
        
        let career = this.gs.getCareerData();
        if (!career || !career.started) return false;
        
        let repaired = false;
        
        // 1. Verify currentClubId exists
        if (!career.currentClubId) {
            const fallbackClub = this.db.clubs.find(c => c.tier === 'BASIC') || this.db.clubs[0];
            career.currentClubId = fallbackClub.id;
            repaired = true;
        }
        
        const clubId = career.currentClubId;
        
        // 2. Verify currentClub exists
        if (!career.currentClub || typeof career.currentClub === 'string' || career.currentClub.id !== clubId) {
            career.currentClub = this.db.getClub(clubId);
            repaired = true;
        }
        
        const club = career.currentClub;
        
        // 3. Verify currentClub.leagueId exists
        const leagueId = club.league || club.leagueId;
        if (!club.leagueId) {
            club.leagueId = leagueId;
            repaired = true;
        }
        if (career.currentLeagueId !== leagueId) {
            career.currentLeagueId = leagueId;
            repaired = true;
        }
        
        // 4. Verify league data exists
        const league = this.db.getLeague(leagueId);
        if (!league) {
            console.error('[CAREER REPAIR] League data not found for leagueId:', leagueId);
            return false;
        }
        if (career.leagueName !== league.name) {
            career.leagueName = league.name;
            repaired = true;
        }
        
        // 5. Verify fixtures array exists and matches current club & current league
        const allClubs = this.db.getClubsByLeague(leagueId);
        const leagueClubIds = new Set(allClubs.map(c => c.id));

        let fixturesNeedRegen = !career.fixtures || !Array.isArray(career.fixtures) || career.fixtures.length === 0;
        if (!fixturesNeedRegen) {
            const leagueMatches = career.fixtures.filter(fx => fx && (fx.competition === 'league' || fx.type === 'league' || (!fx.isCup && fx.type !== 'continental' && fx.type !== 'cup')));
            if (leagueMatches.length === 0) {
                fixturesNeedRegen = true;
            } else {
                const matchesValid = leagueMatches.every(fx =>
                    (fx.home === clubId || fx.away === clubId) &&
                    leagueClubIds.has(fx.home) && leagueClubIds.has(fx.away)
                );
                if (!matchesValid) fixturesNeedRegen = true;
            }
        }

        if (fixturesNeedRegen) {
            console.warn('[CAREER REPAIR] Fixtures array missing or league mismatch. Regenerating schedule...');
            
            const allClubs = this.db.getClubsByLeague(leagueId);
            if (allClubs.length < 2) {
                console.error('[CAREER REPAIR] League has fewer than two valid clubs!');
                return false;
            }
            
            const list = allClubs.map(c => c.id);
            const roundsCount = list.length - 1;
            const matchesPerRound = list.length / 2;
            const tempFixtures = [];
            
            let temp = [...list];
            for (let round = 0; round < roundsCount; round++) {
                for (let i = 0; i < matchesPerRound; i++) {
                    let home = temp[i];
                    let away = temp[temp.length - 1 - i];
                    
                    if (round % 2 === 1) {
                        const swap = home;
                        home = away;
                        away = swap;
                    }
                    
                    tempFixtures.push({
                        round: round + 1,
                        home,
                        away
                    });
                }
                temp.splice(1, 0, temp.pop());
            }
            
            const firstHalfCount = tempFixtures.length;
            for (let idx = 0; idx < firstHalfCount; idx++) {
                const fx = tempFixtures[idx];
                tempFixtures.push({
                    round: fx.round + roundsCount,
                    home: fx.away,
                    away: fx.home
                });
            }
            
            const playerMatches = tempFixtures.filter(fx => fx.home === clubId || fx.away === clubId);
            playerMatches.sort((a, b) => a.round - b.round);
            
            career.fixtures = playerMatches.map(fx => {
                const id = `${leagueId}_w${fx.round}_${fx.home}_${fx.away}`;
                return {
                    id: id,
                    week: fx.round,
                    round: fx.round,
                    home: fx.home,
                    away: fx.away,
                    homeScore: 0,
                    awayScore: 0,
                    completed: false,
                    playable: fx.round === 1,
                    locked: fx.round > 1,
                    competition: "league",
                    get fixture() { return this; }
                };
            });
            
            repaired = true;
        }
        
        // 6. Verify standings dictionary contains every league club
        const allLeagueClubs = this.db.getClubsByLeague(leagueId);
        const hasAllLeagueClubs = career.standings && typeof career.standings === 'object' && !Array.isArray(career.standings) &&
            allLeagueClubs.every(c => career.standings[c.id]);
        if (!hasAllLeagueClubs) {
            console.warn('[CAREER REPAIR] Standings invalid or missing clubs from league. Regenerating...');
            const newStandings = {};
            allLeagueClubs.forEach(c => {
                const row = {
                    clubId: c.id,
                    clubName: c.name,
                    name: c.name,
                    played: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0,
                    points: 0,
                    form: [],
                    primaryColor: c.primaryColor,
                    secondaryColor: c.secondaryColor
                };
                newStandings[c.id] = row;
            });
            career.standings = newStandings;

            // Replay completed league fixtures to sync stats & form
            const completedMatches = (career.leagueFixtures || career.fixtures || []).filter(fx => fx && fx.completed && (fx.competition === 'league' || fx.type === 'league'));
            if (completedMatches.length > 0) {
                completedMatches.forEach(fx => {
                    this.updateTable(career.standings, fx.home, fx.away, fx.homeScore || 0, fx.awayScore || 0);
                });
            }
            repaired = true;
        }
        
        // 7. Verify currentWeek is valid
        if (typeof career.currentWeek !== 'number' || career.currentWeek < 1) {
            career.currentWeek = 1;
            repaired = true;
        }
        
        // 8. completed is false for a new career
        const firstUncompletedIndex = career.fixtures.findIndex(fx => fx.completed !== true);
        if (firstUncompletedIndex === 0 && career.completed === true) {
            career.completed = false;
            repaired = true;
        }
        
        // 9. seasonCompleted is false for a new career
        if (firstUncompletedIndex === 0 && career.seasonCompleted === true) {
            career.seasonCompleted = false;
            repaired = true;
        }
        
        // 10. a next playable fixture exists
        let nextPlayableMarked = false;
        career.fixtures.forEach(fixture => {
            if (fixture.completed === true) {
                fixture.playable = false;
                fixture.locked = false;
            } else {
                if (!nextPlayableMarked) {
                    if (fixture.playable !== true || fixture.locked !== false) {
                        fixture.playable = true;
                        fixture.locked = false;
                        repaired = true;
                    }
                    nextPlayableMarked = true;
                } else {
                    if (fixture.playable !== false || fixture.locked !== true) {
                        fixture.playable = false;
                        fixture.locked = true;
                        repaired = true;
                    }
                }
            }
        });
        
        // Debug logs (Section 10)
        const nextFixture = career.fixtures.find(fx => fx.completed !== true);
        console.log("[CAREER INIT] Club:", career.currentClub);
        console.log("[CAREER INIT] League:", career.currentClub?.league || career.currentClub?.leagueId);
        console.log("[CAREER INIT] Fixtures:", career.fixtures?.length);
        console.log("[CAREER INIT] Standings:", career.standings?.length);
        console.log("[CAREER INIT] Next fixture:", nextFixture);
        console.log("[CAREER INIT] Completed:", career.completed);
        console.log("[CAREER INIT] Season completed:", career.seasonCompleted);

        if (repaired) {
            console.log('[CareerManager] Career state repaired successfully');
            this.gs.setCareerData(career);
        }
        
        return repaired;
    }
    generateMidSeasonOffer(data) {
        if (!data) return;
        const playerRating = data.rating || 60;
        const playerRep = data.reputation || 30;
        const stats = data.seasonStats || {};
        const avgRating = stats.avgRating || 0;
        
        let eligibleTiers = [4, 5, 6];
        if (playerRating >= 70 && avgRating >= 7.0) eligibleTiers.push(3);
        if (playerRating >= 82 && avgRating >= 8.0 && playerRep >= 70) eligibleTiers.push(1, 2);

        const possibleClubs = this.db.clubs.filter(c => c.id !== data.currentClubId && eligibleTiers.includes(c.tier));
        if (possibleClubs.length === 0) return;
        
        Phaser.Utils.Array.Shuffle(possibleClubs);
        const club = possibleClubs[0]; // Just 1 offer mid-season
        
        const isMid = club.tier === 3 || club.tier === 4;
        const isElite = club.tier === 1 || club.tier === 2;
        let displayTier = 'BASIC';
        if (isMid) displayTier = 'MID';
        if (isElite) displayTier = 'ELITE';
        
        let sBonus = 400 + Math.floor(Math.random() * 200);
        let mBonus = 35 + Math.floor(Math.random() * 20);
        let gBonus = 20 + Math.floor(Math.random() * 10);
        
        if (isMid) { sBonus *= 2.5; mBonus *= 2; gBonus *= 2; } 
        else if (isElite) { sBonus *= 5; mBonus *= 4; gBonus *= 4; }
        
        data.midSeasonOffer = {
            id: 'mid_transfer_' + Date.now(),
            clubId: club.id,
            clubName: club.name,
            leagueId: club.league,
            leagueName: this.db.getLeague(club.league).name,
            tier: displayTier,
            prestige: club.reputation || club.prestige || 50,
            role: isElite ? 'Rotasyon' : (isMid ? 'Önemli Oyuncu' : 'Yıldız Oyuncu'),
            signingBonus: Math.floor(sBonus),
            matchBonus: Math.floor(mBonus),
            goalBonus: Math.floor(gBonus),
            assistBonus: Math.floor(gBonus * 0.8),
            salaryPerSeason: Math.floor(sBonus * 4),
            contractLength: 1 + Math.floor(Math.random() * 2) + ' YIL',
            objective: isElite ? 'Şampiyonluk' : (isMid ? 'İlk 4' : 'Ligde Kalma')
        };
    }
}

window.CareerManager = new CareerManager();

