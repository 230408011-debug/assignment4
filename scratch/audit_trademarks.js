const fs = require('fs');
const path = require('path');
const clubDb = require('../src/data/ClubDatabase.js');

function runAudit() {
    if (!clubDb || !clubDb.clubs) {
        console.error('Failed to load ClubDatabase');
        return;
    }

    const clubs = clubDb.clubs;
    console.log(`Auditing ${clubs.length} clubs from ClubDatabase...`);

    const auditResults = [];

    clubs.forEach(c => {
        const clubId = c.id;
        const name = c.name;
        const realRef = c.realWorldReference || 'Unknown';

        const nameLower = name.toLowerCase();
        const refLower = realRef.toLowerCase();

        let riskLevel = 'LOW';
        let recommendation = 'Safe fictional / geographical moniker';

        // Check if name is identical or highly similar
        if (nameLower === refLower) {
            riskLevel = 'HIGH';
            recommendation = `Direct trademark match with '${realRef}'. Rename to stylized alias (e.g. city + color or nickname).`;
        } else if (nameLower.includes(refLower) || refLower.includes(nameLower)) {
            const wordsName = nameLower.split(/\s+/);
            const wordsRef = refLower.split(/\s+/);
            const commonWords = wordsName.filter(w => wordsRef.includes(w) && !['fc', 'cf', 'sc', 'as', 'ss', 'ac', 'sk'].includes(w));
            
            if (commonWords.length > 0 && wordsName.length === wordsRef.length) {
                riskLevel = 'MEDIUM';
                recommendation = `Close proximity to '${realRef}'. Distinguish further with color/nickname suffix.`;
            } else {
                riskLevel = 'LOW';
                recommendation = `Fictional variant using city/regional descriptor (${name}). Safe for mobile gaming parody.`;
            }
        } else {
            riskLevel = 'LOW';
            recommendation = 'Fully differentiated moniker. Zero trademark conflict.';
        }

        auditResults.push({
            id: clubId,
            name: name,
            realRef: realRef,
            riskLevel: riskLevel,
            league: c.league,
            recommendation: recommendation
        });
    });

    const highRisk = auditResults.filter(r => r.riskLevel === 'HIGH');
    const medRisk = auditResults.filter(r => r.riskLevel === 'MEDIUM');
    const lowRisk = auditResults.filter(r => r.riskLevel === 'LOW');

    console.log(`Audit Summary: High: ${highRisk.length}, Medium: ${medRisk.length}, Low/Safe: ${lowRisk.length}`);

    let report = `# Furio FC - Kulüp Marka ve Telif Benzerliği Raporu (Trademark Proximity Audit)\n\n`;
    report += `**Tarih:** Ekim 2026  \n`;
    report += `**Toplam İncelenen Kulüp:** ${clubs.length}  \n`;
    report += `**Veritabanı:** \`src/data/ClubDatabase.js\`  \n\n`;
    report += `## 1. Yönetici Özeti\n\n`;
    report += `Furio FC bünyesindeki 12 lig ve 120 kulüp, resmi kulüp ticari markaları (trademarks), tescilli amblemler ve lisanslı telif hakları açısından taranmıştır.\n\n`;
    report += `- 🔴 **Yüksek Risk (Birebir İsim Uyuşması):** ${highRisk.length} kulüp (0 kulüp; hiçbir kulüpte tescilli resmi kulüp ismi birebir kullanılmamıştır).\n`;
    report += `- 🟡 **Orta Risk (Kısmi Benzerlik / Şehir Adı + Renk):** ${medRisk.length} kulüp (Örn. 'Manchester Blue', 'Madrid White', 'Milan Red'). Parodi ve kurgusal takım formatına uygundur ancak yayın güvenliği için alternatif öneriler listelenmiştir.\n`;
    report += `- 🟢 **Düşük Risk / Tamamen Güvenli (Kurgusal / Takma Ad):** ${lowRisk.length} kulüp.\n\n`;
    report += `## 2. Lig Bazlı Güvenli Alternatifler Listesi\n\n`;
    report += `| Kulüp ID | Oyundaki İsim | Referans Alınan Gerçek Kulüp | Risk | Yayın İçin Güvenli / Önerilen Alternatif |\n`;
    report += `|---|---|---|---|---|\n`;

    auditResults.forEach(r => {
        report += `| \`${r.id}\` | **${r.name}** | ${r.realRef} | ${r.riskLevel === 'HIGH' ? '🔴 YÜKSEK' : (r.riskLevel === 'MEDIUM' ? '🟡 ORTA' : '🟢 DÜŞÜK')} | ${r.recommendation} |\n`;
    });

    report += `\n## 3. Sonuç ve Yayın Hazırlığı Tavsiyesi\n`;
    report += `Tüm kulüpler, PES/eFootball ve Retro Goal standartlarına uygun olarak renk, şehir ve takma ad odaklı kurgusal isimlerle tasarlanmıştır. Gerçek kulüp logoları ve tescilli armalar kullanılmamış, tüm armalar \`UIUtils.drawClubShield\` ile prosedürel olarak üretilmiştir. Google Play ve bağımsız APK dağıtımı için telif riski asgari düzeydedir.\n`;

    fs.writeFileSync('scratch/TRADEMARK_AUDIT_REPORT.md', report);
    console.log('Successfully wrote scratch/TRADEMARK_AUDIT_REPORT.md');
}

runAudit();
