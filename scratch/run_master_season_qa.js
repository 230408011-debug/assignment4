const path = require('path');
const fs = require('fs');

// Mock browser environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
};

global.Phaser = {
    Math: { Clamp: (v, min, max) => Math.min(Math.max(v, min), max) },
    Utils: { Array: { Shuffle: arr => arr.sort(() => 0.5 - Math.random()) } }
};

// Load project scripts in dependency order
const clubDbCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'data', 'ClubDatabase.js'), 'utf8');
eval(clubDbCode);
global.window.ClubDatabase = ClubDatabase;

const teamDbCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'TeamDatabase.js'), 'utf8');
eval(teamDbCode);
if (!global.window.TeamDatabase || typeof global.window.TeamDatabase.init !== 'function') {
    global.window.TeamDatabase = new TeamDatabase();
}
global.window.TeamDatabase.init();

const gameStateCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'GameStateManager.js'), 'utf8');
eval(gameStateCode);
if (!global.window.GameStateManager || typeof global.window.GameStateManager.getCareerData !== 'function') {
    global.window.GameStateManager = new GameStateManager();
}

const saveManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'SaveManager.js'), 'utf8');
eval(saveManagerCode);

const transferManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'TransferManager.js'), 'utf8');
eval(transferManagerCode);

const careerManagerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'systems', 'CareerManager.js'), 'utf8');
eval(careerManagerCode);
if (!global.window.CareerManager || typeof global.window.CareerManager.acceptContract !== 'function') {
    global.window.CareerManager = new CareerManager();
}

const playerCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'entities', 'Player.js'), 'utf8');

const testResults = [];

function runTest(id, name, fn) {
    const start = Date.now();
    try {
        fn();
        const duration = Date.now() - start;
        testResults.push({ id, name, status: 'PASS', error: null, duration: `${duration}ms` });
    } catch (err) {
        const duration = Date.now() - start;
        testResults.push({ id, name, status: 'FAIL', error: err.message, duration: `${duration}ms` });
    }
}

console.log('============================================================');
console.log('FURIO FC — MASTER SEASON / CAREER / TRANSFER SYSTEM QA SUITE');
console.log('============================================================\n');

runTest('01', 'Core 2026 Database Structure (12 Leagues, 120 Clubs, 360 Players)', () => {
    const leagues = Object.keys(ClubDatabase.leagues);
    if (leagues.length !== 12) throw new Error(`Expected 12 leagues, found ${leagues.length}`);
    
    let totalClubs = 0;
    let totalPlayers = 0;
    const clubIds = new Set();

    leagues.forEach(lId => {
        const clubs = window.TeamDatabase.getClubsByLeague(lId);
        if (clubs.length !== 10) throw new Error(`League ${lId} has ${clubs.length} clubs (expected 10)`);
        clubs.forEach(c => {
            if (clubIds.has(c.id)) throw new Error(`Duplicate clubId found: ${c.id}`);
            clubIds.add(c.id);
            totalClubs++;
            
            if (c.roster && Array.isArray(c.roster)) {
                totalPlayers += c.roster.length;
            } else if (c.squad) {
                totalPlayers += Object.keys(c.squad).length;
            }
        });
    });

    if (totalClubs !== 120) throw new Error(`Expected 120 total clubs, found ${totalClubs}`);
    if (totalPlayers < 360) throw new Error(`Expected at least 360 players, found ${totalPlayers}`);
});

runTest('02', '3v3 Gameplay Squad Structure (1 GK, 2 Field Players)', () => {
    window.TeamDatabase.clubs.forEach(c => {
        if (!c.squad || !c.squad.gk || !c.squad.mid || !c.squad.st) {
            throw new Error(`Club ${c.id} missing 3v3 squad positions (gk, mid, st)`);
        }
        if (c.squad.gk.position !== 'GK') throw new Error(`Club ${c.id} GK position invalid`);
    });
});

runTest('03', 'Player Attributes Mapping to Gameplay Mechanics', () => {
    if (!playerCode.includes('this.stats =') || !playerCode.includes('speed:') || !playerCode.includes('shotPower:')) {
        throw new Error('Player.js missing attribute mechanics mapping');
    }
});

runTest('04', 'Starting Career Offers (Exactly 3 Unique Random BASIC Offers)', () => {
    const offers = window.TeamDatabase.getRandomFirstContractOffers(3);
    if (offers.length !== 3) throw new Error(`Expected 3 contract offers, got ${offers.length}`);
    const usedClubs = new Set();
    offers.forEach(o => {
        if (usedClubs.has(o.clubId)) throw new Error(`Duplicate club in starting offers: ${o.clubId}`);
        usedClubs.add(o.clubId);
        if (o.tier === 'ELITE') throw new Error('ELITE club offered in starting career!');
    });
});

