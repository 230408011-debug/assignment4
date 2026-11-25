const fs = require('fs');
const path = require('path');

// Mock window environment
global.window = global;

// Load ClubDatabase and TeamDatabase
require('../src/data/ClubDatabase.js');
require('../src/systems/TeamDatabase.js');

window.TeamDatabase.init();
const db = window.TeamDatabase;

console.log("--- DATABASE TRUTH AUDIT ---");
console.log("Leagues count:", Object.keys(db.leagues).length);
console.log("Clubs count:", db.clubs.length);
console.log("Players count:", db.players.length);

const errors = [];

// 12 leagues check
if (Object.keys(db.leagues).length !== 12) {
    errors.push(`League count mismatch: expected 12, got ${Object.keys(db.leagues).length}`);
}

// 120 clubs check
if (db.clubs.length !== 120) {
    errors.push(`Club count mismatch: expected 120, got ${db.clubs.length}`);
}

// At least 360 players
if (db.players.length < 360) {
    errors.push(`Player count < 360: got ${db.players.length}`);
}

// Unique Club IDs
const clubIds = new Set();
db.clubs.forEach(c => {
    if (!c.id) errors.push(`Club missing ID: ${c.name}`);
    if (clubIds.has(c.id)) errors.push(`Duplicate club ID: ${c.id}`);
    clubIds.add(c.id);

    if (!c.league || !db.leagues[c.league]) {
        errors.push(`Club ${c.id} has invalid/missing league reference: ${c.league}`);
    }

    if (!c.squad || !c.squad.gk || !c.squad.mid || !c.squad.st) {
        errors.push(`Club ${c.id} missing 3v3 squad slots`);
    }
});

// Unique Player IDs & Ownership
const playerIds = new Set();
const playerOwners = new Map();

db.players.forEach(p => {
    if (!p.id) errors.push(`Player missing ID: ${p.displayName}`);
    if (playerIds.has(p.id)) errors.push(`Duplicate player ID: ${p.id}`);
    playerIds.add(p.id);

    if (playerOwners.has(p.id)) {
        errors.push(`Player ${p.id} (${p.displayName}) owned by multiple clubs: ${playerOwners.get(p.id)} and ${p.clubId}`);
    }
    playerOwners.set(p.id, p.clubId);

    if (!p.clubId || !db.getClub(p.clubId)) {
        errors.push(`Player ${p.id} (${p.displayName}) references invalid clubId: ${p.clubId}`);
    }

    if (p.displayName.includes('undefined') || p.displayName.includes('RAKİP') || p.displayName.includes('TESTUSER')) {
        errors.push(`Player ${p.id} has forbidden placeholder name: ${p.displayName}`);
    }
});

console.log("Audit Complete. Total Errors Found:", errors.length);
if (errors.length > 0) {
    console.error("Errors:", errors);
} else {
    console.log("DATABASE AUDIT PASSED 100%!");
}
