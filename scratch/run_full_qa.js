const fs = require('fs');
const path = require('path');

// Mock window and localStorage environment
global.window = global;
global.localStorage = {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, val) { this._data[key] = String(val); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};
global.performance = {
    now() { return Date.now(); }
};

// Load dependencies
require('../src/systems/GameStateManager.js');
require('../src/systems/SaveManager.js');
require('../src/data/ClubDatabase.js');
require('../src/systems/TeamDatabase.js');
require('../src/systems/CareerManager.js');
require('../src/systems/TransferManager.js');
require('../src/systems/QAValidator.js');
require('../src/systems/QAController.js');

// Initialize database & systems
window.TeamDatabase.init();
window.GameStateManager.init();

console.log("=== RUNNING FURIO FC 16-POINT AUTOMATED QA SUITE ===");

const report = window.QAController.runFullRegression();

console.log("\n--- EXECUTED TEST RESULTS ---");
report.tests.forEach((t, idx) => {
    console.log(`${idx+1}. [${t.pass ? 'PASS' : 'FAIL'}] ${t.id} - ${t.name} (${t.duration}ms)`);
    if (!t.pass) {
        console.error(`   Errors: ${t.errors.join('; ')}`);
    }
});

console.log("\n==============================================");
console.log(`TOTAL TESTS EXECUTED: ${report.totalTests}`);
console.log(`PASSED: ${report.passCount}`);
console.log(`FAILED: ${report.totalTests - report.passCount}`);
console.log(`STATUS: ${report.allPassed ? '100% PASSED - ALL 16 REGRESSION TESTS OK' : 'FAILED'}`);
console.log("==============================================");

if (!report.allPassed) {
    process.exit(1);
}
