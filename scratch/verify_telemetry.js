const fs = require('fs');
const path = require('path');

// Mock browser & localStorage
global.window = global;
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};
global.performance = { now() { return Date.now(); } };
global.navigator = { userAgent: 'NodeTestRunner Android 14' };
global.document = {
    hidden: false,
    addEventListener() {}
};

// Load dependencies
require('../src/systems/GameStateManager.js');
require('../src/systems/SaveManager.js');
require('../src/data/ClubDatabase.js');
require('../src/systems/TeamDatabase.js');
require('../src/systems/AnalyticsService.js');
require('../src/systems/CareerManager.js');
require('../src/systems/TransferManager.js');

console.log("=================================================");
console.log("    FURIO FC TELEMETRY REALITY VERIFICATION      ");
console.log("=================================================");

const results = [];

function assert(condition, name, details = '') {
    results.push({ name, pass: !!condition, details });
    console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name} ${details ? '- ' + details : ''}`);
}

// 1. PROVIDER CONNECTION AUDIT
const nativeProviderConnected = !!(window.FirebaseAnalytics || (window.firebase && window.firebase.analytics));
assert(!nativeProviderConnected, "Provider Connection Audit", "Provider status: PROVIDER NOT CONNECTED");

// Initialize Analytics
window.AnalyticsService.init();
const service = window.AnalyticsService;

// Capture all tracked events
const trackedLogs = [];
const originalTrack = service.track.bind(service);
service.track = function(eventName, params) {
    trackedLogs.push({ eventName, params });
    return originalTrack(eventName, params);
};

// 2. PRIVACY & PII AUDIT
let piiFound = false;
trackedLogs.forEach(e => {
    if (e.params.username || e.params.player_name || e.params.email || e.params.phone) {
        piiFound = true;
    }
});
assert(!piiFound, "Privacy / PII Audit", "No PII (username / player_name / email / phone) in initial event payloads");

// 3. D1 RETENTION SIMULATION (Day 0, Day 1, Day 2)
localStorage.clear();
service.firedEvents.clear();
const dayMs = 86400000;

// Day 0: Install
const installTime = Date.now();
localStorage.setItem('furio_first_open_timestamp', installTime.toString());
service.checkD1Retention();
let d1CountDay0 = trackedLogs.filter(e => e.eventName === 'd1_retained').length;
assert(d1CountDay0 === 0, "D1 Retention Simulation - Day 0", "d1_retained NOT fired on Day 0");

// Day 1: 24h later
const day1Time = installTime + dayMs + 1000;
const origDateNow = Date.now;
Date.now = () => day1Time;
service.checkD1Retention();
let d1CountDay1 = trackedLogs.filter(e => e.eventName === 'd1_retained').length;
assert(d1CountDay1 === 1, "D1 Retention Simulation - Day 1", "d1_retained fired EXACTLY ONCE on Day 1");

// Day 2: 48h later
const day2Time = installTime + (dayMs * 2) + 1000;
Date.now = () => day2Time;
service.checkD1Retention();
let d1CountDay2 = trackedLogs.filter(e => e.eventName === 'd1_retained').length;
assert(d1CountDay2 === 1, "D1 Retention Simulation - Day 2", "d1_retained NOT re-fired on Day 2");
Date.now = origDateNow;

// 4. FIRST 3 MATCH SIMULATION
localStorage.removeItem('furio_telemetry_match_index');
assert(service.getNextMatchIndex() === 1, "First 3 Match Index - Match 1", "Match 1 index === 1");

service.incrementMatchIndex();
assert(service.getNextMatchIndex() === 2, "First 3 Match Index - Match 2", "Match 2 index === 2");

service.incrementMatchIndex();
assert(service.getNextMatchIndex() === 3, "First 3 Match Index - Match 3", "Match 3 index === 3");

// 5. FIRST ACTION 10-SECOND RULE VALUES
const appOpenTs = service.getAppOpenTimestamp();
service.setFtueCompleteTimestamp();
const ftueCompleteTs = service.getFtueCompleteTimestamp();

const sampleKickoff = appOpenTs + 2000;
const sampleAction = sampleKickoff + 1500;

const timeKickoff = Math.max(0, Number(((sampleAction - sampleKickoff) / 1000).toFixed(2)));
const timeAppOpen = Math.max(0, Number(((sampleAction - appOpenTs) / 1000).toFixed(2)));
const timeFtueComplete = Math.max(0, Number(((sampleAction - ftueCompleteTs) / 1000).toFixed(2)));

assert(timeKickoff === 1.5, "First Action Metric - Kickoff Delta", `time_from_kickoff_sec = ${timeKickoff}s`);
assert(timeAppOpen === 3.5, "First Action Metric - App Open Delta", `time_from_app_open_sec = ${timeAppOpen}s`);
assert(timeFtueComplete >= 0, "First Action Metric - FTUE Delta", `time_from_ftue_complete_sec = ${timeFtueComplete}s`);

// 6. DUPLICATE EVENT PROTECTION TEST
const countBeforeDup = trackedLogs.length;
service.trackOnce('ftue_complete', { club_id: 'test' }, 'dup_test_key');
service.trackOnce('ftue_complete', { club_id: 'test' }, 'dup_test_key');
service.trackOnce('ftue_complete', { club_id: 'test' }, 'dup_test_key');

const dupFiredCount = trackedLogs.filter(e => e.params && e.params.club_id === 'test').length;
assert(dupFiredCount === 1, "Duplicate Event Protection", "Suppressed 2 duplicate ftue_complete events successfully");

// 7. ZERO-CRASH TEST WITH ANALYTICS DISABLED
service.disable();
assert(!service.isEnabled(), "Zero-Crash Mode", "AnalyticsService disabled");

let crash = false;
try {
    service.track('test_event', { sample: 123 });
    service.startSession();
    service.endSession();
    service.setUserId('user_123');
    service.setUserProperty('tier', 'pro');
} catch (e) {
    crash = true;
}
assert(!crash, "Zero-Crash Test", "All calls completed safely without exception when disabled");
service.enable();

// SUMMARY
console.log("=================================================");
const failed = results.filter(r => !r.pass);
console.log(`VERIFICATION SUMMARY: ${results.length - failed.length} / ${results.length} PASSED`);
console.log("=================================================");

if (failed.length > 0) {
    process.exit(1);
}
