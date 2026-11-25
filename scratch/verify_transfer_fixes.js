const fs = require('fs');
const path = require('path');

console.log('=== STARTING QA VERIFICATION FOR TRANSFER & SEASON LIFECYCLE ===\n');

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
    // TEST A: New Career -> Week 1-3 Transfer Acceptance
    // -------------------------------------------------------------
    console.log('--- RUNNING TEST A: New Career & Mid-Season Transfer Acceptance ---');
    
    // Pick a valid club ID from TeamDatabase
    const validClub = window.TeamDatabase.clubs[0];
    const initialClubId = validClub ? validClub.id : 'istanbul_capital';
    console.log(`Starting Career with initial club: ${initialClubId} (${validClub ? validClub.name : ''})`);
    
    const offerPayload = {
        clubId: initialClubId,
        clubName: validClub ? validClub.name : 'Istanbul Capital',
        leagueId: validClub ? (validClub.league || validClub.leagueId) : 'turkiye',
        leagueName: 'Trendyol Süper Lig',
        signingBonus: 500,
        isNewCareer: true
    };
    
    cm.initSeason(initialClubId, offerPayload);
    let data = window.GameStateManager.getCareerData();
    
    console.log(`Initial Setup: Club = ${data.currentClubId}, Week = ${data.currentWeek}, Season = ${data.currentSeason}`);
    console.log(`Transfer Window Open (Week 1): ${cm.isTransferWindowOpen(data.currentWeek)}`);
    
    // Generate transfer offers for Week 1
    cm.generateTransferOffers(data);
    console.log(`Offers Generated (Week 1): ${data.transferOffers.length}`);
    
    if (data.transferOffers.length === 0) {
        throw new Error('TEST A FAILED: No transfer offers generated in Week 1!');
    }
    
    const offerToAccept = data.transferOffers[0];
    const targetClubId = offerToAccept.toClubId;
    console.log(`Accepting offer from: ${targetClubId} (${offerToAccept.clubName})`);
    
    const acceptSuccess = cm.acceptTransfer(offerToAccept.id);
    data = window.GameStateManager.getCareerData();
    
    const passA = acceptSuccess &&
        data.currentClubId === targetClubId &&
        data.currentWeek === 1 &&
        data.currentSeason === 1 &&
        data.seasonCompleted === false &&
        data.fixtures.length > 0 &&
        data.fixtures.some(f => f.playable === true && !f.completed);
        
    testResults.testA = {
        pass: passA,
        currentClub: data.currentClubId,
        currentWeek: data.currentWeek,
        currentSeason: data.currentSeason,
        seasonCompleted: data.seasonCompleted,
        fixturesCount: data.fixtures.length,
        nextMatch: data.fixtures.find(f => !f.completed)
    };
    
    console.log(`TEST A RESULT: ${passA ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   New Club: ${data.currentClubId}`);
    console.log(`   Week: ${data.currentWeek}`);
    console.log(`   Season Completed: ${data.seasonCompleted}`);
    console.log(`   Fixtures Count: ${data.fixtures.length}`);
    console.log(`   Next Match: ${JSON.stringify(data.fixtures.find(f => !f.completed))}\n`);

    // -------------------------------------------------------------
    // TEST B: Advance to Week 4 (Transfer Window Closed)
    // -------------------------------------------------------------
    console.log('--- RUNNING TEST B: Advance to Week 4 (Window Closed Test) ---');
    data.currentWeek = 4;
    cm.generateTransferOffers(data);
    data = window.GameStateManager.getCareerData();
    
    const isWinOpenW4 = cm.isTransferWindowOpen(data.currentWeek);
    const passB = !isWinOpenW4 && data.transferWindowOpen === false && data.transferOffers.length === 0;
    
    testResults.testB = {
        pass: passB,
        currentWeek: data.currentWeek,
        isWindowOpen: isWinOpenW4,
        offersCount: data.transferOffers.length
    };
    console.log(`TEST B RESULT: ${passB ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   Week: ${data.currentWeek}, Window Open: ${isWinOpenW4}, Offers Count: ${data.transferOffers.length}\n`);

    // -------------------------------------------------------------
    // TEST C: Advance to Week 9 (Transfer Window Open)
    // -------------------------------------------------------------
    console.log('--- RUNNING TEST C: Advance to Week 9 (Window 2 Open Test) ---');
    data.currentWeek = 9;
    cm.generateTransferOffers(data);
    data = window.GameStateManager.getCareerData();
    
    const isWinOpenW9 = cm.isTransferWindowOpen(data.currentWeek);
    const passC = isWinOpenW9 && data.transferWindowOpen === true && data.transferOffers.length > 0;
    
    testResults.testC = {
        pass: passC,
        currentWeek: data.currentWeek,
        isWindowOpen: isWinOpenW9,
        offersCount: data.transferOffers.length
    };
    console.log(`TEST C RESULT: ${passC ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   Week: ${data.currentWeek}, Window Open: ${isWinOpenW9}, Offers Count: ${data.transferOffers.length}\n`);

    // -------------------------------------------------------------
    // TEST D: Advance to Week 12 (Transfer Window Closed)
    // -------------------------------------------------------------
    console.log('--- RUNNING TEST D: Advance to Week 12 (Window Closed Test) ---');
    data.currentWeek = 12;
    cm.generateTransferOffers(data);
    data = window.GameStateManager.getCareerData();
    
    const isWinOpenW12 = cm.isTransferWindowOpen(data.currentWeek);
    const passD = !isWinOpenW12 && data.transferWindowOpen === false && data.transferOffers.length === 0;
    
    testResults.testD = {
        pass: passD,
        currentWeek: data.currentWeek,
        isWindowOpen: isWinOpenW12,
        offersCount: data.transferOffers.length
    };
    console.log(`TEST D RESULT: ${passD ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   Week: ${data.currentWeek}, Window Open: ${isWinOpenW12}, Offers Count: ${data.transferOffers.length}\n`);

    // -------------------------------------------------------------
    // TEST E: Save & Reload Persistence
    // -------------------------------------------------------------
    console.log('--- RUNNING TEST E: Save / Reload State Persistence ---');
    const savedStateStr = JSON.stringify(window.gameState.career);
    
    window.gameState.career = JSON.parse(savedStateStr);
    const reloadedData = window.GameStateManager.getCareerData();
    
    const passE = reloadedData.currentClubId === targetClubId &&
        reloadedData.currentWeek === 12 &&
        reloadedData.currentSeason === 1 &&
        reloadedData.fixtures && reloadedData.fixtures.length > 0;
        
    testResults.testE = {
        pass: passE,
        reloadedClub: reloadedData.currentClubId,
        reloadedWeek: reloadedData.currentWeek,
        reloadedSeason: reloadedData.currentSeason,
        fixturesCount: reloadedData.fixtures.length
    };
    console.log(`TEST E RESULT: ${passE ? 'PASS ✅' : 'FAIL ❌'}`);
    console.log(`   Reloaded Club: ${reloadedData.currentClubId}`);
    console.log(`   Reloaded Week: ${reloadedData.currentWeek}`);
    console.log(`   Reloaded Season: ${reloadedData.currentSeason}`);
    console.log(`   Reloaded Fixtures Count: ${reloadedData.fixtures.length}\n`);

} catch (err) {
    console.error('QA TEST SUITE ERROR:', err);
}

console.log('=== OVERALL QA SUMMARY ===');
console.log(JSON.stringify(testResults, null, 2));
