const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', 'src', 'data', 'ClubDatabase.js');
let rawContent = fs.readFileSync(dbPath, 'utf8');

// Strip exports for parsing
const evalCode = rawContent.replace(/if\s*\(typeof window !== 'undefined'\)[\s\S]*$/, '').replace('const ClubDatabase =', 'ClubDatabase =');

let ClubDatabase;
try {
    eval(evalCode);
} catch (e) {
    console.error("Eval failed", e);
    process.exit(1);
}

// 1. Define league overall strengths and reputations (1-100)
const leagueMetrics = {
    'england': { rep: 95, fin: 95, eur: 95, overall: 92 }, // Premier League (Tier 1-2 mainly)
    'spain': { rep: 90, fin: 85, eur: 92, overall: 89 },   // LaLiga
    'italy': { rep: 88, fin: 82, eur: 88, overall: 87 },   // Serie A
    'germany': { rep: 89, fin: 88, eur: 89, overall: 88 }, // Bundesliga
    'france': { rep: 85, fin: 86, eur: 82, overall: 84 },  // Ligue 1
    'portugal': { rep: 80, fin: 75, eur: 80, overall: 80 },// Primeira Liga
    'netherlands': { rep: 78, fin: 76, eur: 76, overall: 78 }, // Eredivisie
    'turkey': { rep: 77, fin: 78, eur: 72, overall: 77 },  // Super Lig
    'belgium': { rep: 74, fin: 72, eur: 70, overall: 74 }, // Pro League
    'scotland': { rep: 72, fin: 68, eur: 70, overall: 72 },// Premiership
    'austria': { rep: 70, fin: 69, eur: 68, overall: 71 }, // Austrian Bundesliga
    'switzerland': { rep: 68, fin: 68, eur: 66, overall: 69 }// Super League
};

ClubDatabase.clubs.forEach(club => {
    // Determine league metrics
    let lgId = Object.keys(leagueMetrics).find(k => club.league.includes(k));
    let lgM = leagueMetrics[lgId] || { rep: 70, fin: 70, eur: 70, overall: 70 };

    // Find squad players
    let gk = club.squad.find(p => p.position === 'GK');
    let cb = club.squad.find(p => p.position === 'CB');
    let st = club.squad.find(p => p.position === 'ST');

    let gkOvr = gk ? gk.overall : 60;
    let cbOvr = cb ? cb.overall : 60;
    let stOvr = st ? st.overall : 60;

    // Calculate base club overall: 40% squad, 30% league overall, 20% league rep, 10% depth
    let squadOvr = (gkOvr + cbOvr + stOvr) / 3;
    let clubOvr = Math.round((squadOvr * 0.75) + (lgM.overall * 0.25));

    // Special logic to ensure top teams stay Tier 1 (e.g. Manchester Blue)
    if (clubOvr > 95) clubOvr = 95;
    if (clubOvr < 50) clubOvr = 50;

    // Apply Tier
    let tier = 6;
    if (clubOvr >= 90) tier = 1;
    else if (clubOvr >= 84) tier = 2;
    else if (clubOvr >= 77) tier = 3;
    else if (clubOvr >= 70) tier = 4;
    else if (clubOvr >= 62) tier = 5;

    // Determine the new fields based on Tier and Squad
    club.overall = clubOvr;
    club.tier = tier;
    
    // Position Strengths
    club.attack = stOvr;
    club.defense = cbOvr;
    club.goalkeeping = gkOvr;
    club.midfield = Math.round((cbOvr + stOvr) / 2); // Approximation for 3v3
    club.depth = Math.max(50, clubOvr - 5); // Example depth

    // Meta Strengths
    club.reputation = Math.min(99, Math.round(lgM.rep * 0.4 + clubOvr * 0.6));
    club.financialPower = Math.min(99, Math.round(lgM.fin * 0.5 + clubOvr * 0.5));
    club.youthDevelopment = Math.max(50, Math.round(clubOvr - (Math.random() * 15)));
    club.europeanStrength = Math.min(99, Math.round(lgM.eur * 0.4 + clubOvr * 0.6));
    club.transferPower = Math.round((club.reputation + club.financialPower) / 2);

    // Player Potentials & Form
    club.squad.forEach(p => {
        // Form ranges 0-100, default 70
        p.form = 70 + Math.floor(Math.random() * 20) - 10;
        
        // Potential
        let ageFactor = Math.max(0, 30 - p.age); // Younger players have more potential
        let pot = p.overall + Math.floor(Math.random() * (ageFactor / 2));
        if (p.age < 23 && Math.random() > 0.7) pot += 5; // Wunderkind chance
        if (pot > 99) pot = 99;
        if (pot < p.overall) pot = p.overall;
        
        p.potential = pot;
    });
});

// Update league data to include the generated metrics
Object.keys(ClubDatabase.leagues).forEach(lId => {
    let lgId = Object.keys(leagueMetrics).find(k => lId.includes(k));
    let metrics = leagueMetrics[lgId] || { rep: 70, fin: 70, eur: 70, overall: 70 };
    
    ClubDatabase.leagues[lId].leagueOverall = metrics.overall;
    ClubDatabase.leagues[lId].leagueReputation = metrics.rep;
    ClubDatabase.leagues[lId].leagueFinancialPower = metrics.fin;
    ClubDatabase.leagues[lId].leagueEuropeanStrength = metrics.eur;
});

// Save back
const outContent = `/**
 * ClubDatabase.js - Complete 2026 Database Rebuild
 * 12 Leagues, 120 Clubs, 360 Players
 */
const ClubDatabase = ${JSON.stringify(ClubDatabase, null, 4)};

if (typeof window !== 'undefined') {
    window.ClubDatabase = ClubDatabase;
    window.TeamDatabase = ClubDatabase;
}
if (typeof module !== 'undefined') {
    module.exports = ClubDatabase;
}
`;

fs.writeFileSync(dbPath, outContent, 'utf8');
console.log('Database successfully enriched with deep club power and player potentials!');
