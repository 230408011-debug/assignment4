const path = require('path');
const fs = require('fs');

const clubDbPath = path.join(__dirname, '..', 'src', 'data', 'ClubDatabase.js');
const code = fs.readFileSync(clubDbPath, 'utf8');

// Sandbox execution to read ClubDatabase object
const window = {};
eval(code + '\nwindow.ClubDatabase = ClubDatabase;');
const db = window.ClubDatabase;

console.log('--- LEAGUES IN DATABASE ---');
console.log(Object.keys(db.leagues || {}));

const clubs = db.clubs || [];
console.log(`Total clubs: ${clubs.length}`);

const leagueCounts = {};
const leagueMismatch = [];
const countryMismatch = [];

clubs.forEach(c => {
    const l = c.league || c.leagueId;
    leagueCounts[l] = (leagueCounts[l] || 0) + 1;
    
    if (!c.league) {
        leagueMismatch.push(c.id);
    }
    if (!db.leagues[l]) {
        console.log(`UNKNOWN LEAGUE FOR CLUB ${c.id}: ${l}`);
    }
});

console.log('--- CLUB COUNTS PER LEAGUE ---');
console.log(JSON.stringify(leagueCounts, null, 2));

console.log('--- MISSING LEAGUE FIELDS ---');
console.log(`Clubs missing 'league' property: ${leagueMismatch.length}`);

