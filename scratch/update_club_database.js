const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/ClubDatabase.js');
const ClubDatabase = require(dbPath);

console.log('Loaded ClubDatabase with', ClubDatabase.clubs.length, 'clubs.');

// Color palette mapping based on realWorldReference or club ID/Name
const colorMap = {
    // TURKEY
    'Galatasaray': { primary: 0xA90429, secondary: 0xFDB912, ovr: 84 }, // Red & Yellow
    'Fenerbahce': { primary: 0x002D72, secondary: 0xFFF200, ovr: 84 },  // Navy & Yellow
    'Besiktas': { primary: 0x000000, secondary: 0xFFFFFF, ovr: 82 },    // Black & White
    'Trabzonspor': { primary: 0x800020, secondary: 0x0072CE, ovr: 80 }, // Burgundy & Sky Blue
    'Basaksehir': { primary: 0xFF6600, secondary: 0x001E42, ovr: 77 },
    'Adana Demirspor': { primary: 0x0080FF, secondary: 0x000000, ovr: 75 },
    'Samsunspor': { primary: 0xCC0000, secondary: 0xFFFFFF, ovr: 75 },
    'Goztepe': { primary: 0xFFCC00, secondary: 0xCC0000, ovr: 74 },
    'Eyupspor': { primary: 0x660099, secondary: 0xFFCC00, ovr: 74 },
    'Sivasspor': { primary: 0xCC0000, secondary: 0xFFFFFF, ovr: 73 },

    // ITALY
    'Inter Milan': { primary: 0x0066B2, secondary: 0x000000, ovr: 90 }, // Nerazzurri Blue & Black
    'AC Milan': { primary: 0xAC1421, secondary: 0x000000, ovr: 87 },    // Rossoneri Red & Black
    'Juventus': { primary: 0xFFFFFF, secondary: 0x000000, ovr: 87 },    // White & Black
    'Napoli': { primary: 0x0080FF, secondary: 0xFFFFFF, ovr: 86 },
    'Roma': { primary: 0x8E1F2F, secondary: 0xF0BC00, ovr: 84 },
    'Atalanta': { primary: 0x1E40AF, secondary: 0x000000, ovr: 85 },
    'Lazio': { primary: 0x87CEEB, secondary: 0xFFFFFF, ovr: 83 },
    'Fiorentina': { primary: 0x4B0082, secondary: 0xFFFFFF, ovr: 82 },
    'Bologna': { primary: 0x990000, secondary: 0x000066, ovr: 81 },
    'Como': { primary: 0x0055A5, secondary: 0xFFFFFF, ovr: 76 },

    // SPAIN
    'Real Madrid': { primary: 0xFFFFFF, secondary: 0xFEBE10, ovr: 92 }, // White & Gold
    'Barcelona': { primary: 0x004D98, secondary: 0xA50044, ovr: 90 },   // Blaugrana Blue & Red
    'Atletico Madrid': { primary: 0xCB3524, secondary: 0xFFFFFF, ovr: 87 },
    'Athletic Bilbao': { primary: 0xEE2524, secondary: 0xFFFFFF, ovr: 83 },
    'Villarreal': { primary: 0xFFE600, secondary: 0x00529F, ovr: 83 },
    'Real Betis': { primary: 0x00875A, secondary: 0xFFFFFF, ovr: 82 },
    'Real Sociedad': { primary: 0x004797, secondary: 0xFFFFFF, ovr: 82 },
    'Sevilla': { primary: 0xFFFFFF, secondary: 0xD4001A, ovr: 81 },
    'Valencia': { primary: 0xFFFFFF, secondary: 0x000000, ovr: 79 },
    'Girona': { primary: 0xCC0000, secondary: 0xFFFFFF, ovr: 80 },

    // ENGLAND
    'Manchester City': { primary: 0x6CABDD, secondary: 0xFFFFFF, ovr: 92 }, // Sky Blue & White
    'Liverpool': { primary: 0xC8102E, secondary: 0xF6EB61, ovr: 91 },       // Red & Gold
    'Arsenal': { primary: 0xEF0107, secondary: 0xFFFFFF, ovr: 90 },         // Red & White
    'Chelsea': { primary: 0x034694, secondary: 0xFFFFFF, ovr: 86 },
    'Manchester United': { primary: 0xDA291C, secondary: 0x000000, ovr: 86 },
    'Newcastle': { primary: 0x000000, secondary: 0xFFFFFF, ovr: 84 },
    'Tottenham': { primary: 0xFFFFFF, secondary: 0x132257, ovr: 85 },
    'Aston Villa': { primary: 0x95BFE6, secondary: 0x670E36, ovr: 84 },
    'Brighton': { primary: 0x0057B8, secondary: 0xFFFFFF, ovr: 81 },
    'Everton': { primary: 0x003399, secondary: 0xFFFFFF, ovr: 78 },

    // GERMANY
    'Bayern Munich': { primary: 0xDC052D, secondary: 0xFFFFFF, ovr: 91 },
    'Borussia Dortmund': { primary: 0xFDE100, secondary: 0x000000, ovr: 87 },
    'Bayer Leverkusen': { primary: 0xE32221, secondary: 0x000000, ovr: 88 },
    'RB Leipzig': { primary: 0xDD0000, secondary: 0x001430, ovr: 85 },
    'VfB Stuttgart': { primary: 0xFFFFFF, secondary: 0xE32221, ovr: 82 },

    // FRANCE
    'Paris Saint-Germain': { primary: 0x001C58, secondary: 0xDA291C, ovr: 90 },
    'Monaco': { primary: 0xE51B24, secondary: 0xFFFFFF, ovr: 83 },
    'Marseille': { primary: 0x00A3E0, secondary: 0xFFFFFF, ovr: 82 },
    'Lille': { primary: 0xE2001A, secondary: 0x091C3E, ovr: 81 },
    'Lyon': { primary: 0xFFFFFF, secondary: 0x182C54, ovr: 80 },

    // NETHERLANDS
    'Ajax': { primary: 0xD2122E, secondary: 0xFFFFFF, ovr: 82 },
    'PSV Eindhoven': { primary: 0xFF0000, secondary: 0xFFFFFF, ovr: 83 },
    'Feyenoord': { primary: 0xFF0000, secondary: 0xFFFFFF, ovr: 82 },

    // PORTUGAL
    'Benfica': { primary: 0xE30613, secondary: 0xFFFFFF, ovr: 84 },
    'Porto': { primary: 0x003399, secondary: 0xFFFFFF, ovr: 83 },
    'Sporting CP': { primary: 0x008040, secondary: 0xFFFFFF, ovr: 84 },

    // BELGIUM
    'Club Brugge': { primary: 0x0055A5, secondary: 0x000000, ovr: 79 },
    'Anderlecht': { primary: 0x5C2D91, secondary: 0xFFFFFF, ovr: 77 },

    // SCOTLAND
    'Celtic': { primary: 0x008751, secondary: 0xFFFFFF, ovr: 79 },
    'Rangers': { primary: 0x1B458F, secondary: 0xFFFFFF, ovr: 78 },

    // AUSTRIA
    'Red Bull Salzburg': { primary: 0xCC0000, secondary: 0xFFFFFF, ovr: 78 },
    'Sturm Graz': { primary: 0x000000, secondary: 0xFFFFFF, ovr: 76 },

    // SWITZERLAND
    'Young Boys': { primary: 0xFFCC00, secondary: 0x000000, ovr: 77 },
    'Basel': { primary: 0xCC0000, secondary: 0x003399, ovr: 76 }
};

