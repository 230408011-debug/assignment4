const fs = require('fs');
const path = require('path');

console.log('=== STARTING QA VERIFICATION FOR 6-PLAYER SQUAD SYSTEM ===\n');

// 1. Mock window and Browser environment
global.window = global;
window.gameState = {};

// Load ClubDatabase, TeamDatabase, GameStateManager, CareerManager
const clubDbCode = fs.readFileSync(path.join(__dirname, '../src/data/ClubDatabase.js'), 'utf8');
eval(clubDbCode);

const teamDbCode = fs.readFileSync(path.join(__dirname, '../src/systems/TeamDatabase.js'), 'utf8');
eval(teamDbCode);

const gameStateMgrCode = fs.readFileSync(path.join(__dirname, '../src/systems/GameStateManager.js'), 'utf8');
eval(gameStateMgrCode);

const careerMgrCode = fs.readFileSync(path.join(__dirname, '../src/systems/CareerManager.js'), 'utf8');
eval(careerMgrCode);

window.TeamDatabase.init();
window.GameStateManager.init();
const cm = window.CareerManager;

let testResults = {};

try {
    // -------------------------------------------------------------
    // TEST 1: Clean Career & 6-Player Squad Initialization
    // -------------------------------------------------------------
    console.log('--- TEST 1: Clean Career & Squad Initialization ---');
    const clubId = 'ENG_MANCHESTER_BLUE';
    const offerPayload = {
        clubId: clubId,
        clubName: 'Manchester Blue',
        leagueId: 'england',
        leagueName: 'Premier League',
        signingBonus: 500,
        isNewCareer: true
    };
    
    cm.initSeason(clubId, offerPayload);
    const sq = cm.getOrInitSquad(clubId);
    
    console.log(`Squad initialized for ${clubId}:`);
    console.log(`   Starting (3): ${sq.starting.map(p => `${p.displayName} (${p.position} ${p.overall})`).join(', ')}`);
    console.log(`   Bench (3): ${sq.bench.map(p => `${p.displayName} (${p.position} ${p.overall})`).join(', ')}`);
    
    const pass1 = sq.starting.length === 3 && sq.bench.length === 3 &&
        sq.starting[0].position === 'GK' &&
        sq.starting[1].position !== 'GK' &&
        sq.starting[2].position !== 'GK';
        
    testResults.test1 = {
        pass: pass1,
        startingCount: sq.starting.length,
        benchCount: sq.bench.length,
        totalSquad: sq.starting.length + sq.bench.length
    };
    console.log(`TEST 1 RESULT: ${pass1 ? 'PASS ✅' : 'FAIL ❌'}\n`);

    // -------------------------------------------------------------
    // TEST 2: Position Rule Enforcement (Field player to GK slot rejected)
    // -------------------------------------------------------------
    console.log('--- TEST 2: Position Rule Enforcement ---');
    // Find bench index of a field player
    const fieldBenchIdx = sq.bench.findIndex(p => p.position !== 'GK');
    let invalidSwapResult = true;
    if (fieldBenchIdx !== -1) {
        // Attempt to swap field player to GK slot (index 0)
        invalidSwapResult = cm.swapSquadPlayers(clubId, fieldBenchIdx, 0);
        console.log(`Attempt field player (${sq.bench[fieldBenchIdx].displayName}) to GK slot -> Allowed: ${invalidSwapResult}`);
    }
    const pass2 = (invalidSwapResult === false);
    testResults.test2 = {
        pass: pass2,
        invalidSwapPrevented: !invalidSwapResult
    };
    console.log(`TEST 2 RESULT: ${pass2 ? 'PASS ✅' : 'FAIL ❌'}\n`);

    // -------------------------------------------------------------
    // TEST 3: Valid Player Swapping & 3v3 Squad Sync
    // -------------------------------------------------------------
    console.log('--- TEST 3: Valid Player Swapping & Gameplay Sync ---');
    const oldStartingField1 = sq.starting[1];
    const oldBenchField = sq.bench[fieldBenchIdx];
    
    const validSwapResult = cm.swapSquadPlayers(clubId, fieldBenchIdx, 1);
    const updatedSq = cm.getOrInitSquad(clubId);
    const club = window.TeamDatabase.getClub(clubId);
    
    console.log(`Swapped ${oldBenchField.displayName} into Field 1 slot.`);
    console.log(`   New Starting Field 1: ${updatedSq.starting[1].displayName}`);
    console.log(`   New Bench: ${updatedSq.bench[fieldBenchIdx].displayName}`);
    console.log(`   Club 3v3 Squad Mid (Field 1): ${club.squad.mid.displayName}`);
    
    const pass3 = validSwapResult &&
        updatedSq.starting[1].id === oldBenchField.id &&
        updatedSq.bench[fieldBenchIdx].id === oldStartingField1.id &&
        club.squad.mid.id === oldBenchField.id;
        
    testResults.test3 = {
        pass: pass3,
        startingField1Name: updatedSq.starting[1].displayName,
        syncedClub3v3MidName: club.squad.mid.displayName
    };
    console.log(`TEST 3 RESULT: ${pass3 ? 'PASS ✅' : 'FAIL ❌'}\n`);

    // -------------------------------------------------------------
    // TEST 4: Save / Reload Persistence
    // -------------------------------------------------------------
    console.log('--- TEST 4: Save & Reload Persistence ---');
    const savedStateStr = JSON.stringify(window.gameState.career);
    
    // Simulate Reload
    window.gameState.career = JSON.parse(savedStateStr);
    const reloadedSq = cm.getOrInitSquad(clubId);
    
    const pass4 = reloadedSq.starting[1].id === oldBenchField.id &&
        reloadedSq.starting.length === 3 &&
        reloadedSq.bench.length === 3;
        
    testResults.test4 = {
        pass: pass4,
        reloadedStartingField1: reloadedSq.starting[1].displayName,
        reloadedStartingCount: reloadedSq.starting.length,
        reloadedBenchCount: reloadedSq.bench.length
    };
    console.log(`TEST 4 RESULT: ${pass4 ? 'PASS ✅' : 'FAIL ❌'}\n`);

} catch (err) {
    console.error('QA SQUAD TEST SUITE ERROR:', err);
}

console.log('=== OVERALL SQUAD QA SUMMARY ===');
console.log(JSON.stringify(testResults, null, 2));
