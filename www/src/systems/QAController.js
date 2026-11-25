/**
 * QAController.js - FURIO FC Developer QA Controller
 * Executes automated career initialization flows, full 16-point regression pass, and scenario testing.
 */

class QAController {
    constructor() {
        this.enabled = true; // Enabled in DEBUG/QA mode
        this.lastReport = null;
    }

    startFreshCareerTest() {
        console.log('[QA] Starting One-Click Fresh Career Test...');
        const db = window.TeamDatabase || window.ClubDatabase;
        const cm = window.CareerManager;
        const gs = window.GameStateManager;

        if (!db || !cm || !gs) {
            console.error('[QA] Required systems missing');
            return false;
        }

        // 1. Reset QA state safely
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

        // 2. Generate 3 contract offers
        const offers = db.getRandomFirstContractOffers(3);
        console.log('[QA] Generated starting offers:', offers ? offers.length : 0);

        if (!offers || offers.length < 3) {
            console.error('[QA] Failed to generate 3 valid starting offers');
            return false;
        }

        // 3. Select first offer
        const selected = offers[0];
        console.log(`[QA] Selecting starting offer: ${selected.clubName} (${selected.clubId})`);

        // 4. Initialize season
        const success = cm.initSeason(selected.clubId, selected);
        if (!success) {
            console.error('[QA] initSeason failed!');
            return false;
        }

        const careerData = gs.getCareerData();
        console.log('[QA] Career initialized successfully. Current club:', careerData.currentClubId);
        console.log('[QA] Fixtures generated:', careerData.fixtures.length);
        console.log('[QA] Standings count:', Array.isArray(careerData.standings) ? careerData.standings.length : Object.keys(careerData.standings).length);

        return true;
    }

    runFullRegression() {
        console.log('[QA] Running Full System 16-Point Regression Pass...');
        const validator = window.QAValidator;
        if (!validator) {
            console.error('[QA] QAValidator not found');
            return null;
        }

        const testMethods = [
            'testDatabaseIntegrity',
            'testPlayerIntegrity',
            'testClubIntegrity',
            'testLeagueIntegrity',
            'testSquadIntegrity',
            'testFreshCareerInitialization',
            'testStartingOffers',
            'testFixtureGeneration',
            'testStandingsGeneration',
            'testMatchPreviewData',
            'testMatchIntroData',
            'testGameplayLineupDataFlow',
            'testDevelopmentStatPropagation',
            'testTransferPropagation',
            'testSaveLoadPersistence',
            'testPlaceholderScan'
        ];

        const tests = [];
        let passCount = 0;

        testMethods.forEach(method => {
            if (typeof validator[method] === 'function') {
                const res = validator[method]();
                tests.push(res);
                if (res.pass) passCount++;
            } else {
                tests.push({ id: method, name: method, pass: false, errors: [`Method ${method} missing on QAValidator`], duration: 0 });
            }
        });

        const totalTests = tests.length;
        const allPassed = passCount === totalTests;
        const summary = `${passCount} / ${totalTests} PASS`;

        const details = tests.map(t => {
            if (t.pass) {
                return `[PASS] #${tests.indexOf(t)+1} ${t.name} (${t.duration}ms)`;
            } else {
                return `[FAIL] #${tests.indexOf(t)+1} ${t.name} (${t.duration}ms): ${t.errors.join(', ')}`;
            }
        });

        this.lastReport = {
            timestamp: new Date().toISOString(),
            totalTests,
            passCount,
            allPassed,
            summary,
            tests,
            details
        };

        console.log(`--- FURIO FC 16-POINT QA REGRESSION REPORT ---`);
        console.log(`SUMMARY: ${summary}`);
        details.forEach(d => console.log(d));
        console.log(`-----------------------------------------------`);

        return this.lastReport;
    }
}

window.QAController = new QAController();