let updatedCount = 0;
ClubDatabase.clubs.forEach(club => {
    const ref = club.realWorldReference || club.name;
    let info = colorMap[ref];
    if (!info) {
        // Fallback search
        for (const key in colorMap) {
            if (ref.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(ref.toLowerCase())) {
                info = colorMap[key];
                break;
            }
        }
    }

    if (info) {
        club.primaryColor = info.primary;
        club.secondaryColor = info.secondary;
        if (info.ovr) {
            club.overall = info.ovr;
            club.attackPower = Math.round(info.ovr * 0.98);
            club.defensePower = Math.round(info.ovr * 0.98);
            club.strength = info.ovr;
            club.attack = club.attackPower;
            club.defense = club.defensePower;
            club.goalkeeping = Math.round(info.ovr * 0.97);
            club.midfield = Math.round(info.ovr * 0.99);
            
            // Adjust squad ratings
            if (club.squad && Array.isArray(club.squad)) {
                club.squad.forEach(p => {
                    const diff = info.ovr - 75;
                    p.overall = Math.min(99, Math.max(60, p.overall + diff));
                });
            }
        }
        updatedCount++;
    } else {
        // Default color assign based on league or tier if not explicitly mapped
        if (club.primaryColor === 959977 || !club.primaryColor) {
            club.primaryColor = 0x1e40af; // Default blue
            club.secondaryColor = 0xffffff; // Default white
        }
    }
});

console.log(`Updated ${updatedCount} clubs with authentic colors & ratings.`);

// Save back to file
const content = `/**
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

fs.writeFileSync(dbPath, content, 'utf8');
console.log('Successfully saved updated ClubDatabase.js');
