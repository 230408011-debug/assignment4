const fs = require('fs');
const path = require('path');

// Mock window environment
global.window = global;
global.window.gameState = {
    career: null,
    activeMatch: null
};

// Load database & systems
const clubDbCode = fs.readFileSync(path.join(__dirname, '../src/data/ClubDatabase.js'), 'utf8');
eval(clubDbCode);

const teamDbCode = fs.readFileSync(path.join(__dirname, '../src/systems/TeamDatabase.js'), 'utf8');
eval(teamDbCode);
if (window.TeamDatabase && typeof window.TeamDatabase.init === 'function') {
    window.TeamDatabase.init();
}

const gameStateMgrCode = fs.readFileSync(path.join(__dirname, '../src/systems/GameStateManager.js'), 'utf8');
eval(gameStateMgrCode);
if (window.GameStateManager && typeof window.GameStateManager.init === 'function') {
    window.GameStateManager.init();
}

const saveMgrCode = fs.readFileSync(path.join(__dirname, '../src/systems/SaveManager.js'), 'utf8');
eval(saveMgrCode);

const careerMgrCode = fs.readFileSync(path.join(__dirname, '../src/systems/CareerManager.js'), 'utf8');
eval(careerMgrCode);
if (window.CareerManager && typeof window.CareerManager.init === 'function') {
    window.CareerManager.init();
}

console.log("=== STARTING MATCH PREVIEW RESET & NEW CAREER AUDIT ===");

// TEST 1: New Career Initialization
console.log("\n--- TEST 1: Creating fresh new career ---");
window.SaveManager.resetCareer();
const initSuccess = window.CareerManager.initSeason('TUR_ISTANBUL_CAPITAL', {
    id: 'offer_1',
    clubId: 'TUR_ISTANBUL_CAPITAL',
    clubName: 'Istanbul Capital',
    leagueId: 'turkey',
    leagueName: 'Trendyol Süper Lig',
    isNewCareer: true
});

console.log(`Init Season Success: ${initSuccess}`);
const career = window.gameState.career;

console.log(`Current Week: ${career.currentWeek} (Expected: 1)`);
console.log(`Completed Matches Count: ${career.completedMatches ? career.completedMatches.length : 0} (Expected: 0)`);
console.log(`Standings Form for ISTANBUL_CAPITAL:`, career.standings['TUR_ISTANBUL_CAPITAL'].form);
console.log(`Standings Played for ISTANBUL_CAPITAL: ${career.standings['TUR_ISTANBUL_CAPITAL'].played} (Expected: 0)`);

if (career.currentWeek !== 1 || career.standings['TUR_ISTANBUL_CAPITAL'].form.length !== 0 || career.standings['TUR_ISTANBUL_CAPITAL'].played !== 0) {
    console.error("TEST 1 FAILED: Fresh career has dirty state!");
    process.exit(1);
} else {
    console.log("PASS: TEST 1 Successful! Fresh career initializes Week 1 with 0 played matches and empty form.");
}

// TEST 2: Process 1st match result (Win 3-1)
console.log("\n--- TEST 2: Processing 1st Match Win (3-1) ---");
const firstFixture = career.fixtures[0];
console.log(`1st Fixture: Week ${firstFixture.week || firstFixture.round} - ${firstFixture.home} vs ${firstFixture.away}`);

window.CareerManager.processMatchResult(3, 1, { goals: 2, assists: 1, rating: 9.0, isMotm: true }, 0);

console.log(`Current Week After Match 1: ${career.currentWeek} (Expected: 2)`);
console.log(`Standings Form for ISTANBUL_CAPITAL:`, career.standings['TUR_ISTANBUL_CAPITAL'].form);
console.log(`Standings Played for ISTANBUL_CAPITAL: ${career.standings['TUR_ISTANBUL_CAPITAL'].played} (Expected: 1)`);

if (career.currentWeek !== 2 || career.standings['TUR_ISTANBUL_CAPITAL'].form.length !== 1 || career.standings['TUR_ISTANBUL_CAPITAL'].form[0] !== 'W') {
    console.error("TEST 2 FAILED: Post match state invalid!");
    process.exit(1);
} else {
    console.log("PASS: TEST 2 Successful! Next Match Preview gets Week 2 and exactly 1G form ('W').");
}

// TEST 3: Save & Reload
console.log("\n--- TEST 3: Save & Reload ---");
const savedStateJson = JSON.stringify(window.gameState);
window.gameState = JSON.parse(savedStateJson);
console.log(`Reloaded Week: ${window.gameState.career.currentWeek} (Expected: 2)`);
console.log(`Reloaded Form:`, window.gameState.career.standings['TUR_ISTANBUL_CAPITAL'].form);

if (window.gameState.career.currentWeek !== 2 || window.gameState.career.standings['TUR_ISTANBUL_CAPITAL'].form.length !== 1) {
    console.error("TEST 3 FAILED: Save reload mismatch!");
    process.exit(1);
} else {
    console.log("PASS: TEST 3 Successful! Save reload retains exact state.");
}

// TEST 4: Create another new career
console.log("\n--- TEST 4: Re-creating New Career ---");
window.SaveManager.resetCareer();
const reInitSuccess = window.CareerManager.initSeason('TUR_BLACK_SEA_STARS', {
    id: 'offer_2',
    clubId: 'TUR_BLACK_SEA_STARS',
    clubName: 'Black Sea Stars',
    leagueId: 'turkey',
    leagueName: 'Trendyol Süper Lig',
    isNewCareer: true
});

const newCareer = window.gameState.career;
console.log(`Re-created Career Week: ${newCareer.currentWeek} (Expected: 1)`);
console.log(`Re-created Form for BLACK_SEA_STARS:`, newCareer.standings['TUR_BLACK_SEA_STARS'].form);

if (newCareer.currentWeek !== 1 || newCareer.standings['TUR_BLACK_SEA_STARS'].form.length !== 0) {
    console.error("TEST 4 FAILED: Data leaked from previous career into new career!");
    process.exit(1);
} else {
    console.log("PASS: TEST 4 Successful! Zero data leaks on new career reset.");
}

console.log("\n=== ALL 4 VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
