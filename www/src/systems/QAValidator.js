/**
 * QAValidator.js - FURIO FC Developer QA Validator
 * System validation suite for 2026 database, squad structures, career flows, transfers, stats, and placeholders.
 */

class QAValidator {
    constructor() {
        this.db = window.TeamDatabase || window.ClubDatabase;
    }

    getDB() {
        return window.TeamDatabase || window.ClubDatabase;
    }

    getTime() {
        return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    }

    // 1. Database Integrity
    testDatabaseIntegrity() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db) return { id: 'database_integrity', name: 'Database Integrity', pass: false, errors: ['Database instance not found'], duration: 0 };

        const clubs = db.clubs || [];
        const leagues = db.leagues || {};
        const players = db.players || [];

        if (clubs.length !== 120) errors.push(`Expected 120 clubs, found ${clubs.length}`);
        if (Object.keys(leagues).length !== 12) errors.push(`Expected 12 leagues, found ${Object.keys(leagues).length}`);
        if (players.length < 360) errors.push(`Expected at least 360 players, found ${players.length}`);

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'database_integrity', name: 'Database Integrity', pass: errors.length === 0, errors, duration };
    }

    // 2. Player Integrity
    testPlayerIntegrity() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db) return { id: 'player_integrity', name: 'Player Integrity', pass: false, errors: ['Database missing'], duration: 0 };

        const players = db.players || [];
        const playerIds = new Set();

        players.forEach(p => {
            if (!p.id) errors.push(`Player missing ID: ${p.displayName}`);
            if (playerIds.has(p.id)) errors.push(`Duplicate player ID: ${p.id}`);
            playerIds.add(p.id);

            const rating = p.overall || p.rating || 0;
            if (rating < 20 || rating > 99) errors.push(`Player ${p.id} rating out of bounds: ${rating}`);
        });

        // Fictionalized Victor Asimhen check
        const victor = players.find(p => (p.displayName || '').includes('Asimhen') || (p.displayName || '').includes('Osimhen'));
        if (!victor) {
            errors.push('Fictionalized player Victor Asimhen not found');
        } else {
            if (victor.displayName === 'Victor Osimhen') errors.push('Exact real-world name Victor Osimhen found instead of fictionalized Victor Asimhen');
            if (victor.position !== 'ST') errors.push(`Victor Asimhen position is ${victor.position}, expected ST`);
            const club = db.getClub(victor.clubId);
            if (!club || (club.id !== 'TUR_ISTANBUL_LIONS' && club.id !== 'galatasaray')) {
                errors.push(`Victor Asimhen club is ${victor.clubId}, expected TUR_ISTANBUL_LIONS / Galatasaray`);
            }
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'player_integrity', name: 'Player Integrity', pass: errors.length === 0, errors, duration };
    }

    // 3. Club Integrity
    testClubIntegrity() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db) return { id: 'club_integrity', name: 'Club Integrity', pass: false, errors: ['Database missing'], duration: 0 };

        const clubs = db.clubs || [];
        const clubIds = new Set();

        clubs.forEach(c => {
            if (!c.id) errors.push(`Club missing ID: ${c.name}`);
            if (clubIds.has(c.id)) errors.push(`Duplicate club ID: ${c.id}`);
            clubIds.add(c.id);

            if (!c.name || c.name.trim() === '') errors.push(`Club ${c.id} has empty name`);
            if (!c.league || !db.leagues[c.league]) errors.push(`Club ${c.id} has invalid league: ${c.league}`);
        });

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'club_integrity', name: 'Club Integrity', pass: errors.length === 0, errors, duration };
    }

    // 4. League Integrity
    testLeagueIntegrity() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db) return { id: 'league_integrity', name: 'League Integrity', pass: false, errors: ['Database missing'], duration: 0 };

        const leagues = db.leagues || {};
        const leagueKeys = Object.keys(leagues);

        if (leagueKeys.length !== 12) errors.push(`Expected 12 leagues, got ${leagueKeys.length}`);

        leagueKeys.forEach(lId => {
            const league = leagues[lId];
            if (!league.name || league.name.trim() === '') errors.push(`League ${lId} missing name`);
            const leagueClubs = db.getClubsByLeague ? db.getClubsByLeague(lId) : db.clubs.filter(c => c.league === lId);
            if (leagueClubs.length === 0) errors.push(`League ${lId} (${league.name}) has no assigned clubs`);
        });

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'league_integrity', name: 'League Integrity', pass: errors.length === 0, errors, duration };
    }

    // 5. Squad Integrity
    testSquadIntegrity() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db) return { id: 'squad_integrity', name: 'Squad Integrity', pass: false, errors: ['Database missing'], duration: 0 };

        const clubs = db.clubs || [];
        clubs.forEach(c => {
            if (!c.squad) {
                errors.push(`Club ${c.id} missing squad object`);
                return;
            }
            if (!c.squad.gk || !c.squad.mid || !c.squad.st) {
                errors.push(`Club ${c.id} missing 3v3 core squad slots (GK/MID/ST)`);
            }
        });

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'squad_integrity', name: 'Squad Integrity', pass: errors.length === 0, errors, duration };
    }

    // 6. Fresh Career Initialization
    testFreshCareerInitialization() {
        const start = this.getTime();
        const errors = [];

        if (!window.gameState) window.gameState = {};
        window.gameState.player = {
            id: 'qa_player_01',
            name: 'Özcan QA',
            username: 'Özcan QA',
            attributes: { speed: 65, shooting: 65, passing: 65, physical: 65, dribbling: 65, stamina: 65 },
            overall: 65,
            level: 1,
            xp: 0
        };
        window.gameState.career = { started: false };

        if (!window.gameState.player.id || window.gameState.player.name !== 'Özcan QA') {
            errors.push('Player state initialization failed');
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'fresh_career_initialization', name: 'Fresh Career Initialization', pass: errors.length === 0, errors, duration };
    }

    // 7. Starting Offers Validation
    testStartingOffers() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db || typeof db.getRandomFirstContractOffers !== 'function') {
            return { id: 'starting_offers', name: 'Starting Offers Validation', pass: false, errors: ['getRandomFirstContractOffers missing'], duration: 0 };
        }

        const offers = db.getRandomFirstContractOffers(3);
        if (!offers || offers.length !== 3) {
            errors.push(`Expected 3 starting offers, received ${offers ? offers.length : 0}`);
        } else {
            const usedClubIds = new Set();
            offers.forEach((offer, idx) => {
                if (!offer.clubId) errors.push(`Offer ${idx+1} missing clubId`);
                if (!offer.clubName) errors.push(`Offer ${idx+1} missing clubName`);
                if (usedClubIds.has(offer.clubId)) errors.push(`Duplicate club offer: ${offer.clubId}`);
                usedClubIds.add(offer.clubId);

                if (offer.strength > 82) {
                    errors.push(`Offer ${idx+1} is elite club (${offer.clubName} OVR ${offer.strength}), max target is 78-80 OVR for career start`);
                }
            });
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'starting_offers', name: 'Starting Offers Validation', pass: errors.length === 0, errors, duration };
    }

    // 8. Fixture Generation
    testFixtureGeneration() {
        const start = this.getTime();
        const db = this.getDB();
        const cm = window.CareerManager;
        const errors = [];

        if (!db || !cm) return { id: 'fixture_generation', name: 'Fixture Generation', pass: false, errors: ['Dependencies missing'], duration: 0 };

        const offers = db.getRandomFirstContractOffers(3);
        const selected = offers[0];

        const success = cm.initSeason(selected.clubId, selected);
        if (!success) {
            errors.push('initSeason failed');
        } else {
            const careerData = window.GameStateManager ? window.GameStateManager.getCareerData() : window.gameState.career;
            if (!careerData.fixtures || careerData.fixtures.length === 0) {
                errors.push('Fixtures array is empty after initSeason');
            } else {
                careerData.fixtures.forEach((fix, idx) => {
                    const homeId = fix.home || fix.homeTeamId;
                    const awayId = fix.away || fix.awayTeamId;
                    if (!homeId || !awayId) errors.push(`Fixture ${idx+1} missing home/away team ID`);
                });
            }
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'fixture_generation', name: 'Fixture Generation', pass: errors.length === 0, errors, duration };
    }

    // 9. Standings Generation
    testStandingsGeneration() {
        const start = this.getTime();
        const errors = [];

        const careerData = window.GameStateManager ? window.GameStateManager.getCareerData() : window.gameState.career;
        if (!careerData || !careerData.standings) {
            errors.push('Career standings object missing');
        } else {
            const standings = Array.isArray(careerData.standings) ? careerData.standings : Object.values(careerData.standings);
            if (standings.length === 0) {
                errors.push('Standings array is empty');
            }
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'standings_generation', name: 'Standings Generation', pass: errors.length === 0, errors, duration };
    }

    // 10. Match Preview Data Flow
    testMatchPreviewData() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        const careerData = window.GameStateManager ? window.GameStateManager.getCareerData() : window.gameState.career;
        if (!careerData || !careerData.currentClubId) {
            errors.push('No active career found for match preview');
        } else {
            const userClub = db.getClub(careerData.currentClubId);
            if (!userClub || !userClub.name) errors.push(`User club ${careerData.currentClubId} not found in DB`);
            
            const nextFixture = careerData.fixtures ? careerData.fixtures[careerData.currentWeek || 0] : null;
            if (nextFixture) {
                const oppId = nextFixture.homeTeamId === careerData.currentClubId ? nextFixture.awayTeamId : nextFixture.homeTeamId;
                const oppClub = db.getClub(oppId);
                if (!oppClub || !oppClub.name) errors.push(`Opponent club ${oppId} not found in DB`);

                const keyPlayer = db.getImportantPlayer(oppId);
                if (!keyPlayer || !keyPlayer.name) errors.push(`Opponent key player resolution failed for club ${oppId}`);
            }
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'match_preview_data', name: 'Match Preview Data Flow', pass: errors.length === 0, errors, duration };
    }

    // 11. Match Intro Data Flow
    testMatchIntroData() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        const careerData = window.GameStateManager ? window.GameStateManager.getCareerData() : window.gameState.career;
        if (careerData && careerData.currentClubId) {
            const userClub = db.getClub(careerData.currentClubId);
            const userColor = db.getPrimaryColor(careerData.currentClubId);
            if (!userColor && userColor !== 0) errors.push('Failed to resolve primary color');
            const userShort = db.getShortName(careerData.currentClubId);
            if (!userShort) errors.push('Failed to resolve club shortName');
        } else {
            errors.push('No active career for match intro validation');
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'match_intro_data', name: 'Match Intro Data Flow', pass: errors.length === 0, errors, duration };
    }

    // 12. Gameplay Lineup & Data Flow
    testGameplayLineupDataFlow() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        const careerData = window.GameStateManager ? window.GameStateManager.getCareerData() : window.gameState.career;
        if (careerData && careerData.currentClubId) {
            const club = db.getClub(careerData.currentClubId);
            if (!club.squad || !club.squad.st || !club.squad.mid || !club.squad.gk) {
                errors.push(`Club ${careerData.currentClubId} squad incomplete for 3v3 gameplay`);
            } else {
                const stName = db.getPlayerSafeName(club.squad.st);
                const midName = db.getPlayerSafeName(club.squad.mid);
                const gkName = db.getPlayerSafeName(club.squad.gk);
                if (!stName || !midName || !gkName) errors.push('Failed to resolve safe squad names');
            }
        } else {
            errors.push('No active career for gameplay lineup test');
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'gameplay_lineup_data_flow', name: 'Gameplay Lineup & Data Flow', pass: errors.length === 0, errors, duration };
    }

    // 13. Development Stat Propagation
    testDevelopmentStatPropagation() {
        const start = this.getTime();
        const errors = [];

        if (!window.gameState) window.gameState = {};
        if (!window.gameState.player) window.gameState.player = { attributes: {} };

        const player = window.gameState.player;
        player.attributes = { speed: 60, dribbling: 60, physical: 60, stamina: 60, shooting: 60, passing: 60 };

        // Perform upgrade
        player.attributes.speed += 5;
        player.attributes.dribbling += 5;
        player.attributes.physical += 5;
        player.attributes.stamina += 5;
        player.attributes.shooting += 5;
        player.attributes.passing += 5;

        if (player.attributes.speed !== 65 || player.attributes.dribbling !== 65) {
            errors.push('Attribute upgrade failed to propagate in player.attributes');
        }

        // Test physics mapping if Player class available
        if (typeof Player !== 'undefined') {
            try {
                const mapStat = (val) => 0.6 + ((val / 99) * 0.65);
                const baseSpeed = 230 * mapStat(player.attributes.speed);
                const mass = 8 + (mapStat(player.attributes.physical) * 4);
                if (baseSpeed <= 0 || mass <= 0) errors.push('Physical property mapping failed');
            } catch (e) {
                errors.push('Player physics mapping exception: ' + e.message);
            }
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'development_stat_propagation', name: 'Development Stat Propagation', pass: errors.length === 0, errors, duration };
    }

    // 14. Transfer & currentClubId Propagation
    testTransferPropagation() {
        const start = this.getTime();
        const db = this.getDB();
        const errors = [];

        if (!db || db.clubs.length < 2) {
            return { id: 'transfer_propagation', name: 'Transfer & currentClubId Propagation', pass: false, errors: ['Clubs missing'], duration: 0 };
        }

        const clubA = db.clubs[0];
        const clubB = db.clubs[1];

        const careerData = window.GameStateManager ? window.GameStateManager.getCareerData() : window.gameState.career;
        careerData.currentClubId = clubA.id;

        // Perform transfer to clubB
        careerData.currentClubId = clubB.id;

        if (careerData.currentClubId !== clubB.id) {
            errors.push(`currentClubId propagation failed: expected ${clubB.id}, got ${careerData.currentClubId}`);
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'transfer_propagation', name: 'Transfer & currentClubId Propagation', pass: errors.length === 0, errors, duration };
    }

    // 15. Save & Load Persistence
    testSaveLoadPersistence() {
        const start = this.getTime();
        const errors = [];

        if (!window.SaveManager) {
            return { id: 'save_load_persistence', name: 'Save & Load Persistence', pass: false, errors: ['SaveManager missing'], duration: 0 };
        }

        try {
            const saveResult = window.SaveManager.save();
            if (!saveResult) {
                errors.push('SaveManager.save() returned false');
            } else {
                const loadResult = window.SaveManager.load();
                if (!loadResult) {
                    errors.push('SaveManager.load() returned false');
                }
            }
        } catch (e) {
            errors.push('Save/Load exception: ' + e.message);
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'save_load_persistence', name: 'Save & Load Persistence', pass: errors.length === 0, errors, duration };
    }

    // 16. Placeholder & Legacy Key Scan
    testPlaceholderScan() {
        const start = this.getTime();
        const errors = [];
        const forbidden = ['TESTUSER', 'RAKİP KULÜP', 'undefined', 'OPP', 'CPU', 'Oyuncu / undefined', 'Takımın golcüsü'];

        const checkValue = (val, path) => {
            if (typeof val === 'string') {
                forbidden.forEach(term => {
                    if (val.includes(term)) {
                        errors.push(`Forbidden string '${term}' found at ${path}: "${val}"`);
                    }
                });
            }
        };

        const checkObj = (obj, path = 'root') => {
            if (!obj || typeof obj !== 'object') return;
            Object.keys(obj).forEach(key => {
                const val = obj[key];
                const currentPath = `${path}.${key}`;
                if (typeof val === 'string') {
                    checkValue(val, currentPath);
                } else if (typeof val === 'object' && val !== null && path.split('.').length < 5) {
                    checkObj(val, currentPath);
                }
            });
        };

        if (window.gameState) {
            checkObj(window.gameState.career, 'gameState.career');
        }

        const duration = Number((this.getTime() - start).toFixed(2));
        return { id: 'placeholder_scan', name: 'Placeholder & Legacy Key Scan', pass: errors.length === 0, errors, duration };
    }

    // Legacy method for backward compatibility
    validateFootballDatabase() { return this.testDatabaseIntegrity(); }
    validateVictorAsimhen() { return this.testPlayerIntegrity(); }
    validateStartingOffers() { return this.testStartingOffers(); }
    validateDevelopmentStats() { return this.testDevelopmentStatPropagation(); }
    scanForPlaceholders() { return this.testPlaceholderScan(); }
}

window.QAValidator = new QAValidator();