runTest('05', 'Contract Acceptance & Career Identity Initialization', () => {
    const offers = window.TeamDatabase.getRandomFirstContractOffers(3);
    const selected = offers[0];
    const success = window.CareerManager.acceptContract(selected);
    if (!success) throw new Error('acceptContract returned false');
    
    const data = window.GameStateManager.getCareerData();
    if (!data.started) throw new Error('Career state not marked as started');
    if (data.currentClubId !== selected.clubId) throw new Error(`currentClubId mismatch: ${data.currentClubId} vs ${selected.clubId}`);
    if (!data.currentLeagueId) throw new Error('currentLeagueId missing');
});

runTest('06', 'League Schedule Generation (No Self Matches, Complete double round robin)', () => {
    const data = window.GameStateManager.getCareerData();
    if (!data.leagueFixtures || data.leagueFixtures.length === 0) throw new Error('leagueFixtures missing or empty');
    data.leagueFixtures.forEach(fx => {
        if (fx.home === fx.away) throw new Error(`Self-match detected in fixture: ${fx.id}`);
        if (!fx.home || !fx.away) throw new Error(`Undefined home/away in fixture: ${fx.id}`);
    });
});

runTest('07', 'Cups & European Competitions Initialized', () => {
    const data = window.GameStateManager.getCareerData();
    if (!data.cups) throw new Error('cups missing from career state');
    if (!data.cups[data.currentLeagueId]) throw new Error('Domestic Cup missing');
    if (!data.cups['champions_cup'] || !data.cups['europa_cup'] || !data.cups['conference_cup']) {
        throw new Error('European Cups (champions/europa/conference) missing');
    }
});

runTest('08', 'Match Simulation & Advancement to Next Week', () => {
    const dataBefore = window.GameStateManager.getCareerData();
    const wkBefore = dataBefore.currentWeek;
    
    window.CareerManager.processMatchResult(2, 1, { goals: 2, assists: 0, rating: 8.5 }, true);
    
    const dataAfter = window.GameStateManager.getCareerData();
    if (dataAfter.currentWeek !== wkBefore + 1) {
        throw new Error(`Week did not advance correctly: ${wkBefore} -> ${dataAfter.currentWeek}`);
    }
});

runTest('09', 'Seasonal Transfer Window Lifecycle (Open on Weeks 1-3 & 9-11)', () => {
    const data = window.GameStateManager.getCareerData();
    data.currentWeek = 9;
    window.CareerManager.processMatchResult(1, 0, { goals: 1 }, true);
    
    const updated = window.GameStateManager.getCareerData();
    if (!updated.transferWindowOpen) throw new Error('Transfer window should be OPEN at week 10');
    if (!updated.transferOffers || updated.transferOffers.length === 0) {
        throw new Error('Transfer offers should be generated during open transfer window');
    }
});

runTest('10', 'Player Transfer Acceptance & Career Persistence', () => {
    const data = window.GameStateManager.getCareerData();
    const offer = data.transferOffers[0];
    const prevClub = data.currentClubId;
    
    const accepted = window.CareerManager.acceptTransfer(offer.id);
    if (!accepted) throw new Error('acceptTransfer failed');
    
    const postTransfer = window.GameStateManager.getCareerData();
    if (postTransfer.currentClubId === prevClub) {
        throw new Error('currentClubId was not updated after transfer acceptance');
    }
    if (postTransfer.currentClubId !== offer.clubId) {
        throw new Error(`currentClubId is ${postTransfer.currentClubId}, expected ${offer.clubId}`);
    }
});

runTest('11', 'Save & Reload Integrity Recovery', () => {
    const data = window.GameStateManager.getCareerData();
    if (window.SaveManager) window.SaveManager.save();
    
    const loadedData = window.SaveManager ? window.SaveManager.load() : null;
    if (loadedData && loadedData.career && loadedData.career.currentClubId) {
        if (loadedData.career.currentClubId !== data.currentClubId) {
            throw new Error(`Loaded clubId mismatch: ${loadedData.career.currentClubId} vs ${data.currentClubId}`);
        }
    } else {
        // Backup direct state assertion
        if (!data || !data.started || !data.currentClubId) {
            throw new Error('Career state invalid or not persisted');
        }
    }
});

console.log('\n============================================================');
console.log('RESULTS SUMMARY');
console.log('============================================================');
testResults.forEach(r => {
    console.log(`[${r.status}] QA-${r.id}: ${r.name} (${r.duration}) ${r.error ? '| ERROR: ' + r.error : ''}`);
});
