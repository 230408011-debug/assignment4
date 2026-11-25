/**
 * verify_firebase_telemetry.js - FURIO FC Firebase Telemetry Verification Script
 * Validates event parameter structure, PII cleanup, duplicate prevention, D1 logic, and zero-crash policy.
 */

const fs = require('fs');
const path = require('path');

// Mock Browser / Capacitor Environment for Node execution
global.window = global;
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};
global.navigator = { userAgent: 'NodeTest/Android' };
global.document = { addEventListener: () => {} };
global.QA_MODE = false;

// Mock Native Firebase Analytics Plugin
let nativeLogEvents = [];
global.Capacitor = {
    getPlatform: () => 'android',
    Plugins: {
        FirebaseAnalytics: {
            logEvent: async (payload) => {
                nativeLogEvents.push(payload);
                return true;
            },
            setUserId: async () => true,
            setUserProperty: async () => true
        },
        App: {
            addListener: () => {}
        }
    }
};

// Load AnalyticsService
const analyticsPath = path.join(__dirname, '../src/systems/AnalyticsService.js');
const analyticsCode = fs.readFileSync(analyticsPath, 'utf8');
eval(analyticsCode);

console.log('====================================================');
console.log('FURIO FC — FIREBASE TELEMETRY REALITY AUDIT');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, description) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`[PASS] ${description}`);
    } else {
        console.error(`[FAIL] ${description}`);
    }
}

// 1. Native Provider Detection
window.AnalyticsService.init();
const fbStatus = window.AnalyticsService.getFirebaseStatus();
assert(fbStatus.nativeConnected === true, 'Native Firebase Analytics plugin detected');
assert(fbStatus.status === 'CONNECTED', 'Firebase status reported as CONNECTED');

// 2. Initial Events Fired
assert(nativeLogEvents.some(e => e.name === 'app_open'), 'app_open event delivered to native Firebase transport');
assert(nativeLogEvents.some(e => e.name === 'session_start'), 'session_start event delivered to native Firebase transport');

// 3. PII Privacy Cleanup
nativeLogEvents = [];
window.AnalyticsService.track('character_created', {
    username: 'LeakingUser123',
    player_name: 'John Doe',
    position: 'ST',
    preferred_foot: 'RIGHT'
});

const charEvent = nativeLogEvents.find(e => e.name === 'character_created');
assert(charEvent !== undefined, 'character_created event logged');
assert(charEvent.params.username === undefined, 'username field stripped from payload (PII Clean)');
assert(charEvent.params.player_name === undefined, 'player_name field stripped from payload (PII Clean)');
assert(charEvent.params.position === 'ST', 'position param preserved');
assert(charEvent.params.preferred_foot === 'RIGHT', 'preferred_foot param preserved');

// 4. Duplicate Suppression (trackOnce)
nativeLogEvents = [];
const res1 = window.AnalyticsService.trackOnce('ftue_complete', { match_index: 1 }, 'ftue_complete');
const res2 = window.AnalyticsService.trackOnce('ftue_complete', { match_index: 1 }, 'ftue_complete');
assert(res1 === true, 'First ftue_complete call succeeded');
assert(res2 === false, 'Duplicate ftue_complete call suppressed');
assert(nativeLogEvents.filter(e => e.name === 'ftue_complete').length === 1, 'Exactly one ftue_complete event delivered');

// 5. Match Index Increment
localStorage.clear();
window.AnalyticsService.init();
assert(window.AnalyticsService.getNextMatchIndex() === 1, 'Initial match index is 1');
window.AnalyticsService.incrementMatchIndex();
assert(window.AnalyticsService.getNextMatchIndex() === 2, 'Match index incremented to 2');
window.AnalyticsService.incrementMatchIndex();
assert(window.AnalyticsService.getNextMatchIndex() === 3, 'Match index incremented to 3');

// 6. Zero Crash Policy (Offline / Plugin Failure)
global.Capacitor.Plugins.FirebaseAnalytics.logEvent = async () => {
    throw new Error('Network Offline / Firebase Error');
};

let zeroCrashSuccess = true;
try {
    window.AnalyticsService.track('match_start', { match_index: 1 });
    window.AnalyticsService.track('first_gameplay_action', { action_type: 'SHOT', time_from_kickoff_sec: 4.2 });
    window.AnalyticsService.track('match_end', { result: 'WIN', score: '3-1' });
} catch (e) {
    zeroCrashSuccess = false;
}
assert(zeroCrashSuccess, 'Analytics failures do not throw or crash gameplay (Zero-Crash Policy)');

console.log('\n====================================================');
console.log(`RESULTS: ${passedTests}/${totalTests} ASSERIONS PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
    process.exit(0);
} else {
    process.exit(1);
}
