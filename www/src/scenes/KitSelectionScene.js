class KitSelectionScene extends Phaser.Scene {
    constructor() {
        super('KitSelectionScene');
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        // Active Match setup
        this.activeMatch = window.gameState.activeMatch;
        if (!this.activeMatch || !this.activeMatch.homeTeamId) {
            console.error("KitSelectionScene: activeMatch eksik. Kariyer modundan gelinmedi.");
            this.scene.start('CareerWorldScene');
            return;
        }

        this.userIsHome = this.activeMatch.userSide === 'home';
        const homeClub = window.TeamDatabase.getClub(this.activeMatch.homeTeamId);
        const awayClub = window.TeamDatabase.getClub(this.activeMatch.awayTeamId);
        this.userClub = this.userIsHome ? homeClub : awayClub;
        this.oppClub = this.userIsHome ? awayClub : homeClub;

        // Kit logic
        this.userSelectsHomeKit = true;
        this.oppSelectsHomeKit = this.calculateOpponentKit();

        // 1. Backgrounds & Wing Panels
        this.createBackground(homeClub, awayClub);

        // 2. Top Header
        this.createHeader(homeClub, awayClub);

        // 3. Team Panels (Upper Half)
        this.homePanelCtn = this.add.container(0, 0);
        this.awayPanelCtn = this.add.container(0, 0);
        this.renderTeamPanels(homeClub, awayClub);

        // 4. Center Match Details (VS)
        this.createCenterVS();

        const objective = this.activeMatch.objective;
        if (objective) {
            const isTurkish = window.gameState.settings.language === 'tr';
            const cx = this.width / 2;
            this.add.rectangle(cx, 330, 264, 48, 0x0e162b).setStrokeStyle(1, 0x38bdf8, 0.6);
            this.add.text(cx, 320, isTurkish ? 'MAÇ GÖREVİ' : 'MATCH OBJECTIVE', {
                font: '700 11px sans-serif', color: '#7dd3fc'
            }).setOrigin(0.5);
            this.add.text(cx, 339, `${objective.target} · ${objective.label}    +${objective.ez} EZ  +${objective.xp} XP`, {
                font: '700 12px sans-serif', color: '#e2e8f0'
            }).setOrigin(0.5);
        }

        // 5. Lower 4 Modules
        this.createLowerModules(homeClub, awayClub);

        // 6. Footer (Form, Start, Squad)
        this.createFooter(homeClub, awayClub);

        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    calculateOpponentKit() {
        const uColor = this.userSelectsHomeKit ? (this.userClub.primaryColor || 0x000000) : (this.userClub.secondaryColor || 0xffffff);
        const oColorPrimary = this.oppClub.primaryColor || 0xffffff;
        const oColorSecondary = this.oppClub.secondaryColor || 0x000000;
        
        const hexToRgb = (hex) => ({ r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 });
        const uRgb = hexToRgb(uColor);
        const oRgbPri = hexToRgb(oColorPrimary);
        const oRgbSec = hexToRgb(oColorSecondary);
        const dist = (c1, c2) => Math.sqrt(Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2));
        
        const distToPrimary = dist(uRgb, oRgbPri);
        const distToSecondary = dist(uRgb, oRgbSec);
        
        if (distToPrimary < 100 && distToSecondary > distToPrimary) {
            return false;
        }
        return true;
    }

    createBackground(homeClub, awayClub) {
        // Deep dark background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020010, 0x020010, 0x0a0220, 0x0c0326, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Dynamic Wing Glows based on team colors
        const lColor = this.userIsHome ? homeClub.primaryColor : awayClub.primaryColor;
        const rColor = this.userIsHome ? awayClub.primaryColor : homeClub.primaryColor;

        const leftGlow = this.add.graphics();
        leftGlow.fillGradientStyle(lColor, 0x000000, lColor, 0x000000, 0.4, 0, 0.4, 0);
        leftGlow.fillRect(0, 0, this.width / 2, this.height);

        const rightGlow = this.add.graphics();
        rightGlow.fillGradientStyle(0x000000, rColor, 0x000000, rColor, 0, 0.4, 0, 0.4);
        rightGlow.fillRect(this.width / 2, 0, this.width / 2, this.height);

        // Abstract Player Silhouettes (Graphic paths to simulate standing players)
        const drawSilhouette = (x, flip, color) => {
            const g = this.add.graphics();
            g.fillStyle(color, 0.15);
            g.beginPath();
            const sx = flip ? x + 150 : x - 150;
            g.moveTo(sx, this.height); // bottom outer
            g.lineTo(sx, 150); // shoulder outer
            g.lineTo(x, 80);   // head
            g.lineTo(flip ? x - 150 : x + 150, 150); // shoulder inner
            g.lineTo(flip ? x - 100 : x + 100, this.height); // bottom inner
            g.closePath();
            g.fillPath();
            
            // Add some texture lines
            g.lineStyle(1, color, 0.3);
            for(let i=0; i<5; i++) {
                g.moveTo(sx, 200 + i*50);
                g.lineTo(flip ? x-100 : x+100, 220 + i*60);
            }
            g.strokePath();
        };

        drawSilhouette(150, false, lColor);
        drawSilhouette(this.width - 150, true, rColor);

        // Dark overlay for middle clarity
        const midDark = this.add.graphics();
        midDark.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.1, 0.1, 0.8, 0.8);
        midDark.fillRect(this.width/2 - 400, 0, 800, this.height);
    }

    createHeader(homeClub, awayClub) {
        if (!homeClub) homeClub = this.userIsHome ? this.userClub : this.oppClub;
        // Back Button
        const backBg = this.add.graphics();
        backBg.fillStyle(0x4c1d95, 0.9);
        backBg.fillRoundedRect(20, 20, 40, 40, 8);
        const backTxt = this.add.text(40, 40, "❮", { font: '700 20px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        const backHit = this.add.rectangle(40, 40, 40, 40, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, backHit);
        
        backHit.on('pointerdown', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('CareerWorldScene'));
        });

        // League Info
        const leagueKey = homeClub ? (homeClub.leagueId || homeClub.league) : null;
        const homeLeague = leagueKey ? window.TeamDatabase.getLeague(leagueKey) : null;
        const compText = (homeLeague ? homeLeague.name : (this.activeMatch.competition || 'LİG')).toUpperCase();
        const weekNum = this.activeMatch.matchDay || this.activeMatch.week || 1;
        const weekText = this.activeMatch.roundName ? this.activeMatch.roundName : `HAFTA ${weekNum}`;
        
        const compTitle = this.add.text(80, 40, "🏆 " + compText, { font: '900 20px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0, 0.5);
        const sepX = compTitle.x + compTitle.width + 12;
        this.add.text(sepX, 40, "|", { font: '400 24px sans-serif', fill: '#475569' }).setOrigin(0, 0.5);
        this.add.text(sepX + 16, 40, weekText, { font: '700 16px sans-serif', fill: '#38bdf8' }).setOrigin(0, 0.5);

        // Right side resources (EZ, Energy, Settings, Home)
        const rx = this.width - 40;
        
        // Home Button
        const hmBg = this.add.graphics();
        hmBg.fillStyle(0x0a1020, 0.9);
        hmBg.lineStyle(1, 0x38bdf8, 0.5);
        hmBg.fillRoundedRect(rx - 20, 20, 40, 40, 8);
        hmBg.strokeRoundedRect(rx - 20, 20, 40, 40, 8);
        this.add.text(rx, 40, "🏠", { font: '20px sans-serif' }).setOrigin(0.5);

        // Settings Button
        const setBg = this.add.graphics();
        setBg.fillStyle(0x0a1020, 0.9);
        setBg.lineStyle(1, 0x38bdf8, 0.5);
        setBg.fillRoundedRect(rx - 70, 20, 40, 40, 8);
        setBg.strokeRoundedRect(rx - 70, 20, 40, 40, 8);
        this.add.text(rx - 50, 40, "⚙", { font: '24px sans-serif', fill: '#00ffff' }).setOrigin(0.5);

        // Energy
        const currentEnergy = (window.gameState && window.gameState.career && window.gameState.career.energy !== undefined) ? window.gameState.career.energy : 8;
        const enBg = this.add.graphics();
        enBg.fillStyle(0x0a1020, 0.9);
        enBg.lineStyle(1, 0x38bdf8, 0.5);
        enBg.fillRoundedRect(rx - 170, 25, 90, 30, 15);
        enBg.strokeRoundedRect(rx - 170, 25, 90, 30, 15);
        this.add.text(rx - 150, 40, "⚡", { font: '14px sans-serif' }).setOrigin(0.5);
        this.add.text(rx - 125, 40, String(currentEnergy), { font: '700 16px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(rx - 100, 40, "+", { font: '700 18px sans-serif', fill: '#38bdf8' }).setOrigin(0.5);

        // Coins (EZ Balance from single source)
        const currentEz = window.GameStateManager ? window.GameStateManager.getEZ() : ((window.gameState && window.gameState.career && window.gameState.career.ez !== undefined) ? window.gameState.career.ez : 0);
        const ezFormatted = Number(currentEz).toLocaleString('tr-TR');
        const cnBg = this.add.graphics();
        cnBg.fillStyle(0x0a1020, 0.9);
        cnBg.lineStyle(1, 0xfacc15, 0.5);
        cnBg.fillRoundedRect(rx - 280, 25, 100, 30, 15);
        cnBg.strokeRoundedRect(rx - 280, 25, 100, 30, 15);
        this.add.text(rx - 260, 40, "EZ", { font: '800 12px sans-serif', fill: '#facc15' }).setOrigin(0.5);
        this.ezBalanceText = this.add.text(rx - 225, 40, ezFormatted, { font: '700 14px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        this.add.text(rx - 195, 40, "+", { font: '700 18px sans-serif', fill: '#38bdf8' }).setOrigin(0.5);
    }

    renderTeamPanels(homeClub, awayClub) {
        this.homePanelCtn.removeAll(true);
        this.awayPanelCtn.removeAll(true);

        const cx = this.width / 2;
        const yOffset = 180; // Vert center of team panels

        this.drawTeam(this.homePanelCtn, cx - 280, yOffset, homeClub, this.userIsHome);
        this.drawTeam(this.awayPanelCtn, cx + 280, yOffset, awayClub, !this.userIsHome);
    }

    drawTeam(container, x, y, club, isUserClub) {
        // According to mockup: Badge at top, Name below, then Stats table, then Form.
        const isHomeKit = isUserClub ? this.userSelectsHomeKit : this.oppSelectsHomeKit;
        const primaryColor = isHomeKit ? club.primaryColor : club.secondaryColor;
        const secondaryColor = isHomeKit ? club.secondaryColor : club.primaryColor;

        // Big Badge Shield using Unified UIUtils
        let shieldCont;
        if (window.UIUtils && window.UIUtils.drawClubShield) {
            shieldCont = window.UIUtils.drawClubShield(this, x, y - 60, club, 85);
        } else {
            shieldCont = this.add.container(x, y - 60);
            const badgeG = this.add.graphics();
            badgeG.fillStyle(primaryColor, 1);
            badgeG.lineStyle(4, secondaryColor, 1);
            badgeG.strokeCircle(0, 0, 42);
            shieldCont.add(badgeG);
        }
        
        // Team Name
        const nameTxt = this.add.text(x, y + 40, club.name.toUpperCase(), { font: '900 24px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);

        // Stats Box
        const cw = window.gameState && window.gameState.career;
        let pos = "-";
        let form = [];
        let playedCount = 0;
        if (cw && cw.standings && cw.standings[club.id]) {
            const table = (window.CareerManager && window.CareerManager.getSortedTable) ? 
                window.CareerManager.getSortedTable(club.leagueId || club.league) : 
                Object.values(cw.standings);
            
            playedCount = cw.standings[club.id].played || 0;
            const anyMatchPlayed = Array.isArray(table) && table.some(r => (r.played || 0) > 0);
            if (anyMatchPlayed && playedCount > 0) {
                const pIdx = table.findIndex(r => r.clubId === club.id);
                if (pIdx !== -1) pos = (pIdx + 1).toString();
            } else {
                pos = "-";
            }
            form = cw.standings[club.id].form || [];
        }

        const userSquad = (window.CareerManager && window.CareerManager.getOrInitSquad) ? window.CareerManager.getOrInitSquad(club.id) : null;
        const teamPower = isUserClub
            ? (window.GameStateManager ? window.GameStateManager.calculateTeamPower(userSquad || club) : (club.overall || 70))
            : (window.GameStateManager ? window.GameStateManager.calculateTeamPower(club) : (club.overall || 70));

        // Box Bg (transparent dark)
        const statBg = this.add.graphics();
        statBg.fillStyle(0x000000, 0.4);
        statBg.fillRoundedRect(x - 120, y + 70, 240, 110, 12);
        
        // Lig Sırası
        this.add.text(x - 60, y + 85, "LİG SIRASI", { font: '600 11px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        this.add.text(x - 65, y + 115, pos, { font: '900 32px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        if (playedCount > 0) {
            this.add.text(x - 40, y + 110, "▲", { font: '900 14px sans-serif', fill: '#22c55e' }).setOrigin(0.5);
        }

        // Divider
        statBg.lineStyle(1, 0x334155, 0.5);
        statBg.beginPath(); statBg.moveTo(x, y+80); statBg.lineTo(x, y+130); statBg.strokePath();

        // Takım Gücü
        this.add.text(x + 60, y + 85, "TAKIM GÜCÜ", { font: '600 11px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        this.add.text(x + 35, y + 115, teamPower, { font: '900 32px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        
        // Render segmented power bar
        const barG = this.add.graphics();
        const barsToFill = Math.max(1, Math.floor(teamPower / 20));
        for(let i=0; i<5; i++) {
            barG.fillStyle(i < barsToFill ? 0x00ffff : 0x1e293b, 1);
            barG.fillRoundedRect(x + 55 + (i*10), y + 110, 8, 12, 2);
        }

        // Son 5 Maç Form
        this.add.text(x, y + 152, playedCount === 0 ? "HENÜZ MAÇ OYNANMADI" : `SON ${Math.min(5, form.length)} MAÇ`, { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        
        if (form.length > 0) {
            const recentForm = form.slice(-5);
            let fxX = x - ((recentForm.length - 1) * 12);
            const formColors = { 'W': '#22c55e', 'D': '#fbbf24', 'L': '#e11d48' };
            const formLabels = { 'W': 'G', 'D': 'B', 'L': 'M' };
            recentForm.forEach(res => {
                const fg = this.add.graphics();
                fg.fillStyle(parseInt((formColors[res] || '#94a3b8').replace('#', '0x')), 1);
                fg.fillCircle(fxX, y + 172, 10);
                this.add.text(fxX, y + 172, formLabels[res] || 'B', { font: '800 12px sans-serif', fill: '#000000' }).setOrigin(0.5);
                fxX += 24;
            });
        }

        container.add([shieldCont, nameTxt, statBg, barG]);

        // User Player Info Pill (name, position, OVR)
        if (isUserClub) {
            const uPlayer = window.gameState && window.gameState.player;
            const pName = (uPlayer && (uPlayer.displayName || uPlayer.name || uPlayer.username)) || "KAPTAN";
            const pPosRaw = (uPlayer && uPlayer.position) || "ST";
            const pPosTr = window.UIUtils ? window.UIUtils.formatPositionTR(pPosRaw) : pPosRaw;
            const pOvr = (uPlayer && uPlayer.overall) || 75;

            const pBadge = this.add.graphics();
            pBadge.fillStyle(0x061828, 0.9);
            pBadge.fillRoundedRect(x - 110, y + 195, 220, 30, 8);
            pBadge.lineStyle(1.5, 0x00ffff, 0.7);
            pBadge.strokeRoundedRect(x - 110, y + 195, 220, 30, 8);

            const pTxt = this.add.text(x, y + 210, `⭐ ${pName}  |  ${pPosTr}  |  ${pOvr} GEN`, {
                font: '800 11px sans-serif',
                fill: '#ffffff'
            }).setOrigin(0.5);
            container.add([pBadge, pTxt]);
        }
    }

    createCenterVS() {
        const cx = this.width / 2;
        const yOffset = 180;

        // Big VS text
        const vsMain = this.add.text(cx, yOffset - 70, "VS", { font: '900 90px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
        vsMain.setShadow(0, 0, '#d946ef', 25, true, true);

        // Info box
        const infG = this.add.graphics();
        infG.fillStyle(0x040b16, 0.8);
        infG.lineStyle(1, 0x334155, 0.8);
        infG.fillRoundedRect(cx - 85, yOffset - 10, 170, 120, 12);
        infG.strokeRoundedRect(cx - 85, yOffset - 10, 170, 120, 12);

        // League / Competition Info
        const homeClub = this.userIsHome ? this.userClub : this.oppClub;
        const leagueKey = homeClub ? (homeClub.leagueId || homeClub.league) : null;
        const homeLeague = leagueKey ? window.TeamDatabase.getLeague(leagueKey) : null;
        const compText = (homeLeague ? homeLeague.name : (this.activeMatch.competition || 'LİG')).toUpperCase();
        const weekNum = this.activeMatch.matchDay || this.activeMatch.week || 1;
        const weekText = this.activeMatch.roundName ? this.activeMatch.roundName : `HAFTA ${weekNum}`;
        const stadiumName = this.activeMatch.stadium || (homeClub ? `${homeClub.name} Arena` : "Neon Arena");
        const stadiumCap = this.activeMatch.stadiumCapacity || (homeClub ? (homeClub.overall * 650) : 35000);
        const seasonYear = (window.gameState && window.gameState.career && window.gameState.career.season) || 2026;

        this.add.text(cx - 50, yOffset + 15, "🛡️", { font: '20px sans-serif' }).setOrigin(0.5);
        this.add.text(cx - 30, yOffset + 10, compText.length > 14 ? compText.substring(0, 13) + '.' : compText, { font: '700 12px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
        this.add.text(cx - 30, yOffset + 25, weekText, { font: '600 10px sans-serif', fill: '#38bdf8' }).setOrigin(0, 0.5);

        // Date/Time
        this.add.text(cx - 50, yOffset + 55, "📅", { font: '20px sans-serif' }).setOrigin(0.5);
        this.add.text(cx - 30, yOffset + 50, `${Math.min(28, weekNum * 2)} EYL ${seasonYear}`, { font: '700 12px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
        this.add.text(cx - 30, yOffset + 65, "20:00", { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0, 0.5);

        // Stadium
        this.add.text(cx - 50, yOffset + 95, "🏟️", { font: '20px sans-serif' }).setOrigin(0.5);
        this.add.text(cx - 30, yOffset + 90, stadiumName.length > 15 ? stadiumName.substring(0, 14) + '.' : stadiumName, { font: '700 12px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
        this.add.text(cx - 30, yOffset + 105, `Kap: ${stadiumCap.toLocaleString()}`, { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0, 0.5);
    }

    createLowerModules(homeClub, awayClub) {
        const panelY = 380;
        const g = this.add.graphics();
        
        const drawMod = (x, y, w, h) => {
            g.fillStyle(0x020713, 0.85);
            g.fillRoundedRect(x, y, w, h, 8);
            g.lineStyle(1, 0x1e293b, 1);
            g.strokeRoundedRect(x, y, w, h, 8);
        };

        const w1 = 280, w2 = 250, w3 = 250, w4 = 280;
        const totalW = w1 + w2 + w3 + w4 + 30; // 3 gaps of 10
        let startX = (this.width - totalW) / 2;
        const h = 90;

        // Mod 1: Önemli Oyuncu
        drawMod(startX, panelY, w1, h);
        g.lineStyle(2, 0xfacc15, 1);
        g.strokeRoundedRect(startX, panelY, w1, h, 8); // Gold border
        const oppNameStr = this.oppClub ? (this.oppClub.shortName || this.oppClub.name).toUpperCase() : 'RAKİP';
        this.add.text(startX + 15, panelY + 15, `⭐ ÖNEMLİ OYUNCU (${oppNameStr})`, { font: '700 12px sans-serif', fill: '#facc15' });
        
        const pPic = this.add.graphics();
        pPic.fillStyle(0x1e293b, 1);
        pPic.fillRoundedRect(startX + 15, panelY + 35, 40, 40, 4);
        
        const impPlayer = window.TeamDatabase.getImportantPlayer(this.oppClub ? this.oppClub.id : null);
        const oppPosTr = window.UIUtils ? window.UIUtils.formatPositionTR(impPlayer.position) : impPlayer.position;
        const roleTr = (impPlayer.role === 'Star Player' || !impPlayer.role) ? 'Yıldız Oyuncu' : impPlayer.role;
        this.add.text(startX + 70, panelY + 45, impPlayer.name, { font: '800 16px sans-serif', fill: '#ffffff' });
        this.add.text(startX + 70, panelY + 65, `${oppPosTr} | ${impPlayer.overall} OVR - ${roleTr}`, { font: '600 11px sans-serif', fill: '#94a3b8' });

        startX += w1 + 10;

        // Mod 2: Maçın Önemi
        drawMod(startX, panelY, w2, h);
        const compName = this.activeMatch.competition ? this.activeMatch.competition.toUpperCase() : "LİG MAÇI";
        this.add.text(startX + 15, panelY + 15, "🏆 MAÇIN ÖNEMİ", { font: '700 12px sans-serif', fill: '#94a3b8' });
        this.add.text(startX + 15, panelY + 45, compName.length > 15 ? compName.substring(0, 14) + '.' : compName, { font: '900 18px sans-serif', fill: '#facc15' });
        this.add.text(startX + 15, panelY + 70, "Puan ve sıralama için kritik karşılaşma.", { font: '600 11px sans-serif', fill: '#94a3b8' });
        
        startX += w2 + 10;

        // Mod 3: Rakip Formu
        drawMod(startX, panelY, w3, h);
        this.add.text(startX + 15, panelY + 15, "📊 RAKİP FORMU", { font: '700 12px sans-serif', fill: '#94a3b8' });
        
        const cw = window.gameState && window.gameState.career;
        let oppForm = [];
        const oppId = this.oppClub ? this.oppClub.id : null;

        if (cw && cw.standings && oppId && cw.standings[oppId]) {
            oppForm = cw.standings[oppId].form || [];
        }

        const allCompletedOppMatches = [
            ...(cw && cw.leagueFixtures ? cw.leagueFixtures : []).filter(m => m && m.completed && (m.home === oppId || m.away === oppId)),
            ...(cw && cw.fixtures ? cw.fixtures : []).filter(m => m && m.completed && (m.home === oppId || m.away === oppId))
        ];

        // Deduplicate
        const seenOppMatches = new Set();
        const uniqueOppMatches = allCompletedOppMatches.filter(m => {
            const key = m.id || `${m.round}_${m.home}_${m.away}`;
            if (seenOppMatches.has(key)) return false;
            seenOppMatches.add(key);
            return true;
        });

        if (oppForm.length === 0 && uniqueOppMatches.length === 0) {
            this.add.text(startX + 15, panelY + 42, "HENÜZ MAÇ OYNANMADI", { font: '800 12px sans-serif', fill: '#64748b' });
            this.add.text(startX + 15, panelY + 68, "Bu sezon henüz resmi maç oynanmadı.", { font: '600 11px sans-serif', fill: '#94a3b8' });
        } else {
            const recentOppForm = oppForm.length > 0 ? oppForm.slice(-5) : uniqueOppMatches.slice(-5).map(m => {
                const isH = m.home === oppId;
                const pG = isH ? m.homeScore : m.awayScore;
                const oG = isH ? m.awayScore : m.homeScore;
                return pG > oG ? 'W' : (pG < oG ? 'L' : 'D');
            });

            let wins = 0, draws = 0, losses = 0;
            recentOppForm.forEach(res => {
                if (res === 'W') wins++;
                else if (res === 'D') draws++;
                else if (res === 'L') losses++;
            });

            let ofX = startX + 25;
            const formLabels = { 'W': 'G', 'D': 'B', 'L': 'M' };
            const formColors = { 'W': '#22c55e', 'D': '#fbbf24', 'L': '#e11d48' };
            recentOppForm.forEach(res => {
                const fg = this.add.graphics();
                fg.fillStyle(parseInt((formColors[res] || '#94a3b8').replace('#', '0x')), 1);
                fg.fillCircle(ofX, panelY + 45, 11);
                this.add.text(ofX, panelY + 45, formLabels[res] || 'B', { font: '800 11px sans-serif', fill: '#000000' }).setOrigin(0.5);
                ofX += 26;
            });
            this.add.text(startX + 15, panelY + 70, `Son ${recentOppForm.length} maç: ${wins}G ${draws}B ${losses}M`, { font: '600 11px sans-serif', fill: '#94a3b8' });
        }

        startX += w3 + 10;

        // Mod 4: Karşı Karşıya (Head to Head)
        drawMod(startX, panelY, w4, h);
        this.add.text(startX + 15, panelY + 15, "⚔️ KARŞI KARŞIYA", { font: '700 12px sans-serif', fill: '#94a3b8' });
        
        let uWins = 0, dNum = 0, oWins = 0;
        let totalH2HMatches = 0;
        if (cw) {
            const hId = this.userClub ? this.userClub.id : null;
            const oId = this.oppClub ? this.oppClub.id : null;
            const allFixtures = [
                ...(cw.leagueFixtures || []),
                ...(cw.fixtures || [])
            ];
            const seenH2H = new Set();
            allFixtures.forEach(f => {
                if (f && f.completed && ((f.home === hId && f.away === oId) || (f.home === oId && f.away === hId))) {
                    const key = f.id || `${f.round}_${f.home}_${f.away}`;
                    if (seenH2H.has(key)) return;
                    seenH2H.add(key);

                    totalH2HMatches++;
                    const hScore = f.home === hId ? f.homeScore : f.awayScore;
                    const oScore = f.home === hId ? f.awayScore : f.homeScore;
                    if (hScore > oScore) uWins++;
                    else if (hScore < oScore) oWins++;
                    else dNum++;
                }
            });
        }

        if (totalH2HMatches === 0) {
            this.add.text(startX + 15, panelY + 42, "DAHA ÖNCE KARŞILAŞMA OYNANMADI", { font: '800 11px sans-serif', fill: '#64748b' });
            this.add.text(startX + 15, panelY + 68, "İki takım ilk kez karşı karşıya geliyor.", { font: '600 11px sans-serif', fill: '#94a3b8' });
        } else {
            this.add.text(startX + 50, panelY + 50, uWins.toString(), { font: '900 24px sans-serif', fill: '#22c55e' }).setOrigin(0.5);
            this.add.text(startX + 50, panelY + 75, "Galibiyet", { font: '600 11px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);

            this.add.text(startX + 140, panelY + 50, dNum.toString(), { font: '900 24px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
            this.add.text(startX + 140, panelY + 75, "Beraberlik", { font: '600 11px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);

            this.add.text(startX + 230, panelY + 50, oWins.toString(), { font: '900 24px sans-serif', fill: '#ef4444' }).setOrigin(0.5);
            this.add.text(startX + 230, panelY + 75, "Galibiyet", { font: '600 11px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        }
    }

    createFooter(homeClub, awayClub) {
        const panelY = 500;
        const g = this.add.graphics();
        
        // Left: Takım Formu (Line Graph)
        const leftW = 350;
        g.fillStyle(0x020713, 0.85);
        g.fillRoundedRect(50, panelY, leftW, 70, 8);
        g.lineStyle(1, 0x1e293b, 1);
        g.strokeRoundedRect(50, panelY, leftW, 70, 8);

        const cw = window.gameState && window.gameState.career;
        let userForm = [];
        if (cw && cw.standings && this.userClub && cw.standings[this.userClub.id]) {
            userForm = cw.standings[this.userClub.id].form || [];
        }

        if (userForm.length === 0) {
            this.add.text(65, panelY + 25, "TAKIMIN FORMU", { font: '700 11px sans-serif', fill: '#94a3b8' });
            this.add.text(65, panelY + 45, "Henüz maç oynanmadı", { font: '600 11px sans-serif', fill: '#64748b' });
        } else {
            let uW = 0, uD = 0, uL = 0;
            const recentUserForm = userForm.slice(-5);
            recentUserForm.forEach(res => {
                if (res === 'W') uW++;
                else if (res === 'D') uD++;
                else if (res === 'L') uL++;
            });

            this.add.text(65, panelY + 25, "TAKIMIN FORMU", { font: '700 11px sans-serif', fill: '#94a3b8' });
            this.add.text(65, panelY + 45, `Son ${recentUserForm.length} maç: ${uW}G ${uD}B ${uL}M`, { font: '600 10px sans-serif', fill: '#38bdf8' });

            // Mini line graph
            const pointsCount = recentUserForm.length;
            const startGraphX = 200;
            const graphWidth = 120;
            const stepX = pointsCount > 1 ? graphWidth / (pointsCount - 1) : 0;
            const yMap = { 'W': 20, 'D': 45, 'L': 60 };

            g.lineStyle(2, 0x22c55e, 1);
            g.beginPath();
            
            const graphPts = recentUserForm.map((res, idx) => {
                const px = startGraphX + (idx * stepX);
                const py = yMap[res] || 45;
                return [px, py];
            });

            if (graphPts.length === 1) {
                g.moveTo(startGraphX - 10, graphPts[0][1] + panelY);
                g.lineTo(startGraphX + 10, graphPts[0][1] + panelY);
            } else {
                g.moveTo(graphPts[0][0], graphPts[0][1] + panelY);
                for (let i = 1; i < graphPts.length; i++) {
                    g.lineTo(graphPts[i][0], graphPts[i][1] + panelY);
                }
            }
            g.strokePath();
            
            graphPts.forEach((p, idx) => {
                const res = recentUserForm[idx];
                g.fillStyle(0x0a1020, 1);
                g.fillCircle(p[0], p[1] + panelY, 5);
                g.fillStyle(res === 'L' ? 0xef4444 : (res === 'D' ? 0xfbbf24 : 0x22c55e), 1);
                g.fillCircle(p[0], p[1] + panelY, 3);
            });
        }

        // Center: MAÇA BAŞLA
        const btnW = 380, btnH = 70;
        const cx = this.width / 2;
        
        const btnGraphics = this.add.graphics();
        btnGraphics.fillStyle(0xd900ff, 1); // Neon magenta
        btnGraphics.fillRoundedRect(cx - btnW/2, panelY, btnW, btnH, 35);
        btnGraphics.fillStyle(0x8a00a1, 1);
        btnGraphics.fillRoundedRect(cx - btnW/2 + 4, panelY + 4, btnW - 8, btnH - 8, 31);
        
        const btnText = this.add.text(cx, panelY + 35, "⚽ MAÇA BAŞLA", { font: '900 24px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        const rightArr = this.add.text(cx + btnW/2 - 30, panelY + 35, "❯", { font: '900 24px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

        const hitArea = this.add.rectangle(cx, panelY + 35, btnW, btnH, 0, 0).setInteractive({useHandCursor: true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);

        let matchStarting = false;
        hitArea.on('pointerdown', () => {
            if (matchStarting) return;
            matchStarting = true;
            hitArea.disableInteractive();
            if (window.audioManager) window.audioManager.playSFX('button_click');
            
            this.tweens.add({
                targets: [btnGraphics, btnText, rightArr],
                scale: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.cameras.main.fadeOut(400);
                    this.time.delayedCall(450, () => {
                        const uPri = (this.userSelectsHomeKit ? this.userClub.primaryColor : this.userClub.secondaryColor) || 0xe11d48;
                        const uSec = (this.userSelectsHomeKit ? this.userClub.secondaryColor : this.userClub.primaryColor) || 0xffffff;
                        const oPri = (this.oppSelectsHomeKit ? this.oppClub.primaryColor : this.oppClub.secondaryColor) || 0x2563eb;
                        const oSec = (this.oppSelectsHomeKit ? this.oppClub.secondaryColor : this.oppClub.primaryColor) || 0x000000;

                        this.activeMatch.userKit = { primary: uPri, secondary: uSec };
                        this.activeMatch.opponentKit = { primary: oPri, secondary: oSec };
                        
                        window.gameState.teamColors = {
                            home: this.userIsHome ? this.activeMatch.userKit : this.activeMatch.opponentKit,
                            away: this.userIsHome ? this.activeMatch.opponentKit : this.activeMatch.userKit
                        };

                        this.scene.start('GameScene');
                    });
                }
            });
        });

        // Pulsing glow for start button
        this.tweens.add({
            targets: [btnText, rightArr],
            scale: 1.05,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Right: Takım Kadrosu (Used as Forma toggle for now)
        const rw = 350;
        const rx = this.width - rw - 50;
        g.fillStyle(0x020713, 0.85);
        g.fillRoundedRect(rx, panelY, rw, 70, 8);
        g.lineStyle(1, 0x1e293b, 1);
        g.strokeRoundedRect(rx, panelY, rw, 70, 8);

        this.add.text(rx + 30, panelY + 35, "👕", { font: '24px sans-serif' }).setOrigin(0.5);
        this.add.text(rx + 60, panelY + 25, "FORMA DEĞİŞTİR", { font: '700 12px sans-serif', fill: '#ffffff' });
        this.add.text(rx + 60, panelY + 45, "Oyuncu formalarını ayarla", { font: '600 10px sans-serif', fill: '#94a3b8' });
        this.add.text(rx + rw - 30, panelY + 35, "❯", { font: '700 16px sans-serif', fill: '#38bdf8' }).setOrigin(0.5);

        const rHit = this.add.rectangle(rx + rw/2, panelY + 35, rw, 70, 0, 0).setInteractive({useHandCursor:true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, rHit);
        
        rHit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.oppSelectsHomeKit = !this.oppSelectsHomeKit;
            this.renderTeamPanels(homeClub, awayClub);
        });
    }
}
