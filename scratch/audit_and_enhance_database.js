const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../src/data/ClubDatabase.js');
const ClubDatabase = require(dbPath);

console.log('--- AUDITING CLUB DATABASE ---');
console.log('Total clubs:', ClubDatabase.clubs.length);

// 1. Authoritative Club Color and Tier Master Map
const masterClubMap = {
    // TURKEY (Trendyol Süper Lig)
    'TUR_ISTANBUL_LIONS': { name: 'Istanbul Lions', real: 'Galatasaray', primary: 0xA90429, secondary: 0xFDB912, tier: 'MID', ovr: 84 },
    'TUR_ISTANBUL_CANARIES': { name: 'Istanbul Canaries', real: 'Fenerbahce', primary: 0x002D72, secondary: 0xFFF200, tier: 'MID', ovr: 84 },
    'TUR_ISTANBUL_EAGLES': { name: 'Istanbul Eagles', real: 'Besiktas', primary: 0x000000, secondary: 0xFFFFFF, tier: 'MID', ovr: 82 },
    'TUR_BLACK_SEA_STORM': { name: 'Black Sea Storm', real: 'Trabzonspor', primary: 0x800020, secondary: 0x0072CE, tier: 'MID', ovr: 80 },
    'TUR_ISTANBUL_OWLS': { name: 'Istanbul Owls', real: 'Basaksehir', primary: 0xFF6600, secondary: 0x001E42, tier: 'MID', ovr: 77 },
    'TUR_ADANA_LIGHTNING': { name: 'Adana Lightning', real: 'Adana Demirspor', primary: 0x0080FF, secondary: 0x000000, tier: 'BASIC', ovr: 75 },
    'TUR_SAMSUN_RED_WHITE': { name: 'Samsun Red White', real: 'Samsunspor', primary: 0xCC0000, secondary: 0xFFFFFF, tier: 'BASIC', ovr: 75 },
    'TUR_IZMIR_YELLOW_RED': { name: 'Izmir Yellow Red', real: 'Goztepe', primary: 0xFFCC00, secondary: 0xCC0000, tier: 'BASIC', ovr: 74 },
    'TUR_EYUP_PURPLE': { name: 'Eyup Purple', real: 'Eyupspor', primary: 0x660099, secondary: 0xFFCC00, tier: 'BASIC', ovr: 74 },
    'TUR_SIVAS_BRAVES': { name: 'Sivas Braves', real: 'Sivasspor', primary: 0xCC0000, secondary: 0xFFFFFF, tier: 'BASIC', ovr: 73 },

    // ITALY (Serie A)
    'ITA_MILANO_BLACK': { name: 'Milano Black', real: 'Inter Milan', primary: 0x0066B2, secondary: 0x000000, tier: 'ELITE', ovr: 90 }, // Inter 2025/26 Champion
    'ITA_MILANO_RED': { name: 'Milano Red', real: 'AC Milan', primary: 0xAC1421, secondary: 0x000000, tier: 'ELITE', ovr: 87 },
    'ITA_TURIN_ZEBRA': { name: 'Turin Zebra', real: 'Juventus', primary: 0xFFFFFF, secondary: 0x000000, tier: 'ELITE', ovr: 87 },
    'ITA_NAPLES_BLUE': { name: 'Naples Blue', real: 'Napoli', primary: 0x0080FF, secondary: 0xFFFFFF, tier: 'ELITE', ovr: 86 },
    'ITA_BERGAMO_BLACK': { name: 'Bergamo Black', real: 'Atalanta', primary: 0x1E40AF, secondary: 0x000000, tier: 'ELITE', ovr: 85 },
    'ITA_ROME_WOLVES': { name: 'Rome Wolves', real: 'Roma', primary: 0x8E1F2F, secondary: 0xF0BC00, tier: 'MID', ovr: 84 },
    'ITA_ROME_EAGLES': { name: 'Rome Eagles', real: 'Lazio', primary: 0x87CEEB, secondary: 0xFFFFFF, tier: 'MID', ovr: 83 },
    'ITA_FLORENCE_PURPLE': { name: 'Florence Purple', real: 'Fiorentina', primary: 0x4B0082, secondary: 0xFFFFFF, tier: 'MID', ovr: 82 },
    'ITA_BOLOGNA_RED': { name: 'Bologna Red', real: 'Bologna', primary: 0x990000, secondary: 0x000066, tier: 'MID', ovr: 81 },
    'ITA_COMO_LAKE': { name: 'Como Lake', real: 'Como', primary: 0x0055A5, secondary: 0xFFFFFF, tier: 'BASIC', ovr: 76 },

    // SPAIN (La Liga)
    'ESP_MADRID_ROYALS': { name: 'Madrid Royals', real: 'Real Madrid', primary: 0xFFFFFF, secondary: 0xFEBE10, tier: 'ELITE', ovr: 92 },
    'ESP_BARCELONA_AZUL': { name: 'Barcelona Azul', real: 'Barcelona', primary: 0x004D98, secondary: 0xA50044, tier: 'ELITE', ovr: 90 },
    'ESP_MADRID_RED': { name: 'Madrid Red', real: 'Atletico Madrid', primary: 0xCB3524, secondary: 0xFFFFFF, tier: 'ELITE', ovr: 87 },
    'ESP_BILBAO_BASQUES': { name: 'Bilbao Basques', real: 'Athletic Bilbao', primary: 0xEE2524, secondary: 0xFFFFFF, tier: 'MID', ovr: 83 },
    'ESP_VILLARREAL_YELLOW': { name: 'Villarreal Yellow', real: 'Villarreal', primary: 0xFFE600, secondary: 0x00529F, tier: 'MID', ovr: 83 },
    'ESP_SEVILLA_GREEN': { name: 'Sevilla Green', real: 'Real Betis', primary: 0x00875A, secondary: 0xFFFFFF, tier: 'MID', ovr: 82 },
    'ESP_SAN_SEBASTIAN': { name: 'San Sebastian', real: 'Real Sociedad', primary: 0x004797, secondary: 0xFFFFFF, tier: 'MID', ovr: 82 },
    'ESP_SEVILLA_RED': { name: 'Sevilla Red', real: 'Sevilla', primary: 0xFFFFFF, secondary: 0xD4001A, tier: 'MID', ovr: 81 },
    'ESP_GIRONA_CITY': { name: 'Girona City', real: 'Girona', primary: 0xCC0000, secondary: 0xFFFFFF, tier: 'MID', ovr: 80 },
    'ESP_VALENCIA_ORANGE': { name: 'Valencia Orange', real: 'Valencia', primary: 0xFFFFFF, secondary: 0x000000, tier: 'BASIC', ovr: 79 },

    // ENGLAND (Premier League)
    'ENG_MANCHESTER_BLUE': { name: 'Manchester Blue', real: 'Manchester City', primary: 0x6CABDD, secondary: 0xFFFFFF, tier: 'ELITE', ovr: 92 },
    'ENG_MERSEY_REDS': { name: 'Mersey Reds', real: 'Liverpool', primary: 0xC8102E, secondary: 0xF6EB61, tier: 'ELITE', ovr: 91 },
    'ENG_LONDON_GUNNERS': { name: 'London Gunners', real: 'Arsenal', primary: 0xEF0107, secondary: 0xFFFFFF, tier: 'ELITE', ovr: 90 },
    'ENG_LONDON_ROYAL_BLUES': { name: 'London Royal Blues', real: 'Chelsea', primary: 0x034694, secondary: 0xFFFFFF, tier: 'ELITE', ovr: 86 },
    'ENG_MANCHESTER_ROYALS': { name: 'Manchester Royals', real: 'Manchester United', primary: 0xDA291C, secondary: 0x000000, tier: 'ELITE', ovr: 86 },
    'ENG_NORTH_LONDON_HOTSPUR': { name: 'North London Hotspur', real: 'Tottenham', primary: 0xFFFFFF, secondary: 0x132257, tier: 'ELITE', ovr: 85 },
    'ENG_TYNE_UNITED': { name: 'Tyne United', real: 'Newcastle', primary: 0x000000, secondary: 0xFFFFFF, tier: 'MID', ovr: 84 },
    'ENG_BIRMINGHAM_LIONS': { name: 'Birmingham Lions', real: 'Aston Villa', primary: 0x95BFE6, secondary: 0x670E36, tier: 'MID', ovr: 84 },
    'ENG_BRIGHTON_SEAGULLS': { name: 'Brighton Seagulls', real: 'Brighton', primary: 0x0057B8, secondary: 0xFFFFFF, tier: 'MID', ovr: 81 },
    'ENG_MERSEY_BLUES': { name: 'Mersey Blues', real: 'Everton', primary: 0x003399, secondary: 0xFFFFFF, tier: 'BASIC', ovr: 78 },

    // GERMANY (Bundesliga)
    'GER_MUNICH_ROYALS': { name: 'Munich Royals', real: 'Bayern Munich', primary: 0xDC052D, secondary: 0xFFFFFF, tier: 'ELITE', ovr: 91 },
    'GER_LEVERKUSEN_RED': { name: 'Leverkusen Red', real: 'Bayer Leverkusen', primary: 0xE32221, secondary: 0x000000, tier: 'ELITE', ovr: 88 },
    'GER_DORTMUND_BLACK': { name: 'Dortmund Black', real: 'Borussia Dortmund', primary: 0xFDE100, secondary: 0x000000, tier: 'ELITE', ovr: 87 },
    'GER_LEIPZIG_BULLS': { name: 'Leipzig Bulls', real: 'RB Leipzig', primary: 0xDD0000, secondary: 0x001430, tier: 'ELITE', ovr: 85 },
    'GER_STUTTGART_RED': { name: 'Stuttgart Red', real: 'VfB Stuttgart', primary: 0xFFFFFF, secondary: 0xE32221, tier: 'MID', ovr: 82 },

    // FRANCE (Ligue 1)
    'FRA_PARIS_CAPITAL': { name: 'Paris Capital', real: 'Paris Saint-Germain', primary: 0x001C58, secondary: 0xDA291C, tier: 'ELITE', ovr: 90 },
    'FRA_MONACO_RED': { name: 'Monaco Red', real: 'Monaco', primary: 0xE51B24, secondary: 0xFFFFFF, tier: 'MID', ovr: 83 },
    'FRA_MARSEILLE_BLUE': { name: 'Marseille Blue', real: 'Marseille', primary: 0x00A3E0, secondary: 0xFFFFFF, tier: 'MID', ovr: 82 }
};

