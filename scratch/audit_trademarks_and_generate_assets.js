const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. GENERATE ANDROID ADAPTIVE ICONS & SPLASH SCREENS
async function generateAndroidAssets() {
    const iconSourcePath = path.resolve('assets/icon.png');
    if (!fs.existsSync(iconSourcePath)) {
        console.error('Source icon.png not found at', iconSourcePath);
        return;
    }

    const resBase = path.resolve('android/app/src/main/res');

    // Mipmap Icon Sizes:
    // mdpi: 48x48 (fg/bg 108)
    // hdpi: 72x72 (fg/bg 162)
    // xhdpi: 96x96 (fg/bg 216)
    // xxhdpi: 144x144 (fg/bg 324)
    // xxxhdpi: 192x192 (fg/bg 432)
    const mipmapConfigs = [
        { dir: 'mipmap-mdpi', iconSize: 48, adaptiveSize: 108 },
        { dir: 'mipmap-hdpi', iconSize: 72, adaptiveSize: 162 },
        { dir: 'mipmap-xhdpi', iconSize: 96, adaptiveSize: 216 },
        { dir: 'mipmap-xxhdpi', iconSize: 144, adaptiveSize: 324 },
        { dir: 'mipmap-xxxhdpi', iconSize: 192, adaptiveSize: 432 }
    ];

    console.log('Generating Android Adaptive Icons...');

    for (const cfg of mipmapConfigs) {
        const outDir = path.join(resBase, cfg.dir);
        fs.mkdirSync(outDir, { recursive: true });

        // A. Standard ic_launcher.png (Rounded rectangle)
        const cornerR = Math.round(cfg.iconSize * 0.18);
        const iconSvgMask = Buffer.from(`
            <svg width="${cfg.iconSize}" height="${cfg.iconSize}">
                <rect x="0" y="0" width="${cfg.iconSize}" height="${cfg.iconSize}" rx="${cornerR}" ry="${cornerR}" fill="#fff" />
            </svg>
        `);
        const standardIcon = await sharp(iconSourcePath)
            .resize(cfg.iconSize, cfg.iconSize)
            .composite([{ input: iconSvgMask, blend: 'dest-in' }])
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(outDir, 'ic_launcher.png'), standardIcon);

        // B. ic_launcher_round.png (Circular mask)
        const roundSvgMask = Buffer.from(`
            <svg width="${cfg.iconSize}" height="${cfg.iconSize}">
                <circle cx="${cfg.iconSize/2}" cy="${cfg.iconSize/2}" r="${cfg.iconSize/2}" fill="#fff" />
            </svg>
        `);
        const roundIcon = await sharp(iconSourcePath)
            .resize(cfg.iconSize, cfg.iconSize)
            .composite([{ input: roundSvgMask, blend: 'dest-in' }])
            .png()
            .toBuffer();
        fs.writeFileSync(path.join(outDir, 'ic_launcher_round.png'), roundIcon);

        // C. ic_launcher_background.png (Dark gradient background for adaptive icon)
        const bgSvg = Buffer.from(`
            <svg width="${cfg.adaptiveSize}" height="${cfg.adaptiveSize}">
                <defs>
                    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stop-color="#0e172a" />
                        <stop offset="100%" stop-color="#020617" />
                    </radialGradient>
                </defs>
                <rect width="${cfg.adaptiveSize}" height="${cfg.adaptiveSize}" fill="url(#bgGrad)" />
            </svg>
        `);
        const bgImg = await sharp(bgSvg).png().toBuffer();
        fs.writeFileSync(path.join(outDir, 'ic_launcher_background.png'), bgImg);

        // D. ic_launcher_foreground.png (Emblem in center 66% safe zone, transparent around)
        const safeZoneSize = Math.round(cfg.adaptiveSize * 0.66);
        const emblemResized = await sharp(iconSourcePath)
            .resize(safeZoneSize, safeZoneSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toBuffer();

        const fgFull = await sharp({
            create: {
                width: cfg.adaptiveSize,
                height: cfg.adaptiveSize,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
        .composite([{
            input: emblemResized,
            top: Math.round((cfg.adaptiveSize - safeZoneSize) / 2),
            left: Math.round((cfg.adaptiveSize - safeZoneSize) / 2)
        }])
        .png()
        .toBuffer();

        fs.writeFileSync(path.join(outDir, 'ic_launcher_foreground.png'), fgFull);
        console.log(`Generated mipmap icons for ${cfg.dir}`);
    }

    // 2. SPLASH SCREENS
    console.log('Generating Android Splash Screens across all drawable densities...');

    // Find all drawable directories with splash.png
    const drawableDirs = fs.readdirSync(resBase).filter(d => d.startsWith('drawable'));

    for (const d of drawableDirs) {
        const splashFile = path.join(resBase, d, 'splash.png');
        if (!fs.existsSync(splashFile)) continue;

        const currentMeta = await sharp(splashFile).metadata();
        const sw = currentMeta.width || 480;
        const sh = currentMeta.height || 800;

        // Create a premium cyber splash with dark neon stadium gradient & centered Furio FC shield
        const logoTargetW = Math.min(Math.round(sw * 0.55), Math.round(sh * 0.4), 450);
        const logoTargetH = logoTargetW;

        const resizedEmblem = await sharp(iconSourcePath)
            .resize(logoTargetW, logoTargetH, { fit: 'contain' })
            .toBuffer();

        // Create canvas with radial gradient glow
        const splashSvg = Buffer.from(`
            <svg width="${sw}" height="${sh}">
                <defs>
                    <radialGradient id="splashGlow" cx="50%" cy="48%" r="55%">
                        <stop offset="0%" stop-color="#1e1b4b" />
                        <stop offset="40%" stop-color="#0f0e26" />
                        <stop offset="100%" stop-color="#030014" />
                    </radialGradient>
                    <linearGradient id="neonLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#00ffff" stop-opacity="0" />
                        <stop offset="50%" stop-color="#00ffff" stop-opacity="0.8" />
                        <stop offset="100%" stop-color="#d946ef" stop-opacity="0" />
                    </linearGradient>
                </defs>
                <rect width="${sw}" height="${sh}" fill="url(#splashGlow)" />
                <rect x="0" y="${Math.round(sh * 0.48 + logoTargetH * 0.55)}" width="${sw}" height="2" fill="url(#neonLine)" />
            </svg>
        `);

        const compositeSplash = await sharp(splashSvg)
            .composite([{
                input: resizedEmblem,
                top: Math.round((sh - logoTargetH) / 2 - sh * 0.03),
                left: Math.round((sw - logoTargetW) / 2)
            }])
            .png({ compressionLevel: 8 })
            .toBuffer();

        fs.writeFileSync(splashFile, compositeSplash);
    }
    console.log('All Android Splash Screens successfully updated with Furio FC crest branding!');
}

// 3. TRADEMARK PROXIMITY AUDIT
function auditTrademarks() {
    console.log('\n--- EXECUTING TRADEMARK AUDIT ON CLUB NAMES ---');
    // Load TeamDatabase clubs
    const tdContent = fs.readFileSync('src/systems/TeamDatabase.js', 'utf8');
    const clubsObjMatch = tdContent.match(/this\.clubs\s*=\s*(\{[\s\S]*?\n\s*\};)/);
    
    // Extract real world references and club names
    const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?name:\s*['"]([^'"]+)['"][\s\S]*?realWorldReference:\s*['"]([^'"]+)['"]/g;
    let match;
    const auditResults = [];

    while ((match = regex.exec(tdContent)) !== null) {
        const clubId = match[1];
        const gameName = match[2];
        const realRef = match[3];

        let riskLevel = 'LOW';
        let recommendation = 'Compliant / Safe';

        // Check if gameName matches realRef exactly
        if (gameName.toLowerCase() === realRef.toLowerCase()) {
            riskLevel = 'HIGH';
            recommendation = `Rename immediately to fictional alias (e.g. ${gameName} FC -> City/Athletic/United alternative)`;
        } else if (gameName.toLowerCase().includes(realRef.toLowerCase()) || realRef.toLowerCase().includes(gameName.toLowerCase())) {
            riskLevel = 'MEDIUM';
            recommendation = `Stylized name is in close proximity to real trademark; keep fictional suffix/color`;
        } else {
            riskLevel = 'LOW';
            recommendation = 'Safe fictional moniker';
        }

        auditResults.push({ clubId, gameName, realRef, riskLevel, recommendation });
    }

    console.log(`Audited ${auditResults.length} clubs.`);
    const highRisk = auditResults.filter(r => r.riskLevel === 'HIGH');
    const medRisk = auditResults.filter(r => r.riskLevel === 'MEDIUM');
    const lowRisk = auditResults.filter(r => r.riskLevel === 'LOW');

    console.log(`Summary: High Risk: ${highRisk.length}, Medium Risk: ${medRisk.length}, Low/Safe: ${lowRisk.length}`);
    
    // Save report to markdown artifact in brain
    let reportMd = `# Furio FC - Kulüp Marka ve Telif Benzerliği Raporu (Trademark Proximity Audit)\n\n`;
    reportMd += `Tarih: Ekim 2026\nToplam Taranan Kulüp Sayısı: ${auditResults.length}\n\n`;
    reportMd += `### Özet Değerlendirme\n`;
    reportMd += `- **Yüksek Risk (Aynı İsim):** ${highRisk.length} kulüp\n`;
    reportMd += `- **Orta Risk (Coğrafi/Yakın Benzerlik):** ${medRisk.length} kulüp\n`;
    reportMd += `- **Düşük Risk / Güvenli (Kurgusal Renk & Takma Ad):** ${lowRisk.length} kulüp\n\n`;
    reportMd += `### Detaylı Kulüp Denetim Tablosu\n\n`;
    reportMd += `| Kulüp ID | Oyundaki İsim | Gerçek Kulüp Referansı | Risk Seviyesi | Öneri / Güvenli Alternatif |\n`;
    reportMd += `|---|---|---|---|---|\n`;

    auditResults.forEach(r => {
        reportMd += `| \`${r.clubId}\` | **${r.gameName}** | ${r.realRef} | **${r.riskLevel}** | ${r.recommendation} |\n`;
    });

    fs.writeFileSync('scratch/TRADEMARK_AUDIT_REPORT.md', reportMd);
    console.log('Trademark audit report saved to scratch/TRADEMARK_AUDIT_REPORT.md');
}

async function run() {
    await generateAndroidAssets();
    auditTrademarks();
}

run().catch(console.error);
