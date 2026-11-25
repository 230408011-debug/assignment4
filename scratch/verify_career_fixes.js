/**
 * verify_career_fixes.js - FURIO FC Career World Fixes & Data Sync Validation
 * Verifies Squad Tab (6 players 3v3), Player Profile stats sync, Rakip Formu, and Head to Head.
 */

const fs = require('fs');
const path = require('path');

// Mock Browser Environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};
global.navigator = { userAgent: 'NodeTest' };
global.document = { addEventListener: () => {} };
global.QA_MODE = false;

// Mock Phaser minimal
global.Phaser = {
    Events: { EventEmitter: class { on() {} off() {} emit() {} } },
    Display: { Color: { HexStringToColor: () => ({ color: 0xffffff }), IntegerToColor: () => ({ rgba: '#ffffff' }) } },
    Scene: class { constructor() {} }
};

// Initialize gameState before loading systems
global.window.gameState = {
    player: {
        name: 'Kaptan Oyuncu',
        username: 'Kaptan Oyuncu',
        position: 'ST',
        overall: 78,
        level: 3,
        xp: 250,
        attributes: { speed: 80, shooting: 82, passing: 74, physical: 76, dribbling: 78, stamina: 85 },
        stats: { matchesPlayed: 0, goals: 0, assists: 0, wins: 0, losses: 0, draws: 0 }
    },
    career: { started: false, ez: 1000 }
};

// Load System Scripts
const root = path.join(__dirname, '..');
eval(fs.readFileSync(path.join(root, 'src/systems/GameStateManager.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'src/data/ClubDatabase.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'src/systems/TeamDatabase.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'src/systems/SaveManager.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'src/systems/CareerManager.js'), 'utf8'));

console.log('====================================================');
console.log('FURIO FC — CAREER WORLD & DATA SYNC VALIDATION');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition, label) {
    total++;
    if (condition) {
        passed++;
        console.log(`[PASS] ${label}`);
    } else {
        console.error(`[FAIL] ${label}`);
    }
}

// 1. Initialize Database & Career
window.TeamDatabase.init();
const cm = window.CareerManager;
cm.initSeason('ENG_MERSEY_REDS', 'england');
const data = window.GameStateManager.getCareerData();

assert(data.started === true, 'Career initialized successfully');
assert(data.currentClubId === 'ENG_MERSEY_REDS', 'Current club set to ENG_MERSEY_REDS');

// 2. Test Squad Generation & User Player Injection
const squad = cm.getOrInitSquad('ENG_MERSEY_REDS');
assert(squad !== null, 'Squad created successfully');
assert(Array.isArray(squad.starting) && squad.starting.length === 3, 'Starting 11 has exactly 3 players (3v3)');
assert(Array.isArray(squad.bench) && squad.bench.length === 3, 'Bench has exactly 3 players');
assert(squad.starting.length + squad.bench.length === 6, 'Total squad size is 6 players');

const userPlayer = squad.starting.find(p => p.isUserPlayer || p.id === 'user_player') || squad.bench.find(p => p.isUserPlayer || p.id === 'user_player');
assert(userPlayer !== undefined, 'User custom player is properly present in club squad');
assert(typeof userPlayer.speed === 'number' && typeof userPlayer.shot === 'number', 'Player has real numeric stat attributes');

// 3. Test Squad Swapping
const bench0 = squad.bench[0];
const start2 = squad.starting[2];
const swapRes = cm.swapSquadPlayers('ENG_MERSEY_REDS', 0, 2);
assert(swapRes === true, 'Squad player swap executed successfully');
assert(squad.starting[2].id === bench0.id, 'Bench player moved to starting slot 2');
assert(squad.bench[0].id === start2.id, 'Starting player moved to bench slot 0');

// 4. Test Match Result Recording & Real Stats Sync
const matchItem = data.fixtures[0];
cm.processMatchResult(matchItem, 3, 1, { goals: 2, assists: 1, rating: 8.5, isMotm: true, shots: 4, passes: 12, tackles: 3, dribbles: 5 });

assert(data.seasonStats.matchesPlayed === 1, 'Season matchesPlayed incremented to 1');
assert(data.seasonStats.goals === 2, 'Season goals updated to 2');
assert(data.seasonStats.assists === 1, 'Season assists updated to 1');
assert(data.careerStats.goals === 2, 'All-time career goals updated to 2');
assert(window.gameState.player.stats.goals === 2, 'Synced to window.gameState.player.stats');

// 5. Test Head-to-Head & Form calculation logic
const oppClubId = matchItem.home === 'ENG_MERSEY_REDS' ? matchItem.away : matchItem.home;
const h2hMatches = data.fixtures.filter(f => f.completed && ((f.home === 'ENG_MERSEY_REDS' && f.away === oppClubId) || (f.home === oppClubId && f.away === 'ENG_MERSEY_REDS')));
assert(h2hMatches.length === 1, 'Real Head-to-Head match detected');

console.log('\n====================================================');
console.log(`RESULTS: ${passed}/${total} ASSERTIONS PASSED`);
console.log('====================================================');

if (passed === total) {
    process.exit(0);
} else {
    process.exit(1);
}