let enhancedCount = 0;

ClubDatabase.clubs.forEach(club => {
    let master = masterClubMap[club.id];
    if (!master) {
        // Find by realWorldReference or name match
        const ref = (club.realWorldReference || club.name || '').toLowerCase();
        for (const key in masterClubMap) {
            const m = masterClubMap[key];
            if (m.real.toLowerCase() === ref || m.name.toLowerCase() === ref) {
                master = m;
                break;
            }
        }
    }

    if (master) {
        club.primaryColor = master.primary;
        club.secondaryColor = master.secondary;
        club.homeKitColors = { shirt: master.primary, shorts: master.secondary, socks: master.primary };
        club.awayKitColors = { shirt: master.secondary, shorts: master.primary, socks: master.secondary };
        club.overall = master.ovr;
        club.tierCategory = master.tier;
        enhancedCount++;
    } else {
        // Set clean defaults if not explicitly mapped
        if (!club.primaryColor || club.primaryColor === 959977) {
            club.primaryColor = 0x1E40AF;
            club.secondaryColor = 0xFFFFFF;
        }
        club.homeKitColors = { shirt: club.primaryColor, shorts: club.secondaryColor, socks: club.primaryColor };
        club.awayKitColors = { shirt: club.secondaryColor, shorts: club.primaryColor, socks: club.secondaryColor };
        
        // Determine tier category from overall
        if (club.overall >= 84) club.tierCategory = 'ELITE';
        else if (club.overall >= 76) club.tierCategory = 'MID';
        else club.tierCategory = 'BASIC';
    }

    // Ensure squad attributes mirror overall accurately
    club.attackPower = Math.round(club.overall * 0.98);
    club.defensePower = Math.round(club.overall * 0.98);
    club.strength = club.overall;
    club.attack = club.attackPower;
    club.defense = club.defensePower;
    club.goalkeeping = Math.round(club.overall * 0.96);
    club.midfield = Math.round(club.overall * 0.99);

    if (Array.isArray(club.squad)) {
        club.squad.forEach(p => {
            p.overall = Math.min(99, Math.max(60, Math.round(club.overall + (p.position === 'ST' ? 2 : (p.position === 'GK' ? -1 : 0)))));
        });
    }
});

console.log(`Enhanced ${enhancedCount} master clubs with authoritative colors, kit schemes, and tier ratings.`);

// Write back to file
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
console.log('Successfully saved enhanced ClubDatabase.js');
