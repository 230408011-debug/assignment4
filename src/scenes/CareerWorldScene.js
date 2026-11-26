/**
 * CareerWorldScene.js - Furio FC Career World Hub
 * Premium two-column dashboard: Season, Fixtures, League Table, Cups, Transfers, Trophies
 * Cyberpunk glassmorphism UI inspired by console-quality career modes
 */

class CareerWorldScene extends Phaser.Scene {
    constructor() {
        super('CareerWorldScene');
    }

    init(data) {
        this.isNavigating = false;
        this.activeTab = (data && data.tab) ? data.tab : 'season';
        this.tabs = ['season', 'fixtures', 'table', 'cups', 'transfers', 'squad'];
        this.tabLabels = {
            season: 'SEZON', fixtures: 'FİKSTÜR', table: 'LİG TABLOSU',
            cups: 'KUPALAR', transfers: 'TRANSFERLER', squad: 'KADRO', offers: 'KONTRAT TEKLİFLERİ', profile: 'PROFİL'
        };
        this.contentContainer = null;
        this.scrollContainer = null;
        this.scrollMask = null;
    }

    create() {
        this.events.once('shutdown', this.shutdown, this);
        this.W = this.cameras.main.width;
        this.H = this.cameras.main.height;

        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        // 1. load save & 2. migrate save
        if (window.SaveManager) {
            window.SaveManager.load();
        }

        // 3. normalize gameState
        if (!window.GameStateManager) {
            window.GameStateManager = {
                getCareerData: () => (window.gameState ? window.gameState.career : { started: false })
            };
        }
        if (window.gameState) {
            if (!window.gameState.player) window.gameState.player = {};
            if (!window.gameState.player.attributes) {
                window.gameState.player.attributes = { speed: 50, shooting: 50, passing: 50, physical: 50, dribbling: 50, stamina: 50 };
            }
            const attrs = window.gameState.player.attributes;
            ['speed', 'shooting', 'passing', 'physical', 'dribbling', 'stamina'].forEach(k => {
                if (typeof attrs[k] !== 'number' || attrs[k] < 50) attrs[k] = 50;
                if (attrs[k] > 100) attrs[k] = 100;
            });
            if (window.GameStateManager.calculateOverall) {
                window.GameStateManager.calculateOverall();
            }
        }

        // 4. validateAndRepairCareerState()
        let repaired = false;
        if (window.CareerManager && typeof window.CareerManager.validateAndRepairCareerState === 'function') {
            repaired = window.CareerManager.validateAndRepairCareerState();
        }

        // 5. save repaired state if changed
        if (repaired && window.SaveManager) {
            window.SaveManager.save();
        }

        let cw = (window.GameStateManager && window.GameStateManager.getCareerData()) || (window.gameState && window.gameState.career) || { started: false };

        // Mandatory Gate: Check if player has accepted their first contract offer
        if (!cw.started || !cw.currentClubId) {
            this.activeTab = 'offers';
        } else if (this.activeTab === 'offers') {
            this.activeTab = 'season'; // Never show offers if career started
        }

        this.cw = cw;
        const db = window.TeamDatabase;
        const activeClubId = this.cw.currentClubId || 'basic_1';

        // Ensure club object is populated
        if (activeClubId && (!this.cw.currentClub || typeof this.cw.currentClub === 'string')) {
            if (db && db.getClub) this.cw.currentClub = db.getClub(activeClubId);
        }
        
        this.season = this.cw; // For legacy references

        // Ensure critical season data structures exist to prevent crashes
        if (!this.season.leagueFixtures) this.season.leagueFixtures = [];
        if (!this.season.fixtures) this.season.fixtures = [];
        if (!this.season.standings) this.season.standings = {};
        if (!this.season.seasonStats) this.season.seasonStats = { goals: 0, assists: 0, matchesPlayed: 0, wins: 0, draws: 0, losses: 0, avgRating: 0, totalRating: 0, cleanSheets: 0, motmCount: 0 };
        if (!this.season.nationalCup) this.season.nationalCup = null;

        this.club = (db && db.getClub && db.getClub(activeClubId)) || (db && db.clubs && db.clubs[0]) || {
            id: 'basic_1', name: 'Lions FC', shortName: 'LIO', primaryColor: 0x00ffff, secondaryColor: 0xffffff, tier: 'BASIC', strength: 60, prestige: 30
        };
        this.league = (db && db.getLeague && db.getLeague(this.club.leagueId || this.club.league)) || {
            name: 'Türkiye Ligi', id: 'turkiye'
        };

        // Layout constants
        this.PAD = 16;
        this.HEADER_H = 48;
        this.TAB_H = 40;
        this.TOP_Y = this.HEADER_H + this.TAB_H + this.PAD + 8;
        this.LEFT_W = Math.floor(this.W * 0.63);
        this.RIGHT_X = this.LEFT_W + this.PAD;
        this.RIGHT_W = this.W - this.RIGHT_X - this.PAD;

        this._acceptingContract = false; // Prevent double clicks on contract accept

        try {
            this.createBackground();
            this.createHeader();
            this.createTabBar();
            this.contentContainer = this.add.container(0, 0);
            this.renderTab(this.activeTab);
        } catch (e) {
            console.error('CareerWorldScene create() error:', e);
            // Show error overlay so the user doesn't see a bare black screen
            this.add.text(this.W / 2, this.H / 2, 'Kariyer verisi yüklenemedi.\nAna menüye dönmek için tıklayın.', {
                font: '700 16px sans-serif', fill: '#ef4444', align: 'center'
            }).setOrigin(0.5);
            this.input.once('pointerdown', () => this.scene.start('MenuScene'));
        }

        this.cameras.main.fadeIn(400);
    }

    // ===== BACKGROUND =====
    createBackground() {
        const g = this.add.graphics();
        g.fillGradientStyle(0x020010, 0x020010, 0x08021a, 0x0a0325, 1);
        g.fillRect(0, 0, this.W, this.H);

        // Subtle grid overlay
        const grid = this.add.graphics().setAlpha(0.03);
        grid.lineStyle(1, 0x00ffff);
        for (let x = 0; x < this.W; x += 50) grid.lineBetween(x, 0, x, this.H);
        for (let y = 0; y < this.H; y += 50) grid.lineBetween(0, y, this.W, y);

        // Ambient glow points
        const glowG = this.add.graphics();
        glowG.fillStyle(0xd946ef, 0.05);
        glowG.fillCircle(0, this.H, 400);
        glowG.fillStyle(0x00ffff, 0.05);
        glowG.fillCircle(this.W, 0, 400);

        // Ambient particles
        if (this.textures.exists('particle')) {
            const particles = this.add.particles(0, 0, 'particle', {
                x: { min: 0, max: this.W },
                y: { min: this.H, max: this.H + 100 },
                lifespan: { min: 4000, max: 8000 },
                speedY: { min: -10, max: -30 },
                speedX: { min: -5, max: 5 },
                scale: { start: 0.15, end: 0 },
                alpha: { start: 0.2, end: 0 },
                tint: [0x00ffff, 0xd946ef, 0x38bdf8],
                blendMode: 'ADD',
                frequency: 150
            });
        }

        // Neon accent lines top & bottom
        const neon = this.add.graphics();
        neon.lineStyle(2, 0xd946ef, 0.15);
        neon.lineBetween(0, 0, this.W, 0);
        neon.lineStyle(1, 0x00ffff, 0.2);
        neon.lineBetween(0, this.H - 1, this.W, this.H - 1);

        // Corner accents
        const c = this.add.graphics();
        c.lineStyle(2, 0xd946ef, 0.15);
        c.beginPath(); c.moveTo(22, 4); c.lineTo(4, 4); c.lineTo(4, 22); c.strokePath();
        c.beginPath(); c.moveTo(this.W - 22, 4); c.lineTo(this.W - 4, 4); c.lineTo(this.W - 4, 22); c.strokePath();
        c.beginPath(); c.moveTo(22, this.H - 4); c.lineTo(4, this.H - 4); c.lineTo(4, this.H - 22); c.strokePath();
        c.beginPath(); c.moveTo(this.W - 22, this.H - 4); c.lineTo(this.W - 4, this.H - 4); c.lineTo(this.W - 4, this.H - 22); c.strokePath();
    }

    createHeader() {
        const hg = this.add.graphics();
        hg.fillStyle(0x050012, 0.92);
        hg.fillRect(0, 0, this.W, this.HEADER_H);
        hg.lineStyle(1, 0x1e293b, 0.6);
        hg.lineBetween(0, this.HEADER_H, this.W, this.HEADER_H);

        // Dynamic back button
        this.updateBackButton();

        // Title (center)
        this.headerTitle = this.add.text(this.W / 2, 20, 'KARİYER MERKEZİ', {
            font: '700 23px sans-serif', fill: '#ffffff', letterSpacing: 3
        }).setOrigin(0.5);
        this.headerTitle.setShadow(0, 0, '#00ffff', 15, true, true);

        this.headerSubtitle = this.add.text(this.W / 2, 42, '', {
            font: '700 9.5px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5).setVisible(false);

        // EZ & Star Badges
        this.updateHeaderBadges();
    }

    updateHeaderBadges() {
        if (this.headerBadgesContainer) {
            this.headerBadgesContainer.destroy();
        }
        this.headerBadgesContainer = this.add.container(0, 0);

        const rx = this.W - this.PAD;

        // Star badge (rightmost)
        const starBg = this.add.graphics();
        starBg.fillStyle(0x02000c, 0.9);
        starBg.fillRoundedRect(rx - 32, 8, 32, 32, 6);
        starBg.lineStyle(1.5, 0xd946ef, 0.15);
        starBg.strokeRoundedRect(rx - 32, 8, 32, 32, 6);
        const starText = this.add.text(rx - 16, 24, '⭐', { font: '14px Arial' }).setOrigin(0.5);

        // EZ badge (left of star badge)
        const ezBg = this.add.graphics();
        ezBg.fillStyle(0x02000c, 0.9);
        ezBg.fillRoundedRect(rx - 152, 8, 110, 32, 6);
        ezBg.lineStyle(1.5, 0xfbbf24, 0.8);
        ezBg.strokeRoundedRect(rx - 152, 8, 110, 32, 6);
        
        const ezText = this.add.text(rx - 142, 24, '💰', { font: '13px Arial' }).setOrigin(0, 0.5);
        const formattedEz = (window.gameState.career.ez || 0).toLocaleString('tr-TR');
        const ezValText = this.add.text(rx - 122, 24, `${formattedEz} EZ`, {
            font: '900 11.5px sans-serif', fill: '#fbbf24'
        }).setOrigin(0, 0.5);

        // Cust badge (left of EZ badge)
        const custBg = this.add.graphics();
        custBg.fillStyle(0x02000c, 0.9);
        custBg.fillRoundedRect(rx - 192, 8, 32, 32, 6);
        custBg.lineStyle(1.5, 0x06b6d4, 0.8);
        custBg.strokeRoundedRect(rx - 192, 8, 32, 32, 6);
        const custText = this.add.text(rx - 176, 24, '👕', { font: '14px Arial' }).setOrigin(0.5);
        const custHit = this.add.rectangle(rx - 176, 24, 32, 32, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, custHit);
        
        custHit.on('pointerdown', () => {
            if (this.isNavigating) return;
            this.isNavigating = true;
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('CustomizationScene', { parentScene: 'CareerWorldScene' });
            });
        });

        this.headerBadgesContainer.add([custBg, custText, custHit, ezBg, ezText, ezValText, starBg, starText]);
    }

    // ===== TAB BAR =====
    createTabBar() {
        if (this.tabBarContainer) {
            this.tabBarContainer.destroy();
        }
        this.tabBarContainer = this.add.container(0, 0).setDepth(100);

        const tabY = this.HEADER_H + 4;
        const totalW = this.W - this.PAD * 2;
        const tabW = totalW / this.tabs.length;

        this.tabs.forEach((tab, i) => {
            const x = this.PAD + i * tabW;
            const isActive = tab === this.activeTab;

            const bg = this.add.graphics();
            if (isActive) {
                bg.fillStyle(0xd946ef, 0.15);
                bg.fillRoundedRect(x + 2, tabY + 2, tabW - 4, this.TAB_H - 2, 6);
                bg.fillStyle(0xd946ef, 0.15);
                bg.fillRoundedRect(x + 2, tabY + 2, tabW - 4, this.TAB_H - 4, 6);
                bg.fillStyle(0xffffff, 0.15);
                bg.fillRoundedRect(x + 2, tabY + 2, tabW - 4, (this.TAB_H - 4)/2, {tl: 6, tr: 6, bl: 0, br: 0});
            }

            const label = this.add.text(x + tabW / 2, tabY + this.TAB_H / 2, this.tabLabels[tab], {
                font: `${isActive ? '900' : '700'} 11px sans-serif`,
                fill: isActive ? '#ffffff' : '#64748b'
            }).setOrigin(0.5);

            const hit = this.add.rectangle(x + tabW / 2, tabY + this.TAB_H / 2, tabW - 4, this.TAB_H - 4, 0, 0)
                .setInteractive({ useHandCursor: true });

            hit.on('pointerover', () => { if (!isActive) label.setFill('#cbd5e1'); });
            hit.on('pointerout', () => { if (!isActive) label.setFill('#64748b'); });
            hit.on('pointerdown', () => {
                if (this.activeTab === tab) return;
                if (!this.cw.started && tab !== 'offers') {
                    this.showToast("⚠️ Kariyerine başlamak için bir kulüp teklifini kabul etmelisin!");
                    return;
                }
                this.activeTab = tab;
                this.createTabBar();
                this.renderTab(this.activeTab);
            });

            this.tabBarContainer.add([bg, label, hit]);
        });

        // Bottom line
        const line = this.add.graphics();
        line.lineStyle(1, 0x1e293b, 0.6);
        line.lineBetween(this.PAD, tabY + this.TAB_H, this.W - this.PAD, tabY + this.TAB_H);
        this.tabBarContainer.add(line);
    }

    renderTab(tab) {
        if (this.contentContainer) this.contentContainer.removeAll(true);
        
        const isGelisim = tab === 'gelisim';
        if (this.tabBarContainer) {
            this.tabBarContainer.setVisible(!isGelisim);
        }

        if (this.headerTitle) {
            if (isGelisim) {
                this.headerTitle.setText('GELİŞİM MERKEZİ').setY(18);
                if (this.headerSubtitle) {
                    this.headerSubtitle.setText('Oyuncunu geliştir, potansiyelini ortaya çıkar.').setVisible(true);
                }
            } else {
                this.headerTitle.setText('KARİYER MERKEZİ').setY(24);
                if (this.headerSubtitle) {
                    this.headerSubtitle.setVisible(false);
                }
            }
        }
        
        this.updateHeaderBadges();

        switch (tab) {
            case 'season': this.renderSeasonTab(); break;
            case 'table': this.renderTableTab(); break;
            case 'fixtures': this.renderFixturesTab(); break;
            case 'cups': this.renderCupsTab(); break;
            case 'transfers': this.renderTransfersTab(); break;
            case 'offers': this.renderFirstContractOffersTab(); break;
            case 'squad': this.renderSquadTab(); break;
            case 'profile': this.renderProfileTab(); break;
            case 'gelisim': this.renderGelisimTab(); break;
        }
        this.updateBackButton();
    }

    updateBackButton() {
        if (this.backContainer) {
            this.backContainer.destroy();
        }
        this.backContainer = this.add.container(0, 0);
        this.backContainer.setDepth(1000); // 1. Fix: Ensure it is always on top
        
        const isGelisim = this.activeTab === 'gelisim';
        const btnText = isGelisim ? '◀  KARİYER MERKEZİNE DÖN' : '◀  ANA MENÜ';
        const btnWidth = isGelisim ? 180 : 100;
        
        const backBg = this.add.graphics();
        backBg.lineStyle(1.5, 0x334155, 0.8);
        backBg.strokeRoundedRect(this.PAD, 20, btnWidth, 32, 6);
        backBg.fillStyle(0x020814, 0.8); // 2. Fix: Add slight dark background to make text readable and hit area solid
        backBg.fillRoundedRect(this.PAD, 20, btnWidth, 32, 6);
        
        const backText = this.add.text(this.PAD + btnWidth / 2, 36, btnText, {
            font: '800 11px sans-serif', fill: '#cbd5e1'
        }).setOrigin(0.5);
        
        const backHit = this.add.rectangle(this.PAD + btnWidth / 2, 36, btnWidth, 40, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, backHit);
        
        backHit.on('pointerover', () => { 
            backText.setFill('#00ffff'); 
            backBg.clear(); 
            backBg.fillStyle(0x0a1a2a, 0.9);
            backBg.fillRoundedRect(this.PAD, 20, btnWidth, 32, 6);
            backBg.lineStyle(1.5, 0x00ffff, 0.15); 
            backBg.strokeRoundedRect(this.PAD, 20, btnWidth, 32, 6); 
        });
        backHit.on('pointerout', () => { 
            backText.setFill('#cbd5e1'); 
            backBg.clear(); 
            backBg.fillStyle(0x020814, 0.8);
            backBg.fillRoundedRect(this.PAD, 20, btnWidth, 32, 6);
            backBg.lineStyle(1.5, 0x334155, 0.8); 
            backBg.strokeRoundedRect(this.PAD, 20, btnWidth, 32, 6); 
        });
        
        backHit.on('pointerdown', () => {
            if(this.isNavigating) return; this.isNavigating = true;
            if (window.audioManager) window.audioManager.playSFX('button_click');
            if (isGelisim) {
                this.time.delayedCall(10, () => {
                    this.activeTab = 'season';
                    this.createTabBar();
                    this.renderTab('season');
                    this.time.delayedCall(100, () => { this.isNavigating = false; }); // Delay reset to prevent double clicks
                });
            } else {
                if (window.SaveManager) window.SaveManager.save();
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    this.scene.start('MenuScene');
                    this.isNavigating = false;
                });
            }
        });
        
        this.backContainer.add([backBg, backText, backHit]);
    }

    // =====================================================================
    // HELPER: Draw a glassmorphism panel
    // =====================================================================
    drawPanel(g, x, y, w, h, opts = {}) {
        const { fill = 0x0a0520, alpha = 0.75, stroke = 0x1e293b, strokeAlpha = 0.5, radius = 10 } = opts;
        // Drop shadow
        g.fillStyle(0x000000, 0.5);
        g.fillRoundedRect(x + 4, y + 6, w, h, radius);
        
        // Main panel
        g.fillStyle(fill, alpha);
        g.fillRoundedRect(x, y, w, h, radius);
        
        // Top highlight for 3D bevel effect
        g.lineStyle(1.5, 0xffffff, 0.1);
        g.beginPath();
        g.moveTo(x + radius, y);
        g.lineTo(x + w - radius, y);
        g.strokePath();

        // Stroke
        g.lineStyle(1, stroke, strokeAlpha);
        g.strokeRoundedRect(x, y, w, h, radius);
    }

    // =====================================================================
    // HELPER: Draw a horizontal progress bar
    // =====================================================================
    drawBar(g, x, y, w, h, progress, color = 0x00ffff, bgColor = 0x1e293b) {
        // Glow layer
        g.fillStyle(color, 0.3);
        const fillW = Math.max(h, w * Math.min(1, progress));
        g.fillRoundedRect(x, y + 2, fillW, h, h / 2);

        // Background
        g.fillStyle(bgColor, 0.6);
        g.fillRoundedRect(x, y, w, h, h / 2);
        
        // Fill
        g.fillStyle(color, 1);
        g.fillRoundedRect(x, y, fillW, h, h / 2);
        
        // Top highlight
        g.fillStyle(0xffffff, 0.4);
        g.fillRoundedRect(x + 2, y + 1, fillW - 4, h / 3, h / 4);
    }

    // =====================================================================
    // SEASON TAB
    // =====================================================================
    renderSeasonTab() {
        this.renderSeasonTabNew();
    }

    // ===== CLUB INFO CARD (top-left) =====
    renderClubInfoCard(c, x, y, w) {
        const g = this.add.graphics();
        // Premium background with subtle glow
        this.drawPanel(g, x, y, w, 125, { stroke: 0x38bdf8, strokeAlpha: 0.6, fill: 0x050212 });
        g.fillStyle(this.club.primaryColor, 0.05);
        g.fillRoundedRect(x, y, w, 125, 8);
        c.add(g);

        // Ambient team color glow
        const glowG = this.add.graphics();
        glowG.fillStyle(this.club.primaryColor, 0.25);
        glowG.fillCircle(x + 60, y + 62, 50);
        c.add(glowG);

        // Club badge
        const badgeX = x + 60, badgeY = y + 62;
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0x0a0a2a, 0.95);
        badgeBg.fillCircle(badgeX, badgeY, 40);
        badgeBg.lineStyle(2, this.club.primaryColor, 0.9);
        badgeBg.strokeCircle(badgeX, badgeY, 40);
        c.add(badgeBg);
        c.add(this.add.circle(badgeX, badgeY, 30, this.club.primaryColor, 0.8).setStrokeStyle(3, this.club.secondaryColor || 0xffffff, 0.8));
        c.add(this.add.text(badgeX, badgeY, this.club.shortName ? this.club.shortName.substring(0,2) : '⚽', { font: '700 25px sans-serif', fill: '#ffffff' }).setOrigin(0.5));

        // Details
        const infoX = x + 125;
        const clubNameStr = (this.club && this.club.name && this.club.name !== 'undefined') ? this.club.name.toUpperCase() : 'KULÜP';
        c.add(this.add.text(infoX, y + 24, clubNameStr, {
            font: '700 23px sans-serif', fill: '#ffffff', letterSpacing: 1.5
        }));
        
        const leagueNameStr = (this.league && this.league.name && this.league.name !== 'undefined') ? this.league.name.toUpperCase() : 'LİG';
        const leagueFlag = (this.league && this.league.flag) || (window.TeamDatabase && window.TeamDatabase.getLeagueFlag && window.TeamDatabase.getLeagueFlag(this.league ? this.league.id : null)) || '🇹🇷';
        c.add(this.add.text(infoX, y + 48, `${leagueFlag} ${leagueNameStr}  |  SEZON ${this.cw.currentSeason || 1}`, {
            font: '800 12px sans-serif', fill: '#38bdf8', letterSpacing: 1
        }));

        const objText = (this.season.objectives && this.season.objectives.length > 0 && this.season.objectives[0].text)
            ? this.season.objectives[0].text : 'İlk 3\'e gir';
        
        const objBg = this.add.graphics();
        objBg.fillStyle(0x1e293b, 0.7);
        objBg.fillRoundedRect(infoX, y + 72, 220, 28, 6);
        objBg.lineStyle(1, 0x38bdf8, 0.3);
        objBg.strokeRoundedRect(infoX, y + 72, 220, 28, 6);
        c.add(objBg);
        
        const safeObjText = objText ? String(objText).toUpperCase() : 'HEDEF';
        c.add(this.add.text(infoX + 12, y + 86, `🎯 HEDEF: ${safeObjText}`, {
            font: '800 11px sans-serif', fill: '#f8fafc'
        }).setOrigin(0, 0.5));

        // Club status badge (right side)
        const statusX = x + w - 130;
        const statusY = y + 15;
        const statusBg = this.add.graphics();
        statusBg.fillStyle(0x020010, 0.8);
        statusBg.fillRoundedRect(statusX, statusY, 115, 95, 8);
        statusBg.lineStyle(1, 0x334155, 0.9);
        statusBg.strokeRoundedRect(statusX, statusY, 115, 95, 8);
        c.add(statusBg);

        const rep = window.gameState.player.stats.reputation || 50;
        let statusLabel = 'ÇAYLAK';
        let statusColor = '#64748b';
        if (rep >= 80) { statusLabel = 'DÜNYA YILDIZI'; statusColor = '#ef4444'; }
        else if (rep >= 60) { statusLabel = 'EFSANE'; statusColor = '#fbbf24'; }
        else if (rep >= 40) { statusLabel = 'YILDIZ'; statusColor = '#a855f7'; }
        else if (rep >= 25) { statusLabel = 'YÜKSELEN'; statusColor = '#22c55e'; }
        else if (rep >= 10) { statusLabel = 'GELİŞEN'; statusColor = '#38bdf8'; }

        c.add(this.add.text(statusX + 57, statusY + 16, 'KULÜP STATÜSÜ', {
            font: '800 9px sans-serif', fill: '#64748b', letterSpacing: 1
        }).setOrigin(0.5));
        
        c.add(this.add.text(statusX + 57, statusY + 40, statusLabel, {
            font: '700 15px sans-serif', fill: statusColor, letterSpacing: 1.2
        }).setOrigin(0.5).setShadow(0, 0, statusColor, 6, true, true));

        // Segmented Progress bar for Fan Support
        const barY = statusY + 62;
        const barW = 95;
        const segments = 10;
        const segW = (barW - (segments - 1) * 2) / segments;
        const filledSegs = Math.floor((rep / 100) * segments);
        const hexColor = Phaser.Display.Color.HexStringToColor(statusColor.replace('#', '0x')).color;
        
        for (let i = 0; i < segments; i++) {
            const segBg = this.add.graphics();
            if (i < filledSegs) {
                segBg.fillStyle(hexColor, 1);
                segBg.fillRoundedRect(statusX + 10 + i * (segW + 2), barY, segW, 8, 2);
            } else {
                segBg.fillStyle(0x334155, 0.4);
                segBg.fillRoundedRect(statusX + 10 + i * (segW + 2), barY, segW, 8, 2);
            }
            c.add(segBg);
        }

        c.add(this.add.text(statusX + 57, statusY + 82, `${rep}/100 TARAFTAR GÜCÜ`, {
            font: '800 9px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5));
    }

    // ===== UPCOMING MATCHES LIST =====
    renderUpcomingMatches(c, x, y, w) {
        const g = this.add.graphics();
        const listH = this.H - y - 160;
        this.drawPanel(g, x, y, w, listH, { stroke: 0x1e293b, strokeAlpha: 0.6, fill: 0x03010a });
        c.add(g);

        // Header
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x0f0a20, 0.8);
        headerBg.fillRoundedRect(x + 2, y + 2, w - 4, 30, { tl: 8, tr: 8, bl: 0, br: 0 });
        c.add(headerBg);
        
        c.add(this.add.text(x + 16, y + 10, 'FİKSTÜR ÖZETİ', {
            font: '700 13px sans-serif', fill: '#d946ef', letterSpacing: 2
        }));

        const validSchedule = (this.season.fixtures || []).filter(m => m && m.id);
        
        if (validSchedule.length === 0) {
            c.add(this.add.text(x + w / 2, y + 60, 'Henüz fikstür oluşturulmadı.', {
                font: '700 13px sans-serif', fill: '#64748b'
            }).setOrigin(0.5));
            return;
        }

        // Find first unplayed index
        const firstUnplayedIdx = validSchedule.findIndex(m => !m.completed);
        let startIdx = Math.max(0, firstUnplayedIdx - 1);
        const maxVisible = 3; 
        if (startIdx + maxVisible > validSchedule.length) startIdx = Math.max(0, validSchedule.length - maxVisible);
        const visibleMatches = validSchedule.slice(startIdx, startIdx + maxVisible);

        let currentY = y + 40;

        visibleMatches.forEach((match, i) => {
            const isPlayed = match.completed;
            const isNext = !isPlayed && validSchedule.indexOf(match) === firstUnplayedIdx;
            const entryH = 85; 
            const my = currentY;
            currentY += entryH + 6; 

            const opponent = match.home === this.cw.currentClubId ? match.away : match.home;
            const oppClub = window.TeamDatabase.getClub(opponent) || window.TeamDatabase.clubs[0]; // Safe fallback
            const isHome = match.home === this.cw.currentClubId;
            const numColor = match.type === 'national_cup' ? 0xef4444 : (match.type === 'champions_cup' ? 0xfbbf24 : 0x3b82f6);

            // Row background
            const rowG = this.add.graphics();
            if (isNext) {
                rowG.fillStyle(0x1a0540, 0.95);
                rowG.fillRoundedRect(x + 8, my, w - 16, entryH, 8);
                rowG.lineStyle(2, 0xd946ef, 0.15);
                rowG.strokeRoundedRect(x + 8, my, w - 16, entryH, 8);
                
                // Glow effect for the next match
                rowG.fillStyle(0xd946ef, 0.15);
                rowG.fillRoundedRect(x + 8, my, w - 16, entryH, 8);
            } else {
                rowG.fillStyle(0x0a031a, isPlayed ? 0.4 : 0.7);
                rowG.fillRoundedRect(x + 8, my, w - 16, entryH, 6);
                rowG.lineStyle(1, 0x1e293b, 0.6);
                rowG.strokeRoundedRect(x + 8, my, w - 16, entryH, 6);
            }
            c.add(rowG);

            // Left accent bar
            const accentG = this.add.graphics();
            accentG.fillStyle(numColor, isNext ? 1 : 0.4);
            accentG.fillRoundedRect(x + 8, my + 8, 4, entryH - 16, 2);
            c.add(accentG);

            // Opponent badge
            const badgeX = x + 35;
            if (oppClub) {
                const bG = this.add.graphics();
                bG.fillStyle(oppClub.primaryColor || 0xffffff, isPlayed ? 0.3 : 0.95);
                bG.fillCircle(badgeX, my + entryH / 2, 16);
                bG.lineStyle(2, oppClub.secondaryColor || 0x000000, isPlayed ? 0.2 : 0.8);
                bG.strokeCircle(badgeX, my + entryH / 2, 16);
                c.add(bG);
                
                const shortLabel = (oppClub.shortName && oppClub.shortName !== 'undefined') ? oppClub.shortName.charAt(0) : 'R';
                c.add(this.add.text(badgeX, my + entryH / 2, shortLabel, {
                    font: '700 15px sans-serif', fill: '#ffffff'
                }).setOrigin(0.5).setAlpha(isPlayed ? 0.4 : 1));
            }

            // Text Info
            const infoX = x + 65;
            const weekText = match.type === 'league' ? `LİG HAFTASI ${match.week}` : (match.competition || 'KUPA').toUpperCase();
            c.add(this.add.text(infoX, my + 14, weekText, {
                font: '700 11px sans-serif', fill: isPlayed ? '#475569' : Phaser.Display.Color.IntegerToColor(numColor).rgba, letterSpacing: 1
            }));
            
            // Matchup Text (VS or @)
            const vsText = isHome ? 'VS' : '@';
            const vsColor = isHome ? '#38bdf8' : '#fbbf24';
            c.add(this.add.text(infoX, my + 32, vsText, { font: '700 15px sans-serif', fill: isPlayed ? '#475569' : vsColor }));
            
            const clubNameStr = oppClub ? oppClub.name.toUpperCase() : 'BİLİNMEYEN TAKIM';
            c.add(this.add.text(infoX + 26, my + 30, clubNameStr, {
                font: '700 19px sans-serif', fill: isPlayed ? '#64748b' : '#ffffff', letterSpacing: 0.5
            }));
            
            const diff = (oppClub && typeof oppClub.difficulty === 'number') ? oppClub.difficulty : 3;
            c.add(this.add.text(infoX, my + 56, `Zorluk: ${'⭐'.repeat(Math.min(5, Math.max(1, Math.ceil(diff / 2))))}`, {
                font: '700 11px sans-serif', fill: isPlayed ? '#475569' : '#94a3b8'
            }));
            
            // Rewards (Shown for all cards now)
            const rewX = x + 180;
            const ezReward = match.type === 'national_cup' ? 300 : 250;
            const xpReward = match.type === 'national_cup' ? 200 : 150;
            const rewG = this.add.graphics();
            rewG.fillStyle(0x000000, 0.5);
            rewG.fillRoundedRect(rewX, my + 52, 110, 22, 4);
            rewG.lineStyle(1, 0x334155, isPlayed ? 0.3 : 0.8);
            rewG.strokeRoundedRect(rewX, my + 52, 110, 22, 4);
            c.add(rewG);
            c.add(this.add.text(rewX + 8, my + 63, `💰 ${ezReward}  |  ⭐ ${xpReward}`, {
                font: '700 11px sans-serif', fill: isPlayed ? '#475569' : '#fbbf24'
            }).setOrigin(0, 0.5));

            // Action button (BAŞLA / Result / Locked)
            const btnX = x + w - 105;
            const btnY = my + (entryH / 2) - 18;
            const btnW = 85;
            const btnH = 36;

            if (isPlayed && match.homeScore !== undefined && match.awayScore !== undefined) {
                const pg = isHome ? match.homeScore : match.awayScore;
                const og = isHome ? match.awayScore : match.homeScore;
                const resultColor = pg > og ? '#22c55e' : (pg < og ? '#ef4444' : '#fbbf24');
                const resultBg = this.add.graphics();
                resultBg.fillStyle(Phaser.Display.Color.HexStringToColor(resultColor.replace('#', '0x')).color, 0.15);
                resultBg.fillRoundedRect(btnX + 10, btnY, btnW - 20, btnH, 6);
                c.add(resultBg);
                c.add(this.add.text(btnX + btnW / 2, btnY + btnH / 2, `${pg} - ${og}`, {
                    font: '700 19px sans-serif', fill: resultColor
                }).setOrigin(0.5));
            } else if (isNext) {
                const btnBg = this.add.graphics();
                btnBg.fillStyle(0xd946ef, 1);
                btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                // Inner highlight
                btnBg.fillStyle(0xffffff, 0.2);
                btnBg.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 4);
                c.add(btnBg);
                
                const btnLabel = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'OYNA ▶', {
                    font: '700 16px sans-serif', fill: '#ffffff'
                }).setOrigin(0.5);
                c.add(btnLabel);

                const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
                    .setInteractive({ useHandCursor: true });
                c.add(btnHit);

                btnHit.on('pointerover', () => {
                    btnBg.clear(); btnBg.fillStyle(0x00ffff, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                    btnLabel.setFill('#000000');
                });
                btnHit.on('pointerout', () => {
                    btnBg.clear(); btnBg.fillStyle(0xd946ef, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                    btnBg.fillStyle(0xffffff, 0.2); btnBg.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 4);
                    btnLabel.setFill('#ffffff');
                });
                btnHit.on('pointerdown', () => this.startMatch(match, opponent, isHome));

                this.tweens.add({ targets: btnBg, alpha: 0.85, duration: 800, yoyo: true, repeat: -1 });
            } else {
                c.add(this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'KİLİTLİ', {
                    font: '800 11px sans-serif', fill: '#475569'
                }).setOrigin(0.5));
            }
        });
    }

    getClubStadium(club) {
        if (!club) return 'Şehir Stadyumu';
        if (club.stadium && club.stadium !== 'undefined') return club.stadium;
        if (club.name) return `${club.name} Arena`;
        return 'Şehir Stadyumu';
    }

    startMatch(match, opponent, isHome) {
        if (this.isNavigating) return;
        this.isNavigating = true;
        
        if (!match) {
            console.error("startMatch: match is undefined! Using fallback.");
            match = { competition: 'league', competitionShort: 'LIG', type: 'league', roundName: null };
        }

        const userClubId = this.cw.currentClubId;
        const opponentClubId = opponent || 'c2';
        
        const homeTeamId = isHome ? userClubId : opponentClubId;
        const awayTeamId = isHome ? opponentClubId : userClubId;
        const homeClub = window.TeamDatabase.getClub(homeTeamId);
        const stadiumName = this.getClubStadium(homeClub);

        const activeLeagueId = this.cw.currentLeagueId || (this.club && (this.club.league || this.club.leagueId)) || (this.season && this.season.currentLeagueId) || 'switzerland';
        const activeLeagueObj = window.TeamDatabase.getLeague(activeLeagueId);
        const activeLeagueName = activeLeagueObj ? activeLeagueObj.name : 'Super League';
        const compName = (match && match.competition && match.competition !== 'league') ? match.competition : activeLeagueName;

        const cWeek = (this.season && this.season.currentWeek) || (this.cw && this.cw.currentWeek) || 1;
        window.gameState.activeMatch = {
            matchId: `match_${cWeek}_${userClubId}_${opponentClubId}`,
            homeTeamId: homeTeamId,
            awayTeamId: awayTeamId,
            userClubId: userClubId,
            opponentClubId: opponentClubId,
            league: activeLeagueId,
            stadium: stadiumName,
            week: (match && (match.week || match.round)) ? (match.week || match.round) : cWeek,
            duration: 90,
            userSide: isHome ? 'home' : 'away',
            isHome: isHome,
            fixtureId: match.id,
            objective: window.EconomyConfig.getMatchObjective(match, this.cw.currentSeason, window.gameState.settings.language),
            scheduleIndex: (this.season && this.season.fixtures) ? this.season.fixtures.indexOf(match) : 0,
            competition: compName,
            competitionShort: match.competitionShort || (activeLeagueObj ? activeLeagueObj.shortName : 'LIG'),
            type: match.type || 'league',
            roundName: match.roundName || null
        };

        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.tweens.killAll();
            this.scene.start('KitSelectionScene');
        });
    }

    // ===== BOTTOM ROW (League Pos, Cups, Results) =====
    renderBottomRow(c, x, y, w) {
        const colW = Math.floor((w - 16) / 3);
        const h = 138;

        // --- LİG DURUMU ---
        const lg = this.add.graphics();
        this.drawPanel(lg, x, y, colW, h, { stroke: 0x38bdf8, strokeAlpha: 0.6, fill: 0x010814 });
        c.add(lg);

        c.add(this.add.text(x + 12, y + 10, 'LİG DURUMU', {
            font: '700 13px sans-serif', fill: '#38bdf8', letterSpacing: 1
        }));

        const engine = window.CareerManager;
        const currentClubId = this.cw.currentClubId || (this.cw.currentClub && this.cw.currentClub.id);
        const leagueId = (this.cw.currentClub && (this.cw.currentClub.leagueId || this.cw.currentClub.league)) || this.cw.currentLeagueId;
        const table = engine ? engine.getSortedTable(leagueId) : [];
        const anyMatchPlayed = Array.isArray(table) && table.some(t => (t.played || 0) > 0);
        const myRow = table.find(t => t.clubId === currentClubId);
        const myPos = (anyMatchPlayed && myRow && myRow.played > 0) ? (table.findIndex(t => t.clubId === currentClubId) + 1) : '-';
        const totalTeams = table.length || 10;

        // Giant Position Number
        const posStr = myPos === '-' ? '-' : `${myPos}.`;
        c.add(this.add.text(x + 16, y + 42, posStr, {
            font: '700 49px sans-serif', fill: '#ffffff'
        }).setShadow(0, 0, '#38bdf8', 12, true, true));
        c.add(this.add.text(x + 72, y + 62, `/ ${totalTeams}`, {
            font: '800 16px sans-serif', fill: '#64748b'
        }));

        // Mini stat grid
        if (myRow) {
            const gridX = x + colW - 80;
            const gy = y + 26;
            const pBg = this.add.graphics();
            
            [0, 24, 48].forEach((oy) => {
                pBg.fillStyle(0x0f172a, 0.7);
                pBg.fillRoundedRect(gridX, gy + oy, 70, 22, 4);
                pBg.lineStyle(1, 0x1e293b, 0.5);
                pBg.strokeRoundedRect(gridX, gy + oy, 70, 22, 4);
            });
            c.add(pBg);
            
            const txtStyle = { font: '700 9px sans-serif', fill: '#cbd5e1' };
            const valStyle = { font: '700 13px sans-serif', fill: '#ffffff' };
            c.add(this.add.text(gridX + 6, gy + 11, 'PUAN', txtStyle).setOrigin(0, 0.5));
            c.add(this.add.text(gridX + 64, gy + 11, `${myRow.points}`, valStyle).setOrigin(1, 0.5));
            c.add(this.add.text(gridX + 6, gy + 35, 'GALİB.', txtStyle).setOrigin(0, 0.5));
            c.add(this.add.text(gridX + 64, gy + 35, `${myRow.wins}`, valStyle).setOrigin(1, 0.5));
            c.add(this.add.text(gridX + 6, gy + 59, 'AVERAJ', txtStyle).setOrigin(0, 0.5));
            c.add(this.add.text(gridX + 64, gy + 59, `${myRow.goalDifference > 0 ? '+' : ''}${myRow.goalDifference}`, valStyle).setOrigin(1, 0.5));
        }

        // DETAYLAR button
        this.addTabBtn(c, x, y, colW, h, 'TABLOYU GÖR', 'table', 0x38bdf8);

        // --- KUPALAR ---
        const cupX = x + colW + 8;
        const cg = this.add.graphics();
        this.drawPanel(cg, cupX, y, colW, h, { stroke: 0xfbbf24, strokeAlpha: 0.6, fill: 0x100801 });
        c.add(cg);

        c.add(this.add.text(cupX + 12, y + 10, 'KUPA YOLU', {
            font: '700 13px sans-serif', fill: '#fbbf24', letterSpacing: 1
        }));

        // Cup statuses
        const cupItems = [
            { name: 'ULUSAL KUPA', icon: '🏆', status: this.getCupStatus('national_cup') },
            { name: 'LİG KUPASI', icon: '🏅', status: 'Son 16' }
        ];
        if (this.season.championsCup) {
            cupItems[1] = { name: 'ŞAMPİYONLAR', icon: '⭐', status: 'Grup A' }; // Override for better premium feel
        }

        cupItems.slice(0, 2).forEach((cup, i) => {
            const cy = y + 34 + i * 38;
            const cBg = this.add.graphics();
            cBg.fillStyle(0x0a0500, 0.5);
            cBg.fillRoundedRect(cupX + 10, cy, colW - 20, 34, 6);
            cBg.lineStyle(1, 0xfbbf24, 0.2);
            cBg.strokeRoundedRect(cupX + 10, cy, colW - 20, 34, 6);
            c.add(cBg);
            
            c.add(this.add.text(cupX + 22, cy + 17, cup.icon, { font: '16px Arial' }).setOrigin(0.5));
            c.add(this.add.text(cupX + 38, cy + 10, cup.name, { font: '700 12px sans-serif', fill: '#ffffff', letterSpacing: 0.5 }));
            c.add(this.add.text(cupX + 38, cy + 24, cup.status, { font: '800 10px sans-serif', fill: '#fbbf24' }));
        });

        this.addTabBtn(c, cupX, y, colW, h, 'KUPALARA GİT', 'cups', 0xfbbf24);

        // --- FORM (SONUÇLAR) ---
        const resX = cupX + colW + 8;
        const rg = this.add.graphics();
        this.drawPanel(rg, resX, y, colW, h, { stroke: 0x22c55e, strokeAlpha: 0.6, fill: 0x010a04 });
        c.add(rg);

        c.add(this.add.text(resX + 12, y + 10, 'SON FORM', {
            font: '700 13px sans-serif', fill: '#22c55e', letterSpacing: 1
        }));

        // Last 5 results
        const played = (this.season.fixtures || []).filter(m => m && m.completed && (m.home === this.cw.currentClubId || m.away === this.cw.currentClubId));
        const recentResults = played.slice(-5);
        const resultW = Math.floor((colW - 20) / 5);

        for(let i=0; i<5; i++) {
            const rx = resX + 10 + i * resultW;
            const ry = y + 34;
            const m = recentResults[i];
            
            const rBg = this.add.graphics();
            if (!m) {
                rBg.fillStyle(0x0f172a, 0.5);
                rBg.fillRoundedRect(rx + 2, ry, resultW - 4, 60, 6);
                rBg.lineStyle(1, 0x1e293b, 0.6);
                rBg.strokeRoundedRect(rx + 2, ry, resultW - 4, 60, 6);
                c.add(rBg);
                c.add(this.add.text(rx + resultW/2, ry + 30, '-', { font: '800 14px sans-serif', fill: '#475569' }).setOrigin(0.5));
                continue;
            }
            
            const r = m.result;
            const isH = m.home === this.cw.currentClubId;
            const pg = isH ? r.homeGoals : r.awayGoals;
            const og = isH ? r.awayGoals : r.homeGoals;
            const isWin = pg > og;
            const isDraw = pg === og;
            const col = isWin ? '#22c55e' : (isDraw ? '#fbbf24' : '#ef4444');
            const colHex = isWin ? 0x22c55e : (isDraw ? 0xfbbf24 : 0xef4444);
            const label = isWin ? 'G' : (isDraw ? 'B' : 'M');
            
            rBg.fillStyle(colHex, 0.15);
            rBg.fillRoundedRect(rx + 2, ry, resultW - 4, 60, 6);
            rBg.lineStyle(2, colHex, 0.7);
            rBg.strokeRoundedRect(rx + 2, ry, resultW - 4, 60, 6);
            c.add(rBg);
            
            c.add(this.add.text(rx + resultW/2, ry + 16, label, { font: '700 17px sans-serif', fill: col }).setOrigin(0.5).setShadow(0, 0, col, 4, true, true));
            c.add(this.add.text(rx + resultW/2, ry + 35, `${pg}-${og}`, { font: '700 13px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
            
            const oppId = isH ? m.away : m.home;
            const oppClub = window.TeamDatabase.getClub(oppId);
            if(oppClub) {
                const sName = oppClub.shortName ? oppClub.shortName.substring(0,3).toUpperCase() : (oppClub.name || 'RAK').substring(0,3).toUpperCase();
                c.add(this.add.text(rx + resultW/2, ry + 50, sName, { font: '800 9px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
            }
        }

        this.addTabBtn(c, resX, y, colW, h, 'FİKSTÜRE GİT', 'fixtures', 0x22c55e);
    }
    
    addTabBtn(c, x, y, colW, h, text, tab, hoverColorHex) {
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x1e293b, 0.6);
        btnBg.fillRoundedRect(x + 10, y + h - 32, colW - 20, 24, 6);
        c.add(btnBg);
        const btnText = this.add.text(x + colW / 2, y + h - 20, text, {
            font: '700 11px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5);
        c.add(btnText);
        const hit = this.add.rectangle(x + colW / 2, y + h - 20, colW - 20, 24, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
        c.add(hit);
        hit.on('pointerdown', () => { this.activeTab = tab; this.createTabBar(); this.renderTab(this.activeTab); });
        hit.on('pointerover', () => {
            btnBg.clear(); btnBg.fillStyle(hoverColorHex, 0.2); btnBg.fillRoundedRect(x + 10, y + h - 32, colW - 20, 24, 6);
            btnBg.lineStyle(1, hoverColorHex, 0.8); btnBg.strokeRoundedRect(x + 10, y + h - 32, colW - 20, 24, 6);
            btnText.setFill(Phaser.Display.Color.IntegerToColor(hoverColorHex).rgba);
        });
        hit.on('pointerout', () => {
            btnBg.clear(); btnBg.fillStyle(0x1e293b, 0.6); btnBg.fillRoundedRect(x + 10, y + h - 32, colW - 20, 24, 6);
            btnText.setFill('#94a3b8');
        });
    }

    getCupStatus(cupType) {
        let cup = null;
        if (!cupType || cupType === 'national_cup' || cupType === 'domestic') {
            cup = (this.season.cups && this.season.cups[this.cw.currentLeagueId]) || this.season.nationalCup;
        } else if (this.season.cups && this.season.cups[cupType]) {
            cup = this.season.cups[cupType];
        }
        if (!cup) return '—';
        if (cup.eliminated) return 'Elendi';
        if (cup.winner) return cup.winner === this.cw.currentClubId ? '🏆 Kazandı!' : 'Bitti';
        if (cup.rounds) {
            for (let i = 0; i < cup.rounds.length; i++) {
                const r = cup.rounds[i];
                if (r.matches) {
                    const playerMatch = r.matches.find(m => m.home === this.cw.currentClubId || m.away === this.cw.currentClubId);
                    if (playerMatch && !playerMatch.played) return r.name;
                }
            }
        }
        return 'Devam Ediyor';
    }

    // ===== RIGHT COLUMN: PLAYER PANEL =====
    renderPlayerPanel(c, x, y, w) {
        const panelH = this.H - y - this.PAD;
        const g = this.add.graphics();
        // Richer background for Player Panel
        this.drawPanel(g, x, y, w, panelH, { stroke: 0xd946ef, strokeAlpha: 0.6, fill: 0x070114 });
        g.fillStyle(0xd946ef, 0.03);
        g.fillRoundedRect(x, y, w, panelH, 8);
        c.add(g);

        // Title
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0xd946ef, 0.1);
        headerBg.fillRoundedRect(x + 2, y + 2, w - 4, 34, { tl: 8, tr: 8, bl: 0, br: 0 });
        c.add(headerBg);
        
        c.add(this.add.text(x + w / 2, y + 19, 'OYUNCU PROFİLİ', {
            font: '700 14px sans-serif', fill: '#d946ef', letterSpacing: 2
        }).setOrigin(0.5));

        // Player avatar placeholder (circle with colors)
        const avatarX = x + 55;
        const avatarY = y + 80;
        
        c.add(this.add.circle(avatarX, avatarY, 42, 0x00ffff, 0.15)); // Glow
        
        const avBg = this.add.graphics();
        avBg.fillStyle(0x0c1030, 0.95);
        avBg.fillCircle(avatarX, avatarY, 36);
        avBg.lineStyle(2, 0x00ffff, 0.15);
        avBg.strokeCircle(avatarX, avatarY, 36);
        c.add(avBg);
        c.add(this.add.text(avatarX, avatarY, '🧑‍🎤', { font: '32px Arial' }).setOrigin(0.5));

        // Player name
        const nameX = x + 110;
        const playerName = window.gameState.player.name || window.gameState.player.username || 'Oyuncu';
        c.add(this.add.text(nameX, y + 50, playerName.toUpperCase(), {
            font: '700 21px sans-serif', fill: '#ffffff', letterSpacing: 1.5
        }));
        c.add(this.add.text(nameX, y + 74, `FORVET  |  ${this.club.name.toUpperCase()}`, {
            font: '800 10px sans-serif', fill: '#00ffff', letterSpacing: 1
        }));

        // Level / XP bar
        const level = window.gameState.player.level || 1;
        const xp = window.gameState.player.xp || 0;
        const xpNext = level * 500;
        c.add(this.add.text(nameX, y + 94, `SEVİYE ${level}`, {
            font: '700 12px sans-serif', fill: '#38bdf8'
        }));
        const xpG = this.add.graphics();
        this.drawBar(xpG, nameX + 65, y + 96, w - 175 - 65, 8, xp / xpNext, 0x38bdf8, 0x1e293b);
        c.add(xpG);
        c.add(this.add.text(nameX + 65 + w - 175 - 60, y + 94, `${xp}/${xpNext} XP`, {
            font: '800 10px sans-serif', fill: '#94a3b8'
        }).setOrigin(1, 0));

        // GEN rating badge (top-right)
        const genX = x + w - 55;
        const genY = y + 70;
        const genBg = this.add.graphics();
        genBg.fillStyle(0x0a1a10, 0.8);
        genBg.fillRoundedRect(genX - 30, genY - 26, 60, 60, 8);
        genBg.lineStyle(2, 0x22c55e, 0.8);
        genBg.strokeRoundedRect(genX - 30, genY - 26, 60, 60, 8);
        c.add(genBg);
        
        c.add(this.add.text(genX, genY - 14, 'GEN', {
            font: '700 12px sans-serif', fill: '#22c55e'
        }).setOrigin(0.5));

        // Use unified player overall
        const genVal = window.gameState.player.overall || 50;
        c.add(this.add.text(genX, genY + 12, `${genVal}`, {
            font: '700 33px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5).setShadow(0, 0, '#22c55e', 10, true, true));

        // === SEASON STATS ===
        let sy = y + 135;
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x1e293b, 0.8);
        divG.lineBetween(x + 20, sy, x + w - 20, sy);
        c.add(divG);

        sy += 14;
        c.add(this.add.text(x + w / 2, sy, 'SEZON İSTATİSTİKLERİ', {
            font: '700 12px sans-serif', fill: '#00ffff', letterSpacing: 1.5
        }).setOrigin(0.5));

        sy += 26;
        const stats = this.season.seasonStats || { goals: 0, assists: 0, matchesPlayed: 0, totalRating: 0 };
        const progress = { played: (window.gameState.career.currentWeek - 1) || 0 };
        const avgRating = stats.matchesPlayed > 0 ? (stats.totalRating / stats.matchesPlayed).toFixed(1) : '—';
        const statCols = [
            { label: 'MAÇ', value: progress.played || 0 },
            { label: 'GOL', value: stats.goals || 0 },
            { label: 'ASİST', value: stats.assists || 0 },
            { label: 'ORT. PUAN', value: avgRating }
        ];
        const statColW = (w - 24) / statCols.length;
        
        // Stat grid background
        const statGridBg = this.add.graphics();
        statGridBg.fillStyle(0x0c0620, 0.5);
        statGridBg.fillRoundedRect(x + 12, sy - 14, w - 24, 55, 8);
        c.add(statGridBg);

        statCols.forEach((s, i) => {
            const sx = x + 12 + i * statColW + statColW / 2;
            c.add(this.add.text(sx, sy, `${s.value}`, {
                font: '700 25px sans-serif', fill: '#ffffff'
            }).setOrigin(0.5));
            c.add(this.add.text(sx, sy + 22, s.label, {
                font: '800 10px sans-serif', fill: '#94a3b8'
            }).setOrigin(0.5));
            
            // Separators
            if (i < statCols.length - 1) {
                const sep = this.add.graphics();
                sep.lineStyle(1, 0x1e293b, 0.6);
                sep.lineBetween(x + 12 + (i + 1) * statColW, sy - 6, x + 12 + (i + 1) * statColW, sy + 20);
                c.add(sep);
            }
        });

        // === ATTRIBUTES (NİTELİKLER) ===
        sy += 65;
        const divG2 = this.add.graphics();
        divG2.lineStyle(1, 0x1e293b, 0.8);
        divG2.lineBetween(x + 20, sy, x + w - 20, sy);
        c.add(divG2);

        sy += 8;
        c.add(this.add.text(x + w / 2, sy, 'NİTELİKLER', {
            font: '700 12px sans-serif', fill: '#fbbf24', letterSpacing: 1.5
        }).setOrigin(0.5));

        sy += 20;
        const attrs = [
            { label: 'Hız', value: ps.speed, color: 0x3b82f6 },
            { label: 'Şut', value: ps.shooting, color: 0xef4444 },
            { label: 'Dribling', value: ps.dribbling, color: 0x22c55e },
            { label: 'Pas', value: ps.passing, color: 0x06b6d4 },
            { label: 'Fizik', value: ps.physical, color: 0xa855f7 },
            { label: 'Dayanıklılık', value: ps.stamina, color: 0xf59e0b }
        ];

        const halfW = (w - 32) / 2;
        attrs.forEach((attr, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const ax = x + 16 + col * (halfW + 8);
            const ay = sy + row * 26;
            const statVal = attr.value;
            const barW = halfW - 65;

            // Attribute background
            const attrBg = this.add.graphics();
            attrBg.fillStyle(0x0f172a, 0.4);
            attrBg.fillRoundedRect(ax - 4, ay - 11, halfW + 4, 22, 4);
            c.add(attrBg);

            c.add(this.add.text(ax, ay, `⚡`, { font: '9px Arial' }).setOrigin(0, 0.5));
            c.add(this.add.text(ax + 14, ay, attr.label, {
                font: '800 10px sans-serif', fill: '#cbd5e1'
            }).setOrigin(0, 0.5));

            // Bar
            const attrG = this.add.graphics();
            this.drawBar(attrG, ax + halfW - barW - 30, ay - 3, barW, 6, statVal / 99, attr.color, 0x1e293b);
            c.add(attrG);

            // Value
            c.add(this.add.text(ax + halfW - 4, ay, `${statVal}`, {
                font: '700 12px sans-serif', fill: '#ffffff'
            }).setOrigin(1, 0.5));
        });

        // No mini transfer offers here, keep it clean for RPG stats
    }

    // =====================================================================
    // LEAGUE TABLE TAB
    // =====================================================================
    renderTableTab() {
        if (!this.season.standings || Object.keys(this.season.standings).length === 0) {
            this.showToast('⚠️ Lig tablosu henüz oluşturulmadı.');
            return;
        }
        const c = this.contentContainer;
        const y0 = this.TOP_Y;
        const w = this.W - this.PAD * 2;
        const x = this.PAD;

        const bg = this.add.graphics();
        this.drawPanel(bg, x, y0, w, this.H - y0 - this.PAD, { stroke: 0x38bdf8, strokeAlpha: 0.6, fill: 0x010814 });
        bg.fillStyle(0x38bdf8, 0.03);
        bg.fillRoundedRect(x, y0, w, this.H - y0 - this.PAD, 8);
        c.add(bg);

        // Header Title
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x061120, 0.8);
        headerBg.fillRoundedRect(x + 2, y0 + 2, w - 4, 38, { tl: 8, tr: 8, bl: 0, br: 0 });
        c.add(headerBg);

        const leagueNameStr = (this.league && this.league.name && this.league.name !== 'undefined') 
            ? this.league.name : ((this.season.leagueName && this.season.leagueName !== 'undefined') ? this.season.leagueName : 'LİG');
            
        c.add(this.add.text(x + w / 2, y0 + 21, `🏆 ${leagueNameStr.toUpperCase()}`, {
            font: '700 17px sans-serif', fill: '#38bdf8', letterSpacing: 1.5
        }).setOrigin(0.5));

        // Column Headers
        const headerY = y0 + 50;
        const hg = this.add.graphics();
        hg.fillStyle(0x040b16, 0.9);
        hg.fillRoundedRect(x + 12, headerY, w - 24, 26, 4);
        hg.lineStyle(1, 0x1e293b, 0.5);
        hg.strokeRoundedRect(x + 12, headerY, w - 24, 26, 4);
        c.add(hg);

        const cols = {
            pos: x + 25, club: x + 50, p: x + w * 0.40,
            w: x + w * 0.46, d: x + w * 0.52, l: x + w * 0.58,
            gf: x + w * 0.65, ga: x + w * 0.71, gd: x + w * 0.77, pts: x + w * 0.84, form: x + w * 0.93
        };
        const hs = { font: '700 11px sans-serif', fill: '#64748b' };
        ['#', 'KULÜP', 'O', 'G', 'B', 'M', 'AG', 'YG', 'AV', 'P', 'FORM'].forEach((label, i) => {
            const colKeys = ['pos', 'club', 'p', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts', 'form'];
            c.add(this.add.text(cols[colKeys[i]], headerY + 13, label, hs).setOrigin(i === 1 ? 0 : 0.5, 0.5));
        });

        const engine = window.CareerManager;
        const table = engine ? engine.getSortedTable(this.cw.currentClub.leagueId || this.cw.currentClub.league) : [];
        const totalTeams = table.length || 12;
        const availableH = this.H - (headerY + 32) - this.PAD - 10;
        const rowHeight = Math.min(36, Math.floor(availableH / totalTeams));

        table.slice(0, totalTeams).forEach((row, i) => {
            const ry = headerY + 32 + i * rowHeight;
            const isPlayer = row.clubId === this.cw.currentClubId;
            
            const isTop3 = i < 3;
            const isBottom2 = i >= totalTeams - 2;

            const rowG = this.add.graphics();
            
            if (isPlayer) {
                rowG.fillStyle(0x0f2140, 0.95);
                rowG.fillRoundedRect(x + 12, ry, w - 24, rowHeight - 4, 4);
                rowG.lineStyle(2, 0x00ffff, 0.15); // Neon blue glow for player
                rowG.strokeRoundedRect(x + 12, ry, w - 24, rowHeight - 4, 4);
            } else {
                rowG.fillStyle(isBottom2 ? 0x1f0a0a : (i % 2 === 0 ? 0x070d18 : 0x040810), 0.8);
                rowG.fillRoundedRect(x + 12, ry, w - 24, rowHeight - 4, 4);
                rowG.lineStyle(1, isBottom2 ? 0x451a1a : 0x1e293b, 0.3);
                rowG.strokeRoundedRect(x + 12, ry, w - 24, rowHeight - 4, 4);
            }
            c.add(rowG);

            // Position & Left accent
            if (isTop3) {
                const accG = this.add.graphics();
                accG.fillStyle(0x22c55e, 0.8);
                accG.fillRoundedRect(x + 12, ry + 2, 4, rowHeight - 8, 2);
                c.add(accG);
            } else if (isBottom2) {
                const accG = this.add.graphics();
                accG.fillStyle(0xef4444, 0.8);
                accG.fillRoundedRect(x + 12, ry + 2, 4, rowHeight - 8, 2);
                c.add(accG);
            }

            const posColor = isTop3 ? '#22c55e' : (isBottom2 ? '#ef4444' : '#94a3b8');
            c.add(this.add.text(cols.pos, ry + (rowHeight - 4) / 2, `${i + 1}`, { font: '700 14px sans-serif', fill: posColor }).setOrigin(0.5));

            // Club Name & Badge
            const club = window.TeamDatabase.getClub(row.clubId); // Use TeamDatabase
            const displayName = club && club.name && club.name !== 'undefined' ? club.name : (row.name && row.name !== 'undefined' ? row.name : 'KULÜP');

            if (club) {
                c.add(this.add.circle(cols.club - 10, ry + (rowHeight - 4) / 2, 6, club.primaryColor || 0xffffff));
            }
            
            const nameStyle = { font: `${isPlayer ? '900' : '700'} 11px sans-serif`, fill: isPlayer ? '#ffffff' : '#cbd5e1' };
            c.add(this.add.text(cols.club + 2, ry + (rowHeight - 4) / 2, displayName.substring(0, 15).toUpperCase(), nameStyle).setOrigin(0, 0.5));

            // Stats
            const vals = [row.played, row.wins, row.draws, row.losses, row.goalsFor, row.goalsAgainst, row.goalDifference, row.points];
            const valCols = [cols.p, cols.w, cols.d, cols.l, cols.gf, cols.ga, cols.gd, cols.pts];
            vals.forEach((v, vi) => {
                const isPts = vi === vals.length - 1;
                c.add(this.add.text(valCols[vi], ry + (rowHeight - 4) / 2, `${v}`, {
                    font: `${isPts ? '900' : '700'} ${isPts ? '14' : '11'}px sans-serif`,
                    fill: isPts ? '#38bdf8' : (isPlayer ? '#ffffff' : '#94a3b8')
                }).setOrigin(0.5).setShadow(isPts ? 0 : 0, 0, '#38bdf8', isPts ? 4 : 0, true, true));
            });

            // Form indicators (Last 5 with G/B/M texts)
            const allCompletedMatches = [
                ...(this.season.leagueFixtures || []).filter(m => m.completed && (m.home === row.clubId || m.away === row.clubId)),
                ...(this.season.fixtures || []).filter(m => m.completed && (m.competition === 'league' || m.type === 'league') && (m.home === row.clubId || m.away === row.clubId))
            ];
            // Deduplicate by round+home+away
            const seen = new Set();
            const uniqueMatches = allCompletedMatches.filter(m => {
                const key = `${m.round}_${m.home}_${m.away}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            const recentMatches = uniqueMatches.slice(-5);
            
            for(let fi=0; fi<5; fi++) {
                const fx = cols.form - 25 + fi * 12;
                if(fi < recentMatches.length) {
                    const m = recentMatches[fi];
                    const isH = m.home === row.clubId;
                    const pg = isH ? (m.homeScore || 0) : (m.awayScore || 0);
                    const og = isH ? (m.awayScore || 0) : (m.homeScore || 0);
                    const fCol = pg > og ? 0x22c55e : (pg < og ? 0xef4444 : 0xfbbf24);
                    const fChar = pg > og ? 'G' : (pg < og ? 'M' : 'B');
                    
                    const fBg = this.add.graphics();
                    fBg.fillStyle(fCol, 0.9);
                    fBg.fillRoundedRect(fx - 5, ry + (rowHeight - 4) / 2 - 5, 10, 10, 2);
                    c.add(fBg);
                    
                    c.add(this.add.text(fx, ry + (rowHeight - 4) / 2, fChar, { font: '700 9px sans-serif', fill: '#000000' }).setOrigin(0.5));
                } else {
                    const fBg = this.add.graphics();
                    fBg.fillStyle(0x1e293b, 0.5);
                    fBg.fillRoundedRect(fx - 5, ry + (rowHeight - 4) / 2 - 5, 10, 10, 2);
                    c.add(fBg);
                }
            }
        });
    }

    // =====================================================================
    // FIXTURES TAB
    // =====================================================================
    renderFixturesTab() {
        if (!this.season.fixtures || this.season.fixtures.length === 0) {
            if (window.CareerManager && typeof window.CareerManager.validateAndRepairCareerState === 'function') {
                window.CareerManager.validateAndRepairCareerState();
                this.cw = window.GameStateManager ? window.GameStateManager.getCareerData() : this.cw;
                this.season = this.cw;
            }
        }
        if (!this.season.fixtures || this.season.fixtures.length === 0) {
            this.add.text(this.W / 2, this.H / 2, "Fikstür bilgisi bulunamadı.", { fill: '#fff' }).setOrigin(0.5);
            return;
        }
        const c = this.contentContainer;
        const y0 = this.TOP_Y;
        const w = this.W - this.PAD * 2;
        const x = this.PAD;

        const bg = this.add.graphics();
        // Premium dark background with green glow accent
        this.drawPanel(bg, x, y0, w, this.H - y0 - this.PAD, { stroke: 0x22c55e, strokeAlpha: 0.6, fill: 0x010804 });
        c.add(bg);

        // Header
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x061a0d, 0.8);
        headerBg.fillRoundedRect(x + 2, y0 + 2, w - 4, 38, { tl: 8, tr: 8, bl: 0, br: 0 });
        c.add(headerBg);
        
        c.add(this.add.text(x + w / 2, y0 + 21, 'SEZON FİKSTÜRÜ', {
            font: '700 17px sans-serif', fill: '#22c55e', letterSpacing: 2
        }).setOrigin(0.5));

        const scrollC = this.add.container(0, 0);
        c.add(scrollC);

        const validSchedule = this.season.fixtures.filter(m => m);
        const firstUnplayedIdx = validSchedule.findIndex(m => !m.completed);
        
        // Setup visible list
        const playedMatches = validSchedule.filter(m => m.completed);
        const unplayedMatches = validSchedule.filter(m => !m.completed).slice(0, 5);
        const visibleSchedule = [...playedMatches, ...unplayedMatches];

        let currentY = y0 + 55;

        visibleSchedule.forEach((match, i) => {
            const actualIndex = validSchedule.indexOf(match);
            const my = currentY;
            
            const isPlayed = match.completed;
            const isNext = !isPlayed && actualIndex === firstUnplayedIdx;
            const entryH = isNext ? 75 : 55; // Taller for the active match
            currentY += entryH + 6; // Spacing

            const opponent = match.home === this.cw.currentClubId ? match.away : match.home;
            const oppClub = window.TeamDatabase.getClub(opponent);
            const isHome = match.home === this.cw.currentClubId;
            const numColor = match.type === 'national_cup' ? 0xef4444 : (match.type === 'champions_cup' ? 0xfbbf24 : 0x3b82f6);

            // Background
            const cardG = this.add.graphics();
            if (isNext) {
                cardG.fillStyle(0x0a1a10, 0.95);
                cardG.fillRoundedRect(x + 12, my, w - 24, entryH, 8);
                cardG.lineStyle(2, 0x22c55e, 0.9);
                cardG.strokeRoundedRect(x + 12, my, w - 24, entryH, 8);
                cardG.fillStyle(0x22c55e, 0.1);
                cardG.fillRoundedRect(x + 12, my, w - 24, entryH, 8);
            } else {
                cardG.fillStyle(0x040b08, isPlayed ? 0.4 : 0.7);
                cardG.fillRoundedRect(x + 12, my, w - 24, entryH, 6);
                cardG.lineStyle(1, 0x1e293b, 0.6);
                cardG.strokeRoundedRect(x + 12, my, w - 24, entryH, 6);
            }
            scrollC.add(cardG);

            // Text Info (Horizontal Layout)
            const infoX = x + 30;
            const weekText = match.type === 'league' ? `HAFTA ${match.round}` : (match.roundName || 'KUPA').toUpperCase();
            const compText = (match.competition || '').toUpperCase();
            const oppClubName = oppClub ? oppClub.name.toUpperCase() : 'BİLİNMEYEN TAKIM';
            const myClubName = (this.club && this.club.name && this.club.name !== 'undefined') ? this.club.name.toUpperCase() : 'KULÜBÜM';
            
            const vsSymbol = isHome ? 'VS' : '@';
            const matchupText = isHome ? `${myClubName} ${vsSymbol} ${oppClubName}` : `${oppClubName} ${vsSymbol} ${myClubName}`;
            
            scrollC.add(this.add.text(infoX, my + (entryH / 2), `${weekText}   |   ${compText}   |   ${matchupText}`, {
                font: '800 12px sans-serif', fill: isPlayed ? '#94a3b8' : '#ffffff', letterSpacing: 0.5
            }).setOrigin(0, 0.5));

            // Action / Result
            const btnW = 85;
            const btnX = x + w - 20 - btnW;
            const btnH = 34;
            const btnY = my + (entryH / 2) - (btnH / 2);

            if (isPlayed && (match.homeScore !== undefined && match.awayScore !== undefined)) {
                const pg = isHome ? match.homeScore : match.awayScore;
                const og = isHome ? match.awayScore : match.homeScore;
                const resultColorHex = pg > og ? 0x22c55e : (pg < og ? 0xef4444 : 0xfbbf24);
                const resultColor = pg > og ? '#22c55e' : (pg < og ? '#ef4444' : '#fbbf24');
                
                const resBg = this.add.graphics();
                resBg.fillStyle(resultColorHex, 0.15);
                resBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
                resBg.lineStyle(1, resultColorHex, 0.6);
                resBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 6);
                scrollC.add(resBg);

                scrollC.add(this.add.text(btnX + btnW / 2, btnY + btnH / 2, `${pg} - ${og}`, {
                    font: '700 19px sans-serif', fill: resultColor
                }).setOrigin(0.5).setShadow(0, 0, resultColor, 4, true, true));
                
            } else if (isNext) {
                const btnBg = this.add.graphics();
                btnBg.fillStyle(0x22c55e, 1);
                btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                btnBg.fillStyle(0xffffff, 0.2);
                btnBg.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 4);
                scrollC.add(btnBg);
                
                const btnLabel = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'OYNA ▶', {
                    font: '700 15px sans-serif', fill: '#000000'
                }).setOrigin(0.5);
                scrollC.add(btnLabel);

                const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
                if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
                scrollC.add(btnHit);

                btnHit.on('pointerover', () => {
                    btnBg.clear(); btnBg.fillStyle(0x00ffff, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                    btnLabel.setFill('#000000');
                });
                btnHit.on('pointerout', () => {
                    btnBg.clear(); btnBg.fillStyle(0x22c55e, 1); btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                    btnBg.fillStyle(0xffffff, 0.2); btnBg.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 2 - 2, 4);
                    btnLabel.setFill('#000000');
                });
                btnHit.on('pointerdown', () => this.startMatch(match, opponent, isHome));

                this.tweens.add({ targets: btnBg, alpha: 0.9, duration: 800, yoyo: true, repeat: -1 });
            } else {
                const lockBg = this.add.graphics();
                lockBg.fillStyle(0x1e293b, 0.5);
                lockBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
                scrollC.add(lockBg);
                
                scrollC.add(this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'KİLİTLİ', {
                    font: '800 12px sans-serif', fill: '#475569', letterSpacing: 1
                }).setOrigin(0.5));
            }
        });

        // Scroll logic
        let totalH = 46 + visibleSchedule.reduce((acc, m, i) => {
            const isPlayed = m.completed;
            const isNext = !isPlayed && validSchedule.indexOf(m) === firstUnplayedIdx;
            return acc + (isNext ? 75 : 55) + 6;
        }, 0) + 20;
        
        const visibleH = this.H - y0 - this.PAD;
        
        // Auto-scroll to current match
        if (firstUnplayedIdx > 2) {
            // Find how many matches in visibleSchedule come before firstUnplayedIdx
            let prevMatchesH = 0;
            for (let i = 0; i < visibleSchedule.length; i++) {
                if (validSchedule.indexOf(visibleSchedule[i]) === firstUnplayedIdx) break;
                prevMatchesH += 55 + 6; // all previous are played and have entryH 55
            }
            const targetY = -(Math.max(0, prevMatchesH - (visibleH / 2 - 40)));
            scrollC.y = Phaser.Math.Clamp(targetY, -(totalH - visibleH), 0);
        }

        if (totalH > visibleH) {
            this.input.on('wheel', (pointer, go, dx, dy) => {
                scrollC.y = Phaser.Math.Clamp(scrollC.y - dy * 0.8, -(totalH - visibleH), 0);
            });
            let dragY = 0;
            this.input.on('pointerdown', p => { dragY = p.y; });
            this.input.on('pointermove', p => {
                if (p.isDown) {
                    scrollC.y = Phaser.Math.Clamp(scrollC.y + (p.y - dragY), -(totalH - visibleH), 0);
                    dragY = p.y;
                }
            });
            
            // Scrollbar indicator
            const sbBg = this.add.graphics();
            sbBg.fillStyle(0x1e293b, 0.5);
            sbBg.fillRoundedRect(x + w - 8, y0 + 10, 4, visibleH - 20, 2);
            c.add(sbBg);
            
            const sbThumb = this.add.graphics();
            const thumbH = Math.max(20, (visibleH / totalH) * (visibleH - 20));
            sbThumb.fillStyle(0x22c55e, 0.8);
            sbThumb.fillRoundedRect(x + w - 8, 0, 4, thumbH, 2);
            c.add(sbThumb);

            this.events.on('update', () => {
                const progress = Math.abs(scrollC.y) / (totalH - visibleH);
                sbThumb.y = y0 + 10 + progress * (visibleH - 20 - thumbH);
            });
        }
    }

    // =====================================================================
    // CUPS TAB
    // =====================================================================
    renderCupsTab() {
        const c = this.contentContainer;
        const y0 = this.TOP_Y;
        const w = this.W - this.PAD * 2;
        const x = this.PAD;

        const bg = this.add.graphics();
        // Premium cup background with gold/purple tint
        this.drawPanel(bg, x, y0, w, this.H - y0 - this.PAD, { stroke: 0xfbbf24, strokeAlpha: 0.6, fill: 0x0f0a14 });
        bg.fillStyle(0xfbbf24, 0.02);
        bg.fillRoundedRect(x, y0, w, this.H - y0 - this.PAD, 8);
        c.add(bg);

        // Header
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x1a1205, 0.9);
        headerBg.fillRoundedRect(x + 2, y0 + 2, w - 4, 38, { tl: 8, tr: 8, bl: 0, br: 0 });
        c.add(headerBg);
        
        c.add(this.add.text(x + w / 2, y0 + 21, '🏆 TURNUVA AĞACI', {
            font: '700 17px sans-serif', fill: '#fbbf24', letterSpacing: 1.5
        }).setOrigin(0.5));

        const scrollC = this.add.container(0, 0);
        c.add(scrollC);

        const cup = this.season.nationalCup;
        if (!cup) {
            c.add(this.add.text(x + w / 2, y0 + 150, 'KUPA VERİSİ BULUNAMADI', {
                font: '700 14px sans-serif', fill: '#64748b'
            }).setOrigin(0.5));
            return;
        }

        const isDrawCompleted = this.season.currentWeek >= 9;

        if (!isDrawCompleted) {
            // Draw pending state
            const pendingY = y0 + 150;
            
            const lockCircle = this.add.graphics();
            lockCircle.fillStyle(0xfbbf24, 0.1);
            lockCircle.fillCircle(x + w / 2, pendingY, 40);
            lockCircle.lineStyle(2, 0xfbbf24, 0.8);
            lockCircle.strokeCircle(x + w / 2, pendingY, 40);
            c.add(lockCircle);
            
            c.add(this.add.text(x + w / 2, pendingY, '🔒', { font: '32px Arial' }).setOrigin(0.5));

            c.add(this.add.text(x + w / 2, pendingY + 70, 'ELEME AŞAMASI BEKLENİYOR', {
                font: '700 21px sans-serif', fill: '#fbbf24', letterSpacing: 1
            }).setOrigin(0.5));
            
            c.add(this.add.text(x + w / 2, pendingY + 95, 'Kupa eşleşmeleri sezon ortasına doğru kura ile belirlenecektir.', {
                font: '600 12px sans-serif', fill: '#94a3b8'
            }).setOrigin(0.5));

            // Fake animated loading bar
            const loadW = 200;
            const loadY = pendingY + 140;
            const loadBg = this.add.graphics();
            loadBg.fillStyle(0x1e293b, 0.8);
            loadBg.fillRoundedRect(x + w / 2 - loadW / 2, loadY, loadW, 6, 3);
            c.add(loadBg);

            const loadFill = this.add.graphics();
            c.add(loadFill);
            
            this.tweens.addCounter({
from: 0, to: 100, duration: 2000, repeat: -1,
                onUpdate: tween => {
                    const progress = tween.getValue() / 100;
                    loadFill.clear();
                    loadFill.fillStyle(0xfbbf24, 1);
                    loadFill.fillRoundedRect(x + w / 2 - loadW / 2, loadY, loadW * progress, 6, 3);
                }
            });
            return;
        }



        let currentY = y0 + 50;

        // Cup Header
        const chBg = this.add.graphics();
        chBg.fillStyle(0x140a02, 0.8);
        chBg.fillRoundedRect(x + 16, currentY, w - 32, 60, 8);
        chBg.lineStyle(1, 0xfbbf24, 0.4);
        chBg.strokeRoundedRect(x + 16, currentY, w - 32, 60, 8);
        scrollC.add(chBg);

        scrollC.add(this.add.text(x + 36, currentY + 30, '🏆', { font: '30px Arial' }).setOrigin(0, 0.5));
        scrollC.add(this.add.text(x + 80, currentY + 22, (cup.name || 'ULUSAL KUPA').toUpperCase(), {
            font: '700 19px sans-serif', fill: '#fbbf24', letterSpacing: 1
        }).setOrigin(0, 0.5));
        
        const userStatus = this.getCupStatus('national_cup');
        const statusColor = userStatus.includes('ELENDİ') ? '#ef4444' : (userStatus.includes('ŞAMPİYON') ? '#fbbf24' : '#22c55e');
        scrollC.add(this.add.text(x + 80, currentY + 42, `DURUM: ${userStatus.toUpperCase()}`, {
            font: '700 12px sans-serif', fill: statusColor
        }).setOrigin(0, 0.5));

        currentY += 80;

        // BRACKET RENDERER (Left to right or compact tree)
        const totalRounds = cup.rounds.length;
        const colW = (w - 32) / totalRounds;
        
        const linesG = this.add.graphics();
        linesG.lineStyle(2, 0x1e293b, 0.8);
        scrollC.add(linesG);
        
        const activeLinesG = this.add.graphics();
        activeLinesG.lineStyle(3, 0x00ffff, 0.15); // Neon cyan for player path
        scrollC.add(activeLinesG);

        let roundNodes = []; // Store node positions to draw lines

        cup.rounds.forEach((round, rIdx) => {
            const rx = x + 16 + rIdx * colW;
            const nodes = [];
            
            scrollC.add(this.add.text(rx + colW / 2, currentY, round.name.toUpperCase(), {
                font: '800 11px sans-serif', fill: '#fbbf24', letterSpacing: 1
            }).setOrigin(0.5));

            const numMatches = round.matches.length;
            const verticalSpacing = 280 / numMatches; // Distribute vertically
            const startY = currentY + 40;

            round.matches.forEach((match, mIdx) => {
                const nodeY = startY + mIdx * verticalSpacing + verticalSpacing / 2;
                const isPlayer = match.home === this.cw.currentClubId || match.away === this.cw.currentClubId;
                
                // Draw Match Box
                const boxW = colW - 16;
                const boxH = 46;
                const boxX = rx + 8;
                const boxY = nodeY - boxH / 2;

                const mBg = this.add.graphics();
                if (isPlayer) {
                    mBg.fillStyle(0x0f2140, 0.95);
                    mBg.fillRoundedRect(boxX, boxY, boxW, boxH, 4);
                    mBg.lineStyle(2, 0x00ffff, 0.15);
                    mBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 4);
                } else {
                    mBg.fillStyle(0x0a0500, 0.8);
                    mBg.fillRoundedRect(boxX, boxY, boxW, boxH, 4);
                    mBg.lineStyle(1, 0x334155, 0.6);
                    mBg.strokeRoundedRect(boxX, boxY, boxW, boxH, 4);
                }
                scrollC.add(mBg);

                nodes.push({ x: boxX, y: nodeY, w: boxW, h: boxH, isPlayer: isPlayer });

                if (!match.home && !match.away) {
                    scrollC.add(this.add.text(boxX + boxW / 2, nodeY, 'TBD', {
                        font: '800 12px sans-serif', fill: '#475569'
                    }).setOrigin(0.5));
                } else {
                    const hClub = window.TeamDatabase.getClub(match.home);
                    const aClub = window.TeamDatabase.getClub(match.away);
                    
                    const hName = (hClub && hClub.shortName && hClub.shortName !== 'undefined') ? hClub.shortName.toUpperCase() : 'TBD';
                    const aName = (aClub && aClub.shortName && aClub.shortName !== 'undefined') ? aClub.shortName.toUpperCase() : 'TBD';
                    
                    const hStyle = { font: '800 11px sans-serif', fill: match.home === this.cw.currentClubId ? '#00ffff' : '#e2e8f0' };
                    const aStyle = { font: '800 11px sans-serif', fill: match.away === this.cw.currentClubId ? '#00ffff' : '#e2e8f0' };
                    
                    scrollC.add(this.add.text(boxX + 6, boxY + 12, hName, hStyle).setOrigin(0, 0.5));
                    scrollC.add(this.add.text(boxX + 6, boxY + 34, aName, aStyle).setOrigin(0, 0.5));

                    // Result or Play
                    // Result or Play
                    if (match.completed && match.result) {
                        scrollC.add(this.add.text(boxX + boxW - 8, boxY + 12, `${match.result.homeGoals}`, { font: '700 13px sans-serif', fill: match.result.homeGoals > match.result.awayGoals ? '#22c55e' : '#94a3b8' }).setOrigin(1, 0.5));
                        scrollC.add(this.add.text(boxX + boxW - 8, boxY + 34, `${match.result.awayGoals}`, { font: '700 13px sans-serif', fill: match.result.awayGoals > match.result.homeGoals ? '#22c55e' : '#94a3b8' }).setOrigin(1, 0.5));
                    } else if (isPlayer && !match.completed && this.season.fixtures[this.season.currentWeek - 1] && this.season.fixtures[this.season.currentWeek - 1].type === 'cup') {
                        // Current Playable match
                        const btnG = this.add.graphics();
                        btnG.fillStyle(0x22c55e, 1);
                        btnG.fillRoundedRect(boxX + boxW - 45, boxY + 8, 40, 30, 4);
                        scrollC.add(btnG);
                        
                        scrollC.add(this.add.text(boxX + boxW - 25, nodeY, 'OYNA', { font: '700 11px sans-serif', fill: '#000000' }).setOrigin(0.5));
                        
                        const hit = this.add.rectangle(boxX + boxW - 25, nodeY, 40, 30, 0, 0).setInteractive({ useHandCursor: true });
                        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
                        scrollC.add(hit);
                        hit.on('pointerdown', () => {
                            const activeMatchItem = this.season.fixtures.find(m => !m.completed) || match;
                            const opponentId = match.home === this.cw.currentClubId ? match.away : match.home;
                            this.startMatch(activeMatchItem, opponentId, match.home === this.cw.currentClubId);
                        });
                        this.tweens.add({ targets: btnG, alpha: 0.8, duration: 600, yoyo: true, repeat: -1 });
                    }
                }
            });
            roundNodes.push(nodes);
        });

        // Draw connector lines between rounds
        for (let r = 0; r < roundNodes.length - 1; r++) {
            const currentRound = roundNodes[r];
            const nextRound = roundNodes[r + 1];
            
            for (let i = 0; i < currentRound.length; i++) {
                const node1 = currentRound[i];
                const node2 = nextRound[Math.floor(i / 2)];
                if (!node2) continue;
                
                const startX = node1.x + node1.w;
                const startY = node1.y;
                const endX = node2.x;
                const endY = node2.y;
                const midX = startX + (endX - startX) / 2;

                const g = node1.isPlayer && node2.isPlayer ? activeLinesG : linesG;
                
                g.beginPath();
                g.moveTo(startX, startY);
                g.lineTo(midX, startY);
                g.lineTo(midX, endY);
                g.lineTo(endX, endY);
                g.strokePath();
            }
        }

        currentY += 320;

        // Champion Banner
        if (cup.winner) {
            const winnerClub = window.TeamDatabase.getClub(cup.winner);
            const wName = (winnerClub && winnerClub.name && winnerClub.name !== 'undefined') ? winnerClub.name.toUpperCase() : 'ŞAMPİYON';
            
            const wBg = this.add.graphics();
            wBg.fillStyle(0xfbbf24, 0.15);
            wBg.fillRoundedRect(x + 16, currentY, w - 32, 70, 8);
            wBg.lineStyle(2, 0xfbbf24, 0.9);
            wBg.strokeRoundedRect(x + 16, currentY, w - 32, 70, 8);
            scrollC.add(wBg);

            scrollC.add(this.add.text(x + w / 2, currentY + 20, '👑 ŞAMPİYON 👑', {
                font: '700 15px sans-serif', fill: '#fbbf24', letterSpacing: 2
            }).setOrigin(0.5));
            scrollC.add(this.add.text(x + w / 2, currentY + 45, wName, {
                font: '700 23px sans-serif', fill: '#ffffff', letterSpacing: 1
            }).setOrigin(0.5).setShadow(0, 0, '#fbbf24', 8, true, true));
            
            currentY += 90;
        }

        // Scroll Logic
        const totalH = currentY - y0 + 20;
        const visibleH = this.H - y0 - this.PAD;
        
        if (totalH > visibleH) {
            this.input.on('wheel', (pointer, go, dx, dy) => {
                scrollC.y = Phaser.Math.Clamp(scrollC.y - dy * 0.8, -(totalH - visibleH), 0);
            });
            let dragY = 0;
            this.input.on('pointerdown', p => { dragY = p.y; });
            this.input.on('pointermove', p => {
                if (p.isDown) {
                    scrollC.y = Phaser.Math.Clamp(scrollC.y + (p.y - dragY), -(totalH - visibleH), 0);
                    dragY = p.y;
                }
            });
            
            // Scrollbar indicator
            const sbBg = this.add.graphics();
            sbBg.fillStyle(0x1e293b, 0.5);
            sbBg.fillRoundedRect(x + w - 8, y0 + 10, 4, visibleH - 20, 2);
            c.add(sbBg);
            
            const sbThumb = this.add.graphics();
            const thumbH = Math.max(20, (visibleH / totalH) * (visibleH - 20));
            sbThumb.fillStyle(0xfbbf24, 0.8);
            sbThumb.fillRoundedRect(x + w - 8, 0, 4, thumbH, 2);
            c.add(sbThumb);

            this.events.on('update', () => {
                const progress = Math.abs(scrollC.y) / (totalH - visibleH);
                sbThumb.y = y0 + 10 + progress * (visibleH - 20 - thumbH);
            });
        }
    }
    // =====================================================================
    // TRANSFERS TAB
    // =====================================================================
    // =====================================================================
    // TRANSFERS TAB
    // =====================================================================
    renderTransfersTab() {
        const c = this.contentContainer;
        const y0 = this.TOP_Y;
        const w = this.W - this.PAD * 2;
        const x = this.PAD;

        const bg = this.add.graphics();
        this.drawPanel(bg, x, y0, w, this.H - y0 - this.PAD, { stroke: 0x8b5cf6, strokeAlpha: 0.6, fill: 0x080410 });
        bg.fillStyle(0x8b5cf6, 0.02);
        bg.fillRoundedRect(x, y0, w, this.H - y0 - this.PAD, 8);
        c.add(bg);

        // Header Title
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x1a0f2e, 0.9);
        headerBg.fillRoundedRect(x + 2, y0 + 2, w - 4, 38, { tl: 8, tr: 8, bl: 0, br: 0 });
        c.add(headerBg);
        
        c.add(this.add.text(x + w / 2, y0 + 21, '✈️ TRANSFER MERKEZİ', {
            font: '700 17px sans-serif', fill: '#c084fc', letterSpacing: 1.5
        }).setOrigin(0.5));

        const scrollC = this.add.container(0, 0);
        c.add(scrollC);

        let cy = y0 + 60;

        // Current contract
        const contract = this.season.contract || this.season.activeContract || { seasons: 1, matchBonus: 50, goalBonus: 25, assistBonus: 20, objective: 'Ligde Kal', role: 'AS OYUNCU' };
        
        const contractG = this.add.graphics();
        // Contract background
        contractG.fillStyle(0x0f172a, 0.8);
        contractG.fillRoundedRect(x + 16, cy, w - 32, 100, 8);
        contractG.lineStyle(1, 0x3b82f6, 0.6);
        contractG.strokeRoundedRect(x + 16, cy, w - 32, 100, 8);
        // Left stripe
        contractG.fillStyle(this.club.primaryColor, 0.5);
        contractG.fillRoundedRect(x + 16, cy, 6, 100, { tl: 8, bl: 8, tr: 0, br: 0 });
        scrollC.add(contractG);
        
        // Badge
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(this.club.primaryColor, 0.2);
        badgeBg.fillCircle(x + 55, cy + 50, 30);
        badgeBg.lineStyle(2, this.club.secondaryColor || 0xffffff, 0.8);
        badgeBg.strokeCircle(x + 55, cy + 50, 30);
        scrollC.add(badgeBg);
        scrollC.add(this.add.text(x + 55, cy + 50, '📝', { font: '26px Arial' }).setOrigin(0.5));

        scrollC.add(this.add.text(x + 105, cy + 15, 'MEVCUT SÖZLEŞME', {
            font: '800 11px sans-serif', fill: '#3b82f6', letterSpacing: 1
        }));
        scrollC.add(this.add.text(x + 105, cy + 32, (this.club.name || '').toUpperCase(), {
            font: '700 21px sans-serif', fill: '#ffffff', letterSpacing: 1
        }));

        // Status indicator
        const isWindowOpen = this.season.transferWindowOpen;
        const statusColor = isWindowOpen ? '#22c55e' : '#ef4444';
        const statusText = isWindowOpen ? 'TRANSFER DÖNEMİ AÇIK' : 'TRANSFER DÖNEMİ KAPALI';
        
        scrollC.add(this.add.circle(x + w - 160, cy + 25, 4, isWindowOpen ? 0x22c55e : 0xef4444));
        scrollC.add(this.add.text(x + w - 150, cy + 25, statusText, { font: '800 10px sans-serif', fill: statusColor }).setOrigin(0, 0.5));

        // Stats grid
        const statsBg = this.add.graphics();
        statsBg.fillStyle(0x020617, 0.6);
        statsBg.fillRoundedRect(x + 105, cy + 50, w - 130, 40, 4);
        scrollC.add(statsBg);

        const sy = cy + 60;
        scrollC.add(this.add.text(x + 115, sy, `⌛ KALAN: ${contract.seasons || contract.seasonsRemaining || 1} YIL`, { font: '700 10px sans-serif', fill: '#cbd5e1' }).setOrigin(0, 0.5));
        scrollC.add(this.add.text(x + 225, sy, `🟢 MAÇ: +${contract.matchBonus} EZ`, { font: '700 10px sans-serif', fill: '#22c55e' }).setOrigin(0, 0.5));
        scrollC.add(this.add.text(x + 335, sy, `⭐ GOL: +${contract.goalBonus} EZ`, { font: '700 10px sans-serif', fill: '#fbbf24' }).setOrigin(0, 0.5));
        
        scrollC.add(this.add.text(x + 115, sy + 18, `🎯 HEDEF: ${(contract.objective || '').toUpperCase()}`, { font: '800 10px sans-serif', fill: '#fbbf24' }).setOrigin(0, 0.5));
        scrollC.add(this.add.text(x + 335, sy + 18, `👟 ASİST: +${contract.assistBonus || 20} EZ`, { font: '700 10px sans-serif', fill: '#38bdf8' }).setOrigin(0, 0.5));
        scrollC.add(this.add.text(x + w - 40, sy + 9, (contract.role || 'AS OYUNCU').toUpperCase(), { font: '700 12px sans-serif', fill: '#e879f9' }).setOrigin(1, 0.5));

        cy += 120;

        // Offers Title
        const isWinOpen = window.CareerManager && typeof window.CareerManager.isTransferWindowOpen === 'function'
            ? window.CareerManager.isTransferWindowOpen(this.cw.currentWeek)
            : ((this.cw.currentWeek >= 1 && this.cw.currentWeek <= 3) || (this.cw.currentWeek >= 9 && this.cw.currentWeek <= 11));

        const headerTitle = isWinOpen ? 'GELEN TEKLİFLER (DÖNEM AÇIK)' : 'GELEN TEKLİFLER (TRANSFER PENCERESİ KAPALI)';
        const headerColor = isWinOpen ? '#c084fc' : '#ef4444';

        scrollC.add(this.add.text(x + 16, cy + 10, headerTitle, {
            font: '700 15px sans-serif', fill: headerColor, letterSpacing: 1
        }));
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x1e293b, 0.8);
        divG.lineBetween(x + 16, cy + 32, x + w - 16, cy + 32);
        scrollC.add(divG);
        cy += 45;

        // Offers
        const pending = isWinOpen ? (this.season.transferOffers || []).filter(o => o.status !== 'accepted' && o.status !== 'rejected') : [];
        
        if (!isWinOpen || pending.length === 0) {
            // Premium Empty State
            const emptyG = this.add.graphics();
            emptyG.fillStyle(0x05020a, 0.8);
            emptyG.fillRoundedRect(x + 16, cy, w - 32, 120, 8);
            emptyG.lineStyle(1, isWinOpen ? 0x1e293b : 0x7928ca, 0.5);
            emptyG.strokeRoundedRect(x + 16, cy, w - 32, 120, 8);
            scrollC.add(emptyG);

            const icon = isWinOpen ? '📭' : '🔒';
            const msgTitle = isWinOpen ? 'Şu an aktif teklif yok.' : 'TRANSFER PENCERESİ KAPALI';
            const msgSub = isWinOpen 
                ? 'Performansını artır, gol/asist yap ve sezonu güçlü bitirerek daha büyük kulüplerin ilgisini çek.'
                : 'Transfer penceresi sadece 1-3. ve 9-11. haftalar arasında açıktır.';

            scrollC.add(this.add.text(x + w / 2, cy + 35, icon, { font: '36px Arial' }).setOrigin(0.5).setAlpha(0.6));
            scrollC.add(this.add.text(x + w / 2, cy + 70, msgTitle, {
                font: '700 17px sans-serif', fill: isWinOpen ? '#94a3b8' : '#ef4444', letterSpacing: 1
            }).setOrigin(0.5));
            scrollC.add(this.add.text(x + w / 2, cy + 95, msgSub, {
                font: '600 11px sans-serif', fill: '#475569'
            }).setOrigin(0.5));
            return;
        }

        pending.forEach((offer, i) => {
            const oy = cy + i * 150;
            this.renderTransferCard(scrollC, offer, x + 16, oy, w - 32);
        });

        // Scroll Logic
        const totalH = cy + pending.length * 150 + 20;
        const visibleH = this.H - y0 - this.PAD;
        
        if (totalH > visibleH) {
            this.input.on('wheel', (pointer, go, dx, dy) => {
                scrollC.y = Phaser.Math.Clamp(scrollC.y - dy * 0.8, -(totalH - visibleH), 0);
            });
            let dragY = 0;
            this.input.on('pointerdown', p => { dragY = p.y; });
            this.input.on('pointermove', p => {
                if (p.isDown) {
                    scrollC.y = Phaser.Math.Clamp(scrollC.y + (p.y - dragY), -(totalH - visibleH), 0);
                    dragY = p.y;
                }
            });
        }
    }

    renderTransferCard(container, offer, x, y, cardW) {
        const clubInfo = window.TeamDatabase.getClub(offer.clubId) || { primaryColor: 0x333333, secondaryColor: 0xffffff };
        const tierColor = offer.tier === 'ELITE' ? 0xfbbf24 : (offer.tier === 'MID' ? 0x38bdf8 : 0x94a3b8);
        const tierTextCol = offer.tier === 'ELITE' ? '#fbbf24' : (offer.tier === 'MID' ? '#38bdf8' : '#94a3b8');

        const bg = this.add.graphics();
        bg.fillStyle(0x0a0514, 0.95);
        bg.fillRoundedRect(x, y, cardW, 140, 8);
        bg.lineStyle(1, clubInfo.primaryColor, 0.6);
        bg.strokeRoundedRect(x, y, cardW, 140, 8);
        
        // Gradient left accent
        bg.fillStyle(clubInfo.primaryColor, 0.15);
        bg.fillRoundedRect(x, y, 100, 140, { tl: 8, bl: 8, tr: 0, br: 0 });
        container.add(bg);

        // Club badge
        container.add(this.add.circle(x + 50, y + 70, 32, clubInfo.primaryColor).setStrokeStyle(3, clubInfo.secondaryColor));
        container.add(this.add.text(x + 50, y + 70, (offer.clubName || 'C').charAt(0), { font: '700 29px sans-serif', fill: '#ffffff' }).setOrigin(0.5));

        // Details
        const ix = x + 110;
        container.add(this.add.text(ix, y + 20, offer.clubName.toUpperCase(), { font: '700 21px sans-serif', fill: '#ffffff', letterSpacing: 1 }));
        
        // Interest level (Visual flair based on difficulty/tier)
        const diffStars = '⭐'.repeat(Math.min(5, Math.max(1, Math.ceil(offer.difficulty / 2))));
        container.add(this.add.text(ix, y + 42, `${offer.leagueName.toUpperCase()}   |   TİER: ${offer.tier}   |   ZORLUK: ${diffStars}`, {
            font: '800 11px sans-serif', fill: tierTextCol
        }));
        
        // Terms Box
        const termBg = this.add.graphics();
        termBg.fillStyle(0x020008, 0.6);
        termBg.fillRoundedRect(ix, y + 60, cardW - 225, 64, 6);
        container.add(termBg);
        
        const tx = ix + 10;
        container.add(this.add.text(tx, y + 78, `💰 MAAŞ (İMZA): ${offer.signingBonus} EZ`, {
            font: '700 13px sans-serif', fill: '#22c55e'
        }).setOrigin(0, 0.5));
        container.add(this.add.text(tx + 160, y + 78, `📄 SÜRE: ${offer.seasons || 1} YIL`, {
            font: '800 11px sans-serif', fill: '#e2e8f0'
        }).setOrigin(0, 0.5));

        const roleText = offer.role || 'AS OYUNCU';
        container.add(this.add.text(tx, y + 102, `👕 ROL: ${roleText.toUpperCase()}`, {
            font: '800 11px sans-serif', fill: '#38bdf8'
        }).setOrigin(0, 0.5));
        container.add(this.add.text(tx + 160, y + 102, `🎯 HEDEF: ${offer.objective.toUpperCase()}`, {
            font: '800 11px sans-serif', fill: '#fbbf24'
        }).setOrigin(0, 0.5));

        // Accept Button
        const btnW = 90, abx = x + cardW - btnW - 15, aby = y + 20;
        const acceptBg = this.add.graphics();
        acceptBg.fillStyle(0x22c55e, 1);
        acceptBg.fillRoundedRect(abx, aby, btnW, 45, 6);
        container.add(acceptBg);
        container.add(this.add.text(abx + btnW / 2, aby + 22.5, 'İMZALA', { font: '700 15px sans-serif', fill: '#000000' }).setOrigin(0.5));
        const acceptHit = this.add.rectangle(abx + btnW / 2, aby + 22.5, btnW, 45, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, acceptHit);
        container.add(acceptHit);
        
        // Reject Button
        const rby = y + 75;
        const rejectBg = this.add.graphics();
        rejectBg.fillStyle(0x020010, 0.8);
        rejectBg.fillRoundedRect(abx, rby, btnW, 45, 6);
        rejectBg.lineStyle(1, 0xef4444, 0.8);
        rejectBg.strokeRoundedRect(abx, rby, btnW, 45, 6);
        container.add(rejectBg);
        container.add(this.add.text(abx + btnW / 2, rby + 22.5, 'REDDET', { font: '700 15px sans-serif', fill: '#ef4444' }).setOrigin(0.5));
        const rejectHit = this.add.rectangle(abx + btnW / 2, rby + 22.5, btnW, 45, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, rejectHit);
        container.add(rejectHit);

        // Hover states
        acceptHit.on('pointerover', () => { acceptBg.clear(); acceptBg.fillStyle(0x4ade80, 1); acceptBg.fillRoundedRect(abx, aby, btnW, 45, 6); });
        acceptHit.on('pointerout', () => { acceptBg.clear(); acceptBg.fillStyle(0x22c55e, 1); acceptBg.fillRoundedRect(abx, aby, btnW, 45, 6); });
        rejectHit.on('pointerover', () => { rejectBg.clear(); rejectBg.fillStyle(0xef4444, 0.2); rejectBg.fillRoundedRect(abx, rby, btnW, 45, 6); rejectBg.lineStyle(1, 0xef4444, 1); rejectBg.strokeRoundedRect(abx, rby, btnW, 45, 6); });
        rejectHit.on('pointerout', () => { rejectBg.clear(); rejectBg.fillStyle(0x020010, 0.8); rejectBg.fillRoundedRect(abx, rby, btnW, 45, 6); rejectBg.lineStyle(1, 0xef4444, 0.8); rejectBg.strokeRoundedRect(abx, rby, btnW, 45, 6); });

        acceptHit.on('pointerdown', () => {
            offer.status = 'accepted';
            const ok = window.CareerManager.acceptTransfer(offer.id);
            if (ok) {
                if (window.SaveManager) window.SaveManager.save();
                
                // Re-fetch cw state
                this.cw = (window.GameStateManager && window.GameStateManager.getCareerData()) || window.gameState.career;
                this.season = this.cw;
                const activeClubId = this.cw.currentClubId || 'basic_1';
                const db = window.TeamDatabase;
                this.club = (db && db.getClub && db.getClub(activeClubId)) || {
                    id: 'basic_1', name: 'Lions FC', shortName: 'LIO', primaryColor: 0x00ffff, secondaryColor: 0xffffff, tier: 'BASIC', strength: 60, prestige: 30
                };
                this.league = (db && db.getLeague && db.getLeague(this.club.leagueId || this.club.league)) || { name: 'Türkiye Ligi', id: 'turkiye' };
                
                this.transitionToCareerCenter();
            }
        });
        rejectHit.on('pointerdown', () => {
            offer.status = 'rejected';
            if(window.SaveManager) window.SaveManager.save();
            this.renderTab('transfers');
        });
    }

    // (Obsolete squad tab removed; see updated cyber renderSquadTab below)


    // =====================================================================
    // END OF SEASON
    // =====================================================================
    handleEndOfSeason() {
        const engine = window.CareerManager;
        // The End Of Season scene now handles visual processing, just prepare offers if missing.
        const offers = engine && engine.generateTransferOffers ? engine.generateTransferOffers(this.cw) : [];
        this.cw.currentSeason.transferOffers = offers;
        
        // Ensure rewards tracking object exists
        if (!this.cw.currentSeason.rewardsClaimed) {
            this.cw.currentSeason.rewardsClaimed = {};
        }
        
        window.SaveManager.save();
        
        // Launch the cinematic end of season flow
        this.scene.start('EndOfSeasonScene', { cw: this.cw });
    }

    // =====================================================================
    // TOAST NOTIFICATION
    // =====================================================================
    showToast(message) {
        if (this._toastContainer) this._toastContainer.destroy();

        const toast = this.add.container(this.W / 2, this.HEADER_H + 40).setDepth(999);
        const bg = this.add.graphics();
        bg.fillStyle(0x0f172a, 0.95);
        bg.fillRoundedRect(-180, -18, 360, 36, 8);
        bg.lineStyle(1.5, 0xeab308, 0.9);
        bg.strokeRoundedRect(-180, -18, 360, 36, 8);

        const txt = this.add.text(0, 0, message, {
            font: '800 12px sans-serif', fill: '#facc15'
        }).setOrigin(0.5);

        toast.add([bg, txt]);
        this._toastContainer = toast;

        this.tweens.add({
            targets: toast,
            y: '-=10',
            alpha: { from: 0, to: 1 },
            duration: 250,
            yoyo: true,
            hold: 2000,
            onComplete: () => {
                if (toast) toast.destroy();
            }
        });
    }

    // =====================================================================
    // FIRST CONTRACT OFFERS TAB (REFERENCE UI IMPLEMENTATION)
    // =====================================================================
    renderFirstContractOffersTab() {
        // CRITICAL GUARD: If career is already started, never show offers again
        if (this.cw.started && this.cw.currentClubId) {
            console.warn('[CAREER] Attempted to show offers but career is active. Redirecting to season.');
            this.activeTab = 'season';
            this.createTabBar();
            this.renderSeasonTab();
            return;
        }

        if (this.contentContainer) this.contentContainer.removeAll(true);

        const container = this.add.container(0, 0);

        // Ensure we have 3 random BASIC contract offers
        if (!this.cw.firstContractOffers || this.cw.firstContractOffers.length < 3) {
            this.cw.firstContractOffers = window.TeamDatabase.getRandomFirstContractOffers(3);
            window.SaveManager.save();
        }

        const offers = this.cw.firstContractOffers;

        // LEFT MAIN PANEL
        const leftX = this.PAD;
        const leftY = this.TOP_Y;
        const leftW = this.LEFT_W;
        const panelH = this.H - leftY - this.PAD;

        // 1. INFO BANNER AT TOP
        const bannerH = 64;
        const bannerG = this.add.graphics();
        bannerG.fillStyle(0x060318, 0.95);
        bannerG.fillRoundedRect(leftX, leftY, leftW, bannerH, 10);
        bannerG.lineStyle(1.5, 0x00ffff, 0.15);
        bannerG.strokeRoundedRect(leftX, leftY, leftW, bannerH, 10);

        // Info Icon Badge
        const infoIconBg = this.add.graphics();
        infoIconBg.fillStyle(0x0f2042, 1);
        infoIconBg.fillCircle(leftX + 28, leftY + bannerH / 2, 18);
        infoIconBg.lineStyle(1.5, 0x00ffff, 0.15);
        infoIconBg.strokeCircle(leftX + 28, leftY + bannerH / 2, 18);
        
        const infoTxt = this.add.text(leftX + 28, leftY + bannerH / 2, 'ℹ️', { font: '14px Arial' }).setOrigin(0.5);

        // Info Text
        const infoMsg1 = this.add.text(leftX + 56, leftY + 16, 'Bu, kariyerin için gelen ilk sözleşme teklifleridir.', {
            font: '700 12.5px sans-serif', fill: '#94a3b8'
        });
        const infoMsg2 = this.add.text(leftX + 56, leftY + 35, 'Kariyerine başlamak için bir kulüp seçmelisin.', {
            font: '800 13.5px sans-serif', fill: '#38bdf8'
        });

        // Refresh Button
        const refBtnW = 150;
        const refBtnH = 40;
        const refBtnX = leftX + leftW - refBtnW - 12;
        const refBtnY = leftY + (bannerH - refBtnH) / 2;

        const refBg = this.add.graphics();
        refBg.fillStyle(0x0a1628, 0.9);
        refBg.fillRoundedRect(refBtnX, refBtnY, refBtnW, refBtnH, 8);
        refBg.lineStyle(1.5, 0x00ffff, 0.15);
        refBg.strokeRoundedRect(refBtnX, refBtnY, refBtnW, refBtnH, 8);

        const refIcon = this.add.text(refBtnX + 18, refBtnY + refBtnH / 2, '🔄', { font: '14px Arial' }).setOrigin(0.5);
        const refTxt1 = this.add.text(refBtnX + 36, refBtnY + 11, 'RASTGELE YENİLE', { font: '900 10.5px sans-serif', fill: '#ffffff' });
        const refTxt2 = this.add.text(refBtnX + 36, refBtnY + 26, '3 yeni teklif getir', { font: '600 9.5px sans-serif', fill: '#64748b' });

        const refHit = this.add.rectangle(refBtnX + refBtnW / 2, refBtnY + refBtnH / 2, refBtnW, refBtnH, 0, 0)
            .setInteractive({ useHandCursor: true });
        refHit.on('pointerover', () => {
            refBg.clear();
            refBg.fillStyle(0x162c4a, 0.95);
            refBg.fillRoundedRect(refBtnX, refBtnY, refBtnW, refBtnH, 8);
            refBg.lineStyle(1.5, 0x00ffff, 1);
            refBg.strokeRoundedRect(refBtnX, refBtnY, refBtnW, refBtnH, 8);
        });
        refHit.on('pointerout', () => {
            refBg.clear();
            refBg.fillStyle(0x0a1628, 0.9);
            refBg.fillRoundedRect(refBtnX, refBtnY, refBtnW, refBtnH, 8);
            refBg.lineStyle(1.5, 0x00ffff, 0.15);
            refBg.strokeRoundedRect(refBtnX, refBtnY, refBtnW, refBtnH, 8);
        });
        refHit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.cw.firstContractOffers = window.TeamDatabase.getRandomFirstContractOffers(3);
            window.SaveManager.save();
            this.renderFirstContractOffersTab();
        });

        container.add([bannerG, infoIconBg, infoTxt, infoMsg1, infoMsg2, refBg, refIcon, refTxt1, refTxt2, refHit]);

        // 2. THREE CONTRACT OFFER CARDS SIDE BY SIDE
        const cardsY = leftY + bannerH + 12;
        const cardsH = panelH - bannerH - 12;
        const cardW = Math.floor((leftW - 20) / 3);

        const cardThemes = [
            { border: 0x22c55e, fill: 0x061e12, textCol: '#4ade80' },
            { border: 0xd946ef, fill: 0x1d0527, textCol: '#f0abfc' },
            { border: 0x00ffff, fill: 0x031828, textCol: '#38bdf8' }
        ];

        offers.forEach((offer, i) => {
            const theme = cardThemes[i % cardThemes.length];
            const cardX = leftX + i * (cardW + 10);
            
            const club = window.TeamDatabase.getClub(offer.clubId);

            // Card Frame
            const cg = this.add.graphics();
            cg.fillStyle(0x040212, 0.94);
            cg.fillRoundedRect(cardX, cardsY, cardW, cardsH, 12);
            cg.lineStyle(2, theme.border, 0.85);
            cg.strokeRoundedRect(cardX, cardsY, cardW, cardsH, 12);

            // Top Header Glow
            const innerG = this.add.graphics();
            innerG.fillStyle(theme.border, 0.08);
            innerG.fillRoundedRect(cardX, cardsY, cardW, 105, { tl: 12, tr: 12, bl: 0, br: 0 });

            // Tier Badge (Top Right)
            const badgeW = 56;
            const badgeH = 18;
            const badgeX = cardX + cardW - badgeW - 10;
            const badgeY = cardsY + 10;
            const bBg = this.add.graphics();
            bBg.fillStyle(theme.border, 0.2);
            bBg.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 4);
            bBg.lineStyle(1, theme.border, 0.8);
            bBg.strokeRoundedRect(badgeX, badgeY, badgeW, badgeH, 4);
            const bTxt = this.add.text(badgeX + badgeW / 2, badgeY + badgeH / 2, offer.tier || 'BASIC', {
                font: '900 9.5px sans-serif', fill: theme.textCol
            }).setOrigin(0.5);

            // Club Emblem Circle
            const logoR = 24;
            const logoX = cardX + 36;
            const logoY = cardsY + 44;
            const logoBg = this.add.graphics();
            logoBg.fillStyle(club ? club.primaryColor : 0x1e293b, 1);
            logoBg.fillCircle(logoX, logoY, logoR);
            logoBg.lineStyle(2, club ? club.secondaryColor : theme.border, 1);
            logoBg.strokeCircle(logoX, logoY, logoR);

            const clubInitials = offer.shortName || (offer.clubName ? offer.clubName.substring(0, 3).toUpperCase() : 'FC');
            const logoTxt = this.add.text(logoX, logoY, clubInitials, {
                font: '700 14px sans-serif', fill: '#ffffff'
            }).setOrigin(0.5);

            // Club Name
            const nameTxt = this.add.text(cardX + 14, cardsY + 78, offer.clubName, {
                font: '700 16px sans-serif', fill: '#ffffff'
            });
            
            // League Name & Country
            const leagueTxt = this.add.text(cardX + 14, cardsY + 98, `${offer.leagueName}`, {
                font: '600 10.5px sans-serif', fill: '#64748b'
            });

            // Separator Line
            const sepG = this.add.graphics();
            sepG.lineStyle(1, 0x1e293b, 0.8);
            sepG.lineBetween(cardX + 12, cardsY + 118, cardX + cardW - 12, cardsY + 118);

            // Contract Details List
            const listY = cardsY + 128;
            const itemH = 34;

            const items = [
                { icon: '📅', label: 'SÖZLEŞME SÜRESİ', val: offer.contractLength },
                { icon: '⚽', label: 'MAÇ PRİMİ', val: `+${offer.matchBonus} EZ` },
                { icon: '🥅', label: 'GOL PRİMİ', val: `+${offer.goalBonus} EZ` },
                { icon: '💰', label: 'ÜCRET / SEZON', val: `${(offer.salaryPerSeason || 1500).toLocaleString()} EZ` },
                { icon: '🎯', label: 'HEDEF', val: offer.objective || 'İlk 8' }
            ];

            const itemElements = [];
            items.forEach((item, idx) => {
                const iy = listY + idx * itemH;
                const iIcon = this.add.text(cardX + 14, iy, item.icon, { font: '13px Arial' });
                const iLabel = this.add.text(cardX + 34, iy + 2, item.label, { font: '700 9px sans-serif', fill: '#64748b' });
                const iVal = this.add.text(cardX + cardW - 14, iy + 2, item.val, {
                    font: '900 11.5px sans-serif', fill: idx === 3 ? '#fbbf24' : (idx === 4 ? theme.textCol : '#ffffff')
                }).setOrigin(1, 0);

                itemElements.push(iIcon, iLabel, iVal);
            });

            // Accept Button
            const btnW = cardW - 24;
            const btnH = 38;
            const btnX = cardX + 12;
            const btnY = cardsY + cardsH - btnH - 12;

            const btnBg = this.add.graphics();
            btnBg.fillStyle(theme.border, 0.9);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);

            const btnTxt = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'KABUL ET  ▶', {
                font: '900 12.5px sans-serif', fill: '#000000'
            }).setOrigin(0.5);

            const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
                .setInteractive({ useHandCursor: true });

            btnHit.on('pointerover', () => {
                btnBg.clear();
                btnBg.fillStyle(theme.border, 1);
                btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
                btnBg.lineStyle(2, 0xffffff, 0.8);
                btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 8);
            });
            btnHit.on('pointerout', () => {
                btnBg.clear();
                btnBg.fillStyle(theme.border, 0.9);
                btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
            });
            btnHit.on('pointerdown', () => {
                if (this._acceptingContract) return; // Prevent double clicks
                if (window.audioManager) {
                    window.audioManager.playSFX('button_click');
                }
                this.showContractConfirmation(offer);
            });

            container.add([cg, innerG, bBg, bTxt, logoBg, logoTxt, nameTxt, leagueTxt, sepG, ...itemElements, btnBg, btnTxt, btnHit]);
        });

        // RIGHT PANEL - PLAYER PROFILE CARD
        this.renderPlayerProfileCardRight(container);

        if (this.contentContainer) this.contentContainer.add(container);
    }

    // =====================================================================
    // RIGHT SIDE PLAYER PROFILE CARD (MATCHING REFERENCE UI)
    // =====================================================================
    renderPlayerProfileCardRight(container) {
        const rightX = this.RIGHT_X;
        const rightY = this.TOP_Y;
        const rightW = this.RIGHT_W;
        const rightH = this.H - rightY - this.PAD;

        // Card Frame
        const pG = this.add.graphics();
        pG.fillStyle(0x050214, 0.94);
        pG.fillRoundedRect(rightX, rightY, rightW, rightH, 12);
        pG.lineStyle(1.5, 0x86198f, 0.6);
        pG.strokeRoundedRect(rightX, rightY, rightW, rightH, 12);

        // Header Title
        const pTitle = this.add.text(rightX + rightW / 2, rightY + 18, 'OYUNCU PROFİLİ', {
            font: '900 11.5px sans-serif', fill: '#d946ef', letterSpacing: 2
        }).setOrigin(0.5);

        // Profile Avatar & Info Row
        const profY = rightY + 38;
        const avR = 26;
        const avX = rightX + 38;
        const avY = profY + 26;

        const avBg = this.add.graphics();
        avBg.fillStyle(0x1e1b4b, 1);
        avBg.fillCircle(avX, avY, avR);
        avBg.lineStyle(2, 0xd946ef, 1);
        avBg.strokeCircle(avX, avY, avR);

        const avTxt = this.add.text(avX, avY, '👤', { font: '24px Arial' }).setOrigin(0.5);

        const profName = (window.gameState.player && window.gameState.player.name) || 'Özcan.';
        const pNameTxt = this.add.text(rightX + 76, profY + 8, profName, {
            font: '700 18px sans-serif', fill: '#ffffff'
        });

        const isRookie = !this.cw.started;
        const pRoleTxt = this.add.text(rightX + 76, profY + 30, isRookie ? 'FORVET  •  SEVİYE 1' : 'FORVET  •  SEVİYE 12', {
            font: '700 10px sans-serif', fill: '#38bdf8'
        });

        // GEN Rating Badge (Right)
        const genBadgeW = 48;
        const genBadgeH = 40;
        const genX = rightX + rightW - genBadgeW - 14;
        const genY = profY + 8;
        const genBg = this.add.graphics();
        genBg.fillStyle(0x062817, 1);
        genBg.fillRoundedRect(genX, genY, genBadgeW, genBadgeH, 8);
        genBg.lineStyle(1.5, 0x22c55e, 1);
        genBg.strokeRoundedRect(genX, genY, genBadgeW, genBadgeH, 8);

        const genLbl = this.add.text(genX + genBadgeW / 2, genY + 10, 'GEN', { font: '900 8.5px sans-serif', fill: '#22c55e' }).setOrigin(0.5);
        const genVal = this.add.text(genX + genBadgeW / 2, genY + 25, '74', { font: '700 16px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

        // XP Bar
        const xpY = profY + 62;
        const xpW = rightW - 28;
        const xpH = 7;
        const xpG = this.add.graphics();
        xpG.fillStyle(0x0f172a, 1);
        xpG.fillRoundedRect(rightX + 14, xpY, xpW, xpH, 4);
        xpG.fillStyle(0x38bdf8, 1);
        xpG.fillRoundedRect(rightX + 14, xpY, xpW * (isRookie ? 0 : 0.35), xpH, 4);

        const xpTxt = this.add.text(rightX + rightW / 2, xpY + 12, '1.620 / 7.500 XP', {
            font: '700 9px sans-serif', fill: '#64748b'
        }).setOrigin(0.5);

        // Separator Line
        const sepG = this.add.graphics();
        sepG.lineStyle(1, 0x1e293b, 0.6);
        sepG.lineBetween(rightX + 14, xpY + 24, rightX + rightW - 14, xpY + 24);

        // OYUNCU ÖZETİ (4 Stat Grid Boxes)
        const summaryY = xpY + 34;
        const sTitle = this.add.text(rightX + rightW / 2, summaryY, 'OYUNCU ÖZETİ', {
            font: '700 11px sans-serif', fill: '#64748b', letterSpacing: 1.5
        }).setOrigin(0.5);

        const gridY = summaryY + 12;
        const boxW = Math.floor((rightW - 36) / 4);
        const boxH = 42;

        const summaryStats = [
            { label: 'MAÇ', val: isRookie ? 0 : window.gameState.player.stats.matches },
            { label: 'GOL', val: isRookie ? 0 : window.gameState.player.stats.goals },
            { label: 'ASİST', val: isRookie ? 0 : window.gameState.player.stats.assists },
            { label: 'ORT. PUAN', val: isRookie ? '-' : window.gameState.player.stats.averageRating }
        ];

        const summaryElements = [];
        summaryStats.forEach((st, idx) => {
            const bx = rightX + 14 + idx * (boxW + 3);
            const bG = this.add.graphics();
            bG.fillStyle(0x0b0726, 0.9);
            bG.fillRoundedRect(bx, gridY, boxW, boxH, 6);
            bG.lineStyle(1, 0x1e293b, 0.8);
            bG.strokeRoundedRect(bx, gridY, boxW, boxH, 6);

            const sLbl = this.add.text(bx + boxW / 2, gridY + 10, st.label, { font: '700 8px sans-serif', fill: '#64748b' }).setOrigin(0.5);
            const sVal = this.add.text(bx + boxW / 2, gridY + 26, String(st.val), { font: '700 14px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

            summaryElements.push(bG, sLbl, sVal);
        });

        // NİTELİKLER (Attributes Bar List)
        const attrY = gridY + boxH + 14;
        const aTitle = this.add.text(rightX + rightW / 2, attrY, 'NİTELİKLER', {
            font: '700 11px sans-serif', fill: '#facc15', letterSpacing: 1.5
        }).setOrigin(0.5);

        const listY = attrY + 12;
        const defaultAttrVal = isRookie ? 60 : 58;
        const attributes = [
            { name: 'Hız', val: defaultAttrVal, color: 0x3b82f6 },
            { name: 'Dribbling', val: defaultAttrVal, color: 0x22c55e },
            { name: 'Şut', val: defaultAttrVal, color: 0xef4444 },
            { name: 'Pas', val: defaultAttrVal, color: 0x06b6d4 },
            { name: 'Fizik', val: defaultAttrVal, color: 0xa855f7 },
            { name: 'Dayanıklılık', val: defaultAttrVal, color: 0xeab308 }
        ];

        const attrElements = [];
        attributes.forEach((attr, idx) => {
            const ay = listY + idx * 22;
            const aIcon = this.add.text(rightX + 16, ay, '⚙️', { font: '10px Arial' });
            const aName = this.add.text(rightX + 32, ay + 1, attr.name, { font: '700 10px sans-serif', fill: '#94a3b8' });

            const barX = rightX + 115;
            const barW = rightW - 160;
            const barH = 5;
            const bG = this.add.graphics();
            bG.fillStyle(0x0f172a, 1);
            bG.fillRoundedRect(barX, ay + 4, barW, barH, 2.5);
            bG.fillStyle(attr.color, 1);
            bG.fillRoundedRect(barX, ay + 4, barW * (attr.val / 100), barH, 2.5);

            const aVal = this.add.text(rightX + rightW - 16, ay + 1, String(attr.val), { font: '900 10.5px sans-serif', fill: '#ffffff' }).setOrigin(1, 0);

            attrElements.push(aIcon, aName, bG, aVal);
        });

        // BOTTOM QUOTE CARD
        const quoteY = listY + attributes.length * 22 + 8;
        const quoteH = 42;
        const qG = this.add.graphics();
        qG.fillStyle(0x0a1428, 0.95);
        qG.fillRoundedRect(rightX + 14, quoteY, rightW - 28, quoteH, 8);
        qG.lineStyle(1, 0x1d4ed8, 0.5);
        qG.strokeRoundedRect(rightX + 14, quoteY, rightW - 28, quoteH, 8);

        const qIcon = this.add.text(rightX + 26, quoteY + quoteH / 2, '💬', { font: '16px Arial' }).setOrigin(0.5);
        const qTxt = this.add.text(rightX + 48, quoteY + quoteH / 2, 'Doğru kulübü seç, efsanevi bir kariyere\nilk adımını at.', {
            font: '600 10px sans-serif', fill: '#38bdf8', lineSpacing: 2
        }).setOrigin(0, 0.5);

        container.add([pG, pTitle, avBg, avTxt, pNameTxt, pRoleTxt, genBg, genLbl, genVal, xpG, xpTxt, sepG, sTitle, ...summaryElements, aTitle, ...attrElements, qG, qIcon, qTxt]);
    }

        showMidSeasonOfferPopup() {
        if (this._midSeasonModalOpen) return;
        this._midSeasonModalOpen = true;
        
        const offer = this.season.midSeasonOffer;
        if (!offer) return;
        
        const db = window.TeamDatabase;
        const newClub = db.getClub(offer.clubId);
        const cw = this.W;
        const ch = this.H;
        
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.9);
        overlay.fillRect(0, 0, cw, ch);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, cw, ch), Phaser.Geom.Rectangle.Contains);

        const panelW = 500;
        const panelH = 340;
        const panelX = cw / 2 - panelW / 2;
        const panelY = ch / 2 - panelH / 2;
        
        const panelBg = this.add.graphics();
        this.drawPanel(panelBg, panelX, panelY, panelW, panelH, { stroke: 0xfbbf24, fill: 0x0a0520, radius: 12 });

        const titleTxt = this.add.text(cw / 2, panelY + 30, '🚨 YENİ TRANSFER TEKLİFİ 🚨', {
            font: '900 20px sans-serif', fill: '#fbbf24'
        }).setOrigin(0.5);

        const msgTxt = this.add.text(cw / 2, panelY + 70, `${newClub.name} seni kadrosuna katmak istiyor!`, {
            font: '700 16px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);

        // Details
        const detBg = this.add.graphics();
        detBg.fillStyle(0x1e293b, 0.4);
        detBg.fillRoundedRect(panelX + 30, panelY + 100, panelW - 60, 140, 8);
        
        const currentPower = this.club ? this.club.overall : 50;
        const newPower = newClub.overall;
        
        const details = [
            `Lig: ${offer.leagueName}`,
            `Kulüp Gücü: ${newPower} (Eski Kulüp: ${currentPower})`,
            `Teklif Edilen Rol: ${offer.role}`,
            `Sözleşme: ${offer.contractLength}`,
            `İmza Parası: +${offer.signingBonus} EZ`
        ];
        
        const detTexts = [];
        details.forEach((txt, i) => {
            detTexts.push(this.add.text(panelX + 45, panelY + 115 + (i * 24), txt, {
                font: '600 13px sans-serif', fill: '#cbd5e1'
            }));
        });

        // Buttons
        const btnGroup = this.add.container(0, 0);

        const cancelX = panelX + 50;
        const acceptX = panelX + panelW / 2 + 20;
        const btnY = panelY + 270;
        const btnW = 180;
        const btnH = 45;

        // Cancel
        const cBg = this.add.graphics();
        cBg.fillStyle(0x334155, 1);
        cBg.fillRoundedRect(cancelX, btnY, btnW, btnH, 6);
        const cTxt = this.add.text(cancelX + btnW / 2, btnY + btnH / 2, 'KULÜPTE KAL', {
            font: '800 14px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);
        const cHit = this.add.zone(cancelX, btnY, btnW, btnH).setOrigin(0).setInteractive({ useHandCursor: true });
        
        cHit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.season.midSeasonOffer = null;
            if (window.SaveManager) window.SaveManager.save();
            
            overlay.destroy();
            panelBg.destroy();
            titleTxt.destroy();
            msgTxt.destroy();
            detBg.destroy();
            detTexts.forEach(t => t.destroy());
            btnGroup.destroy();
            this._midSeasonModalOpen = false;
        });

        // Accept
        const aBg = this.add.graphics();
        aBg.fillStyle(0xfbbf24, 1);
        aBg.fillRoundedRect(acceptX, btnY, btnW, btnH, 6);
        const aTxt = this.add.text(acceptX + btnW / 2, btnY + btnH / 2, 'TEKLİFİ KABUL ET', {
            font: '900 14px sans-serif', fill: '#000000'
        }).setOrigin(0.5);
        const aHit = this.add.zone(acceptX, btnY, btnW, btnH).setOrigin(0).setInteractive({ useHandCursor: true });

        aHit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('whistle');
            
            if (window.CareerManager) {
                window.CareerManager.acceptContractMidSeason(offer);
                this.cw = window.GameStateManager.getCareerData();
                this.season = this.cw;
                this.club = window.TeamDatabase.getClub(this.season.currentClubId);
            }
            
            overlay.destroy();
            panelBg.destroy();
            titleTxt.destroy();
            msgTxt.destroy();
            detBg.destroy();
            detTexts.forEach(t => t.destroy());
            btnGroup.destroy();
            this._midSeasonModalOpen = false;
            
            this.showToast(`Transfer Gerçekleşti! Yeni Kulüp: ${newClub.name}`, 0x22c55e);
            
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.restart();
            });
        });

        btnGroup.add([cBg, cTxt, cHit, aBg, aTxt, aHit]);
    }

showContractConfirmation(offer) {
        if (this._contractModalOpen) return;
        this._contractModalOpen = true;
        const db = window.TeamDatabase;
        const club = db.getClub(offer.clubId) || offer;
        const cw = this.W;
        const ch = this.H;
        
        // Overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.85);
        overlay.fillRect(0, 0, cw, ch);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, cw, ch), Phaser.Geom.Rectangle.Contains);

        const panelW = 400;
        const panelH = 220;
        const panelX = (cw - panelW) / 2;
        const panelY = (ch - panelH) / 2;

        const panel = this.add.graphics();
        panel.fillStyle(0x0a1628, 0.95);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        panel.lineStyle(2, club.primaryColor || 0x22c55e, 0.8);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);

        // Club logo (circle with initials)
        const logoBg = this.add.graphics();
        logoBg.fillStyle(club.primaryColor || 0x22c55e, 1);
        logoBg.fillCircle(panelX + panelW / 2, panelY + 40, 24);
        
        const shortName = offer.shortName || (offer.clubName ? offer.clubName.substring(0, 3).toUpperCase() : 'FC');
        const logoTxt = this.add.text(panelX + panelW / 2, panelY + 40, shortName, {
            font: '700 17px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);

        const msgTxt = this.add.text(panelX + panelW / 2, panelY + 90, `${offer.clubName} kulübünün\nteklifini kabul etmek istiyor musun?`, {
            font: '700 16px sans-serif', fill: '#ffffff', align: 'center', lineSpacing: 4
        }).setOrigin(0.5);

        const btnGroup = this.add.container(0, 0);

        // Cancel Button
        const cancelW = 140;
        const cancelH = 40;
        const cancelX = panelX + 40;
        const cancelY = panelY + 150;
        
        const cancelBg = this.add.graphics();
        cancelBg.fillStyle(0x334155, 1);
        cancelBg.fillRoundedRect(cancelX, cancelY, cancelW, cancelH, 8);
        const cancelTxt = this.add.text(cancelX + cancelW / 2, cancelY + cancelH / 2, 'VAZGEÇ', {
            font: '800 14px sans-serif', fill: '#cbd5e1'
        }).setOrigin(0.5);
        const cancelHit = this.add.rectangle(cancelX + cancelW / 2, cancelY + cancelH / 2, cancelW, cancelH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, cancelHit);
        
        cancelHit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            overlay.destroy();
            panel.destroy();
            logoBg.destroy();
            logoTxt.destroy();
            msgTxt.destroy();
            btnGroup.destroy();
            this._contractModalOpen = false;
        });

        // Accept Button
        const acceptW = 140;
        const acceptH = 40;
        const acceptX = panelX + panelW - 40 - acceptW;
        const acceptY = panelY + 150;

        const acceptBg = this.add.graphics();
        acceptBg.fillStyle(club.primaryColor || 0x22c55e, 1);
        acceptBg.fillRoundedRect(acceptX, acceptY, acceptW, acceptH, 8);
        const acceptTxt = this.add.text(acceptX + acceptW / 2, acceptY + acceptH / 2, 'TEKLİFİ KABUL ET', {
            font: '700 15px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);
        const acceptHit = this.add.rectangle(acceptX + acceptW / 2, acceptY + acceptH / 2, acceptW, acceptH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, acceptHit);

        acceptHit.on('pointerdown', () => {
            if (window.audioManager) {
                window.audioManager.playSFX('button_click');
                window.audioManager.playSFX('achievement_unlock_sfx');
            }
            overlay.destroy();
            panel.destroy();
            logoBg.destroy();
            logoTxt.destroy();
            msgTxt.destroy();
            btnGroup.destroy();
            this.executeContractAcceptance(offer, club);
        });

        btnGroup.add([cancelBg, cancelTxt, cancelHit, acceptBg, acceptTxt, acceptHit]);
    }

    executeContractAcceptance(offer, club) {
        if (this._contractAcceptInProgress) return;
        this._contractAcceptInProgress = true;

        try {
            if (window.CareerManager && window.CareerManager.acceptContract) {
                window.CareerManager.acceptContract(offer);
                this.cw = window.GameStateManager.getCareerData();
                this.season = this.cw;
            }
        } catch (e) {
            console.error('Contract acceptance failed:', e);
        }

        this.showSigningAnimation(offer, club);
    }

    showSigningAnimation(offer, club) {
        const cw = this.W;
        const ch = this.H;
        
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 1);
        overlay.fillRect(0, 0, cw, ch);
        overlay.setAlpha(0);
        
        const mainTxt = this.add.text(cw / 2, ch / 2 - 30, 'SÖZLEŞME İMZALANDI ✍️', {
            font: '700 33px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5).setAlpha(0).setShadow(0, 0, '#22c55e', 20, true, true);
        
        const subTxt = this.add.text(cw / 2, ch / 2 + 30, `${offer.clubName} kariyerin başlıyor.`, {
            font: '700 18px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5).setAlpha(0);

        // Sequence
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500,
            onComplete: () => {
                this.tweens.add({
                    targets: [mainTxt, subTxt],
                    alpha: 1,
                    y: '-=10',
                    duration: 500,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.time.delayedCall(2000, () => {
                            overlay.destroy();
                            mainTxt.destroy();
                            subTxt.destroy();
                            this.transitionToCareerCenter();
                        });
                    }
                });
            }
        });
    }

    transitionToCareerCenter() {
        this.activeTab = 'season';
        
        const db = window.TeamDatabase;
        const activeClubId = this.cw.currentClubId;
        this.club = (db && db.getClub && db.getClub(activeClubId)) || {
            id: 'basic_1', name: 'Lions FC', shortName: 'LIO', primaryColor: 0x00ffff, secondaryColor: 0xffffff, tier: 'BASIC', strength: 60, prestige: 30
        };
        this.league = (db && db.getLeague && db.getLeague(this.club.leagueId || this.club.league)) || { name: 'Türkiye Ligi', id: 'turkiye' };
        
        // Rebuild UI
        if (this.contentContainer) this.contentContainer.removeAll(true);
        this.createTabBar(); // Recreate tabs since 'offers' is no longer active
        this.renderTab('season');
        this._contractModalOpen = false;
        this._contractAcceptInProgress = false;
    }

    // =====================================================================
    // PROFILE TAB
    // =====================================================================
    renderProfileTab() {
        if (this.contentContainer) this.contentContainer.removeAll(true);
        const container = this.add.container(0, 0);
        this.renderPlayerProfileNew(container, this.PAD, this.TOP_Y, this.W - this.PAD * 2, this.H - this.TOP_Y - this.PAD);
        if (this.contentContainer) this.contentContainer.add(container);
    }

    getColorString(num) {
        if (typeof num === 'undefined' || num === null) return '#ffffff';
        return '#' + num.toString(16).padStart(6, '0');
    }

    _colorToHex(num) {
        return this.getColorString(num);
    }

    renderSeasonTabNew() {
        if (this.season && this.season.midSeasonOffer) {
            this.time.delayedCall(50, () => this.showMidSeasonOfferPopup());
        }

        const c = this.contentContainer;
        const y0 = this.TOP_Y;
        const totalW = this.W - this.PAD * 2;
        const colGap = this.PAD;

        // Guard: If season data is missing, fail safely
        if (!this.season.fixtures || this.season.fixtures.length === 0 || !this.season.standings || Object.keys(this.season.standings).length === 0) {
            console.error('[CAREER] Season data completely missing after repair attempt.');
            return;
        }

        // Calculate dynamic dimensions
        const w_left = Math.floor(totalW * 0.28);
        const w_mid = Math.floor(totalW * 0.38);
        const w_right = totalW - w_left - w_mid - colGap * 2;

        const x_left = this.PAD;
        const x_mid = x_left + w_left + colGap;
        const x_right = x_mid + w_mid + colGap;

        const availableH = this.H - y0 - this.PAD - 70; // 70px reserved for bottom bar
        const bottomY = this.H - 70;

        // ---- COLUMN 1: LEFT ----
        const h_clubInfo = 130;
        const h_hedeler = 170;
        const h_fixturePreview = availableH - h_clubInfo - h_hedeler - 16; // 8px * 2 gap

        this.renderClubInfoCardNew(c, x_left, y0, w_left, h_clubInfo);
        this.renderObjectivesNew(c, x_left, y0 + h_clubInfo + 8, w_left, h_hedeler);
        this.renderFixturePreviewNew(c, x_left, y0 + h_clubInfo + h_hedeler + 16, w_left, h_fixturePreview);

        // ---- COLUMN 2: MIDDLE ----
        const h_nextMatch = 190;
        const h_formStatus = 90;
        const h_miniTable = availableH - h_nextMatch - h_formStatus - 16;

        this.renderNextMatchNew(c, x_mid, y0, w_mid, h_nextMatch);
        this.renderFormStatusNew(c, x_mid, y0 + h_nextMatch + 8, w_mid, h_formStatus);
        this.renderMiniTableNew(c, x_mid, y0 + h_nextMatch + h_formStatus + 16, w_mid, h_miniTable);

        // ---- COLUMN 3: RIGHT ----
        this.renderPlayerProfileNew(c, x_right, y0, w_right, availableH);

        // ---- BOTTOM BAR ----
        this.renderBottomBarNew(c, this.PAD, bottomY, totalW, 54);
    }

    renderClubInfoCardNew(c, x, y, w, h) {
        const g = this.add.graphics();
        const primaryColorHex = this.club.primaryColor || 0xd946ef;
        this.drawPanel(g, x, y, w, h, { stroke: primaryColorHex, strokeAlpha: 0.8, fill: 0x050212 });
        g.fillStyle(primaryColorHex, 0.05);
        g.fillRoundedRect(x, y, w, h, 8);
        c.add(g);

        // Ambient team color glow
        const glowG = this.add.graphics();
        glowG.fillStyle(primaryColorHex, 0.15);
        glowG.fillCircle(x + 50, y + h / 2, 40);
        c.add(glowG);

        // Club badge
        const badgeX = x + 50, badgeY = y + h / 2;
        if (window.UIUtils && window.UIUtils.drawClubShield) {
            const sh = window.UIUtils.drawClubShield(this, badgeX, badgeY, this.club, 54);
            c.add(sh);
        } else {
            const badgeBg = this.add.graphics();
            badgeBg.fillStyle(0x0a0a2a, 0.95);
            badgeBg.fillCircle(badgeX, badgeY, 36);
            badgeBg.lineStyle(2, primaryColorHex, 0.9);
            badgeBg.strokeCircle(badgeX, badgeY, 36);
            c.add(badgeBg);
            c.add(this.add.circle(badgeX, badgeY, 28, primaryColorHex, 0.8).setStrokeStyle(3, this.club.secondaryColor || 0xffffff, 0.8));
            c.add(this.add.text(badgeX, badgeY, this.club.shortName ? this.club.shortName.substring(0, 3).toUpperCase() : 'FC', { font: '700 21px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        }

        // Details
        const infoX = x + 105;
        const clubNameStr = (this.club && this.club.name && this.club.name !== 'undefined') ? this.club.name.toUpperCase() : 'KULÜP';
        c.add(this.add.text(infoX, y + 16, clubNameStr, {
            font: '700 19px sans-serif', fill: '#ffffff', letterSpacing: 1.5
        }));
        
        const leagueNameStr = (this.league && this.league.name && this.league.name !== 'undefined') ? this.league.name.toUpperCase() : 'LİG';
        const leagueFlag = (this.league && this.league.flag) || (window.TeamDatabase && window.TeamDatabase.getLeagueFlag && window.TeamDatabase.getLeagueFlag(this.league ? this.league.id : null)) || '🇹🇷';
        c.add(this.add.text(infoX, y + 42, `${leagueFlag} ${leagueNameStr}`, {
            font: '800 11px sans-serif', fill: '#94a3b8', letterSpacing: 1
        }));

        // Acceptance success message
        c.add(this.add.text(infoX, y + 70, '✓ SÖZLEŞME İMZALANDI', {
            font: '700 11px sans-serif', fill: '#22c55e', letterSpacing: 1
        }));
        c.add(this.add.text(infoX, y + 86, `Kariyerin ${this.club.name} ile başladı.`, {
            font: '600 10px sans-serif', fill: '#64748b'
        }));
    }

    renderObjectivesNew(c, x, y, w, h) {
        const g = this.add.graphics();
        this.drawPanel(g, x, y, w, h, { stroke: 0x334155, strokeAlpha: 0.6, fill: 0x070913 });
        c.add(g);

        // Header Title
        c.add(this.add.text(x + 16, y + 12, '🎯 SEZON HEDEFLERİ', {
            font: '700 13px sans-serif', fill: '#d946ef', letterSpacing: 1.5
        }));

        const contract = this.cw.contract || this.cw.currentContract || this.cw.activeContract || {};
        const duration = contract.duration || contract.seasons || 1;
        const matchBonus = contract.matchBonus || 45;
        const goalBonus = contract.goalBonus || 24;
        const salary = contract.salary || contract.seasonSalary || 1400;
        const objective = contract.objective || 'Küme Düşme Hattından Uzak Dur';

        const details = [
            { label: 'Sözleşme Süresi', val: `${duration} Sezon`, icon: '📆' },
            { label: 'Maç Başı Prim', val: `+${matchBonus} EZ`, icon: '⚽' },
            { label: 'Gol Başı Prim', val: `+${goalBonus} EZ`, icon: '🎯' },
            { label: 'Ücret / Sezon', val: `${salary} EZ`, icon: '💰' },
            { label: 'HEDEF', val: objective.toUpperCase(), icon: '🏆', valColor: '#d946ef' }
        ];

        details.forEach((item, idx) => {
            const iy = y + 42 + idx * 24;
            c.add(this.add.text(x + 16, iy, `${item.icon}  ${item.label}`, {
                font: '800 11px sans-serif', fill: '#cbd5e1'
            }));
            c.add(this.add.text(x + w - 16, iy, item.val, {
                font: '700 12px sans-serif', fill: item.valColor || '#fbbf24'
            }).setOrigin(1, 0));
        });
    }

    renderFixturePreviewNew(c, x, y, w, h) {
        const g = this.add.graphics();
        this.drawPanel(g, x, y, w, h, { stroke: 0x334155, strokeAlpha: 0.6, fill: 0x05060b });
        c.add(g);

        c.add(this.add.text(x + 16, y + 12, '📅 FİKSTÜR ÖNİZLEMESİ', {
            font: '700 13px sans-serif', fill: '#00ffff', letterSpacing: 1.5
        }));

        const validSchedule = (this.season.fixtures || []).filter(m => m);
        const firstUnplayedIdx = validSchedule.findIndex(m => !m.completed);
        const currentIdx = Math.max(0, firstUnplayedIdx);
        const previewMatches = validSchedule.slice(currentIdx, currentIdx + 4);

        if (previewMatches.length === 0) {
            c.add(this.add.text(x + w / 2, y + h / 2, 'Gelecek maç bulunamadı.', {
                font: '700 11px sans-serif', fill: '#64748b'
            }).setOrigin(0.5));
            return;
        }

        previewMatches.forEach((match, idx) => {
            const iy = y + 40 + idx * 36;
            
            const opponentId = match.home === this.cw.currentClubId ? match.away : match.home;
            const oppClub = window.TeamDatabase.getClub(opponentId);
            const isHome = match.home === this.cw.currentClubId;
            const oppName = oppClub ? oppClub.name : 'BİLİNMEYEN TAKIM';

            // Week label
            const compStr = match.competition ? match.competition.toUpperCase() : 'LİG';
            const roundStr = match.round ? match.round.toString().toUpperCase() : '';
            c.add(this.add.text(x + 16, iy, `${compStr} - ${roundStr}`.substring(0, 15), {
                font: '700 11px sans-serif', fill: '#cbd5e1'
            }));

            // Team badge representation
            if (oppClub) {
                const bG = this.add.graphics();
                bG.fillStyle(oppClub.primaryColor || 0xffffff, 1);
                bG.fillCircle(x + 95, iy + 6, 8);
                c.add(bG);
            }

            // Opponent name
            c.add(this.add.text(x + 110, iy, oppName.substring(0, 15), {
                font: '700 11px sans-serif', fill: '#ffffff'
            }));

            // Location details
            const locText = isHome ? 'İç Saha' : 'Deplasman';
            const locIcon = isHome ? '🏠' : '✈';
            c.add(this.add.text(x + w - 16, iy, `${locText} ${locIcon}`, {
                font: '800 10px sans-serif', fill: isHome ? '#22c55e' : '#fbbf24'
            }).setOrigin(1, 0));
        });
    }

    renderNextMatchNew(c, x, y, w, h) {
        const g = this.add.graphics();
        const primaryColorHex = this.club.primaryColor || 0xd946ef;
        this.drawPanel(g, x, y, w, h, { stroke: primaryColorHex, strokeAlpha: 0.8, fill: 0x050212 });
        g.fillStyle(primaryColorHex, 0.03);
        g.fillRoundedRect(x, y, w, h, 8);
        c.add(g);

        c.add(this.add.text(x + 16, y + 12, 'SONRAKİ MAÇ', {
            font: '700 13px sans-serif', fill: '#ffffff', letterSpacing: 1.5
        }));

        const nextMatch = (this.season.fixtures || []).find(fixture => fixture.completed !== true);

        if (this.season.seasonCompleted === true || !nextMatch) {
            c.add(this.add.text(x + w / 2, y + h / 2, '🏆 SEZON BİTTİ!', {
                font: '700 17px sans-serif', fill: '#fbbf24'
            }).setOrigin(0.5));
            return;
        }

        // Round Tag
        const tagX = x + 16, tagY = y + 36;
        const tagBg = this.add.graphics();
        tagBg.fillStyle(0xd946ef, 0.2);
        
        const compStr = nextMatch.competition ? nextMatch.competition.toUpperCase() : 'LİG';
        const roundStr = nextMatch.round ? nextMatch.round.toString().toUpperCase() : '';
        const tagText = `${compStr} - ${roundStr}`;
        
        tagBg.fillRoundedRect(tagX, tagY, 140, 18, 4);
        c.add(tagBg);
        c.add(this.add.text(tagX + 70, tagY + 9, tagText, {
            font: '700 10px sans-serif', fill: '#d946ef'
        }).setOrigin(0.5));

        const opponentId = nextMatch.home === this.cw.currentClubId ? nextMatch.away : nextMatch.home;
        const oppClub = window.TeamDatabase.getClub(opponentId);
        const isHome = nextMatch.home === this.cw.currentClubId;
        const oppName = oppClub ? oppClub.name : 'BİLİNMEYEN TAKIM';

        // Logos & Vs layout
        const centerY = y + 80;
        
        // My logo
        const logo1X = x + w * 0.22;
        if (window.UIUtils && window.UIUtils.drawClubShield) {
            c.add(window.UIUtils.drawClubShield(this, logo1X, centerY - 10, this.club, 50));
        } else {
            const bG1 = this.add.graphics();
            bG1.fillStyle(primaryColorHex, 1);
            bG1.fillCircle(logo1X, centerY - 10, 24);
            c.add(bG1);
            c.add(this.add.text(logo1X, centerY - 10, this.club.shortName || 'MY', { font: '700 15px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        }
        c.add(this.add.text(logo1X, centerY + 26, this.club.shortName || 'KULÜBÜM', { font: '700 11px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5));

        // VS symbol
        c.add(this.add.text(x + w / 2, centerY - 10, 'VS', { font: '700 14px sans-serif', fill: '#64748b' }).setOrigin(0.5));

        // Opponent logo
        const logo2X = x + w * 0.78;
        if (oppClub) {
            if (window.UIUtils && window.UIUtils.drawClubShield) {
                c.add(window.UIUtils.drawClubShield(this, logo2X, centerY - 10, oppClub, 50));
            } else {
                const bG2 = this.add.graphics();
                bG2.fillStyle(oppClub.primaryColor || 0xffffff, 1);
                bG2.fillCircle(logo2X, centerY - 10, 24);
                c.add(bG2);
                c.add(this.add.text(logo2X, centerY - 10, oppClub.shortName || (oppClub.name ? oppClub.name.substring(0,3).toUpperCase() : 'CLB'), { font: '700 15px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
            }
        }
        c.add(this.add.text(logo2X, centerY + 26, oppClub ? (oppClub.shortName || oppClub.name) : 'Club', { font: '700 11px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5));

        // Sub information bar
        const infoY = y + 128;
        const homeClub = isHome ? window.TeamDatabase.getClub(this.cw.currentClubId) : oppClub;
        const stadiumName = this.getClubStadium(homeClub).toUpperCase();
        const infoText = `🌐 ${this.league.name.toUpperCase()}   |   🏟️ ${stadiumName}   |   ${isHome ? '🏠 İÇ SAHA' : '✈ DEPLASMAN'}`;
        c.add(this.add.text(x + w / 2, infoY, infoText, {
            font: '800 10px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5));

        // Big PLAY button
        const btnW = w - 32;
        const btnH = 34;
        const btnX = x + 16;
        const btnY = y + 146;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xd946ef, 1);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
        c.add(btnBg);

        const btnTxt = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'OYNA ▶', {
            font: '700 14px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);
        c.add(btnTxt);

        const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
        c.add(btnHit);

        btnHit.on('pointerover', () => {
            btnBg.clear();
            btnBg.fillStyle(primaryColorHex, 1);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
        });
        btnHit.on('pointerout', () => {
            btnBg.clear();
            btnBg.fillStyle(0xd946ef, 1);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
        });
        btnHit.on('pointerdown', () => {
            this.startMatch(nextMatch, opponentId, isHome);
        });

        this.tweens.add({ targets: btnBg, alpha: 0.9, duration: 800, yoyo: true, repeat: -1 });
    }

    renderFormStatusNew(c, x, y, w, h) {
        const g = this.add.graphics();
        this.drawPanel(g, x, y, w, h, { stroke: 0x334155, strokeAlpha: 0.6, fill: 0x05070f });
        c.add(g);

        c.add(this.add.text(x + 16, y + 12, '📈 FORM DURUMU', {
            font: '700 13px sans-serif', fill: '#cbd5e1', letterSpacing: 1.5
        }));

        const formList = (this.season.standings && this.season.standings[this.cw.currentClubId] && this.season.standings[this.cw.currentClubId].form) || [];
        const maxSlots = 6;
        const colW = Math.floor((w - 32) / maxSlots);

        for (let i = 0; i < maxSlots; i++) {
            const rx = x + 16 + i * colW;
            const ry = y + 36;
            const res = formList[i] || '-';
            
            const capsule = this.add.graphics();
            let colHex = 0x1e293b;
            let colStr = '#64748b';
            if (res === 'W' || res === 'G') { colHex = 0x22c55e; colStr = '#22c55e'; }
            else if (res === 'D' || res === 'B') { colHex = 0xfbbf24; colStr = '#fbbf24'; }
            else if (res === 'L' || res === 'M') { colHex = 0xef4444; colStr = '#ef4444'; }

            capsule.fillStyle(colHex, 0.2);
            capsule.fillRoundedRect(rx + 2, ry, colW - 4, 26, 4);
            capsule.lineStyle(1, colHex, 0.8);
            capsule.strokeRoundedRect(rx + 2, ry, colW - 4, 26, 4);
            c.add(capsule);

            c.add(this.add.text(rx + colW / 2, ry + 13, res, {
                font: '700 12px sans-serif', fill: colStr
            }).setOrigin(0.5));
        }

        c.add(this.add.text(x + 16, y + 70, 'Sezon Başlangıcı', { font: '700 8.5px sans-serif', fill: '#475569' }));
    }

    renderMiniTableNew(c, x, y, w, h) {
        const g = this.add.graphics();
        this.drawPanel(g, x, y, w, h, { stroke: 0x334155, strokeAlpha: 0.6, fill: 0x05060b });
        c.add(g);

        // Determine if player is in a European group
        let euroCup = null;
        let euroGroup = null;
        if (this.cw && this.cw.cups) {
            ['champions_cup', 'europa_cup', 'conference_cup'].forEach(cupKey => {
                const cup = this.cw.cups[cupKey];
                if (cup && cup.groups) {
                    Object.keys(cup.groups).forEach(gName => {
                        if (cup.groups[gName].standings[this.cw.currentClubId]) {
                            euroCup = cup;
                            euroGroup = cup.groups[gName];
                        }
                    });
                }
            });
        }

        const titleText = this.add.text(x + 16, y + 12, '🏆 LİG TABLOSU', {
            font: '700 13px sans-serif', fill: '#38bdf8', letterSpacing: 1.5
        });
        c.add(titleText);

        const activeLeagueId = (this.cw && (this.cw.currentLeagueId || (this.cw.currentClub && (this.cw.currentClub.leagueId || this.cw.currentClub.league)))) || 'SUPER_LIG';
        const tableData = window.CareerManager ? window.CareerManager.getSortedTable(activeLeagueId) : [];
        const userIdx = tableData.findIndex(t => t.clubId === this.cw.currentClubId);
        
        let start = Math.max(0, userIdx - 1);
        if (start + 4 > tableData.length) start = Math.max(0, tableData.length - 4);
        let sliceTeams = tableData.slice(start, start + 4);

        if (euroCup) {
            titleText.setInteractive({ useHandCursor: true });
            titleText.on('pointerdown', () => {
                this.showEuroTable = !this.showEuroTable;
                this.createSidePanels(); // Re-render
            });
            
            // Add a small hint arrow
            c.add(this.add.text(x + w - 24, y + 12, '🔁', { font: '12px sans-serif' }).setOrigin(0.5, 0));
        }
        
        let displayTitle = '🏆 LİG TABLOSU';
        if (this.showEuroTable && euroCup) {
            displayTitle = `🌍 GRUP ${euroGroup.name.replace('Group ', '')}`;
            titleText.setText(displayTitle);
            
            const euroData = Object.values(euroGroup.standings);
            euroData.sort((a,b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
            sliceTeams = euroData.slice(0, 4); // Show top 4
        }

        // Header Row
        const hrY = y + 36;
        c.add(this.add.text(x + 20, hrY, '#', { font: '700 11px sans-serif', fill: '#64748b' }));
        c.add(this.add.text(x + 50, hrY, 'TAKIM', { font: '700 11px sans-serif', fill: '#64748b' }));
        c.add(this.add.text(x + w - 120, hrY, 'OYN', { font: '700 11px sans-serif', fill: '#64748b' }).setOrigin(0.5, 0));
        c.add(this.add.text(x + w - 80, hrY, 'G', { font: '700 11px sans-serif', fill: '#64748b' }).setOrigin(0.5, 0));
        c.add(this.add.text(x + w - 40, hrY, 'P', { font: '700 11px sans-serif', fill: '#64748b' }).setOrigin(0.5, 0));

        sliceTeams.forEach((row, idx) => {
            const ry = y + 58 + idx * 28;
            const isPlayer = row.clubId === this.cw.currentClubId;
            let actualRank = idx + 1;
            
            if (!this.showEuroTable) {
                actualRank = tableData.indexOf(row) + 1;
            }

            if (isPlayer) {
                const highlight = this.add.graphics();
                highlight.fillStyle(0xd946ef, 0.1);
                highlight.fillRoundedRect(x + 12, ry - 4, w - 24, 24, 4);
                highlight.lineStyle(1.5, 0xd946ef, 0.15);
                highlight.strokeRoundedRect(x + 12, ry - 4, w - 24, 24, 4);
                c.add(highlight);
            }

            c.add(this.add.text(x + 20, ry + 2, `${actualRank}`, { font: '700 12px sans-serif', fill: isPlayer ? '#ffffff' : '#cbd5e1' }));
            
            // Badge representation
            const clubObj = window.TeamDatabase.getClub(row.clubId);
            if (clubObj) {
                const bG = this.add.graphics();
                bG.fillStyle(clubObj.primaryColor || 0xffffff, 1);
                bG.fillCircle(x + 48, ry + 8, 5);
                c.add(bG);
            }

            c.add(this.add.text(x + 60, ry + 2, row.name.toUpperCase().substring(0, 16), {
                font: isPlayer ? '900 11px sans-serif' : '700 11px sans-serif', fill: isPlayer ? '#ffffff' : '#cbd5e1'
            }));

            c.add(this.add.text(x + w - 120, ry + 2, `${row.played}`, { font: '800 11px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5, 0));
            c.add(this.add.text(x + w - 80, ry + 2, `${row.wins}`, { font: '800 11px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5, 0));
            c.add(this.add.text(x + w - 40, ry + 2, `${row.points}`, { font: '700 12px sans-serif', fill: isPlayer ? '#ffffff' : '#38bdf8' }).setOrigin(0.5, 0));
        });

        // View Full Table Button
        const btnY = y + h - 28;
        c.add(this.add.text(x + w / 2, btnY, 'TAM TABLOYU GÖR ▶', {
            font: '700 11px sans-serif', fill: '#d946ef'
        }).setOrigin(0.5));
        const btnHit = this.add.rectangle(x + w / 2, btnY, w - 40, 20, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
        c.add(btnHit);
        btnHit.on('pointerdown', () => {
            this.activeTab = 'table';
            this.createTabBar();
            this.renderTab('table');
        });
    }

    renderPlayerProfileNew(c, x, y, w, h) {
        const g = this.add.graphics();
        this.drawPanel(g, x, y, w, h, { stroke: 0xd946ef, strokeAlpha: 0.6, fill: 0x070114 });
        g.fillStyle(0xd946ef, 0.02);
        g.fillRoundedRect(x, y, w, h, 8);
        c.add(g);

        c.add(this.add.text(x + w / 2, y + 16, 'OYUNCU PROFİLİ', {
            font: '700 13px sans-serif', fill: '#d946ef', letterSpacing: 2
        }).setOrigin(0.5));

        // Profile Avatar
        const avX = x + 50, avY = y + 60;
        c.add(this.add.circle(avX, avY, 32, 0xd946ef, 0.15));
        const avBg = this.add.graphics();
        avBg.fillStyle(0x0c1030, 0.95);
        avBg.fillCircle(avX, avY, 26);
        avBg.lineStyle(1.5, 0xd946ef, 0.15);
        avBg.strokeCircle(avX, avY, 26);
        c.add(avBg);
        c.add(this.add.text(avX, avY, '🧑‍🎤', { font: '24px Arial' }).setOrigin(0.5));

        // Name and position info
        const nameX = x + 95;
        const playerName = window.gameState.player.name || window.gameState.player.username || 'OYUNCU';
        c.add(this.add.text(nameX, y + 36, playerName.toUpperCase(), { font: '700 19px sans-serif', fill: '#ffffff', letterSpacing: 1 }));
        c.add(this.add.text(nameX, y + 58, `FORVET • SEVİYE ${window.gameState.player.level || 1}`, { font: '800 10px sans-serif', fill: '#94a3b8' }));

        // Overall badge (GEN)
        const genX = x + w - 42;
        const genY = y + 54;
        const genBg = this.add.graphics();
        genBg.fillStyle(0x0a1a10, 0.85);
        genBg.fillRoundedRect(genX - 22, genY - 22, 44, 44, 6);
        genBg.lineStyle(1.5, 0x22c55e, 0.8);
        genBg.strokeRoundedRect(genX - 22, genY - 22, 44, 44, 6);
        c.add(genBg);
        c.add(this.add.text(genX, genY - 11, 'GEN', { font: '900 8.5px sans-serif', fill: '#22c55e' }).setOrigin(0.5));
        
        const ps = window.gameState.player.attributes;
        const genVal = window.gameState.player.overall || 50;
        c.add(this.add.text(genX, genY + 8, `${genVal}`, { font: '700 23px sans-serif', fill: '#ffffff' }).setOrigin(0.5));

        // XP Bar
        const level = window.gameState.player.level || 1;
        const xp = window.gameState.player.xp || 0;
        const xpNext = level * 500;
        const barY = y + 90;
        const barW = w - 40;
        const barFillG = this.add.graphics();
        this.drawBar(barFillG, x + 20, barY, barW, 6, xp / xpNext, 0x38bdf8, 0x1e293b);
        c.add(barFillG);
        c.add(this.add.text(x + w - 20, barY + 12, `${xp} / ${xpNext} XP`, { font: '800 9px sans-serif', fill: '#94a3b8' }).setOrigin(1, 0));

        // Summary Title
        const sumY = y + 118;
        c.add(this.add.text(x + w / 2, sumY, 'OYUNCU ÖZETİ', { font: '700 11px sans-serif', fill: '#d946ef', letterSpacing: 1.5 }).setOrigin(0.5));

        // Summary cards row (single source: actual match history)
        const stats = this.season.seasonStats || { goals: 0, assists: 0, matchesPlayed: 0, totalRating: 0 };
        const actualPlayed = (this.season.completedMatches && Array.isArray(this.season.completedMatches)) ? 
            this.season.completedMatches.length : (stats.matchesPlayed || 0);
        const avgRating = actualPlayed > 0 && stats.totalRating ? (stats.totalRating / actualPlayed).toFixed(1) : '—';

        const summaryStats = [
            { label: 'MAÇ', val: actualPlayed },
            { label: 'GOL', val: stats.goals || 0 },
            { label: 'ASİST', val: stats.assists || 0 },
            { label: 'ORT. PUAN', val: avgRating }
        ];

        const cardW = Math.floor((w - 40) / 4);
        summaryStats.forEach((s, i) => {
            const cx = x + 20 + i * cardW;
            const cy = y + 132;
            const bg = this.add.graphics();
            bg.fillStyle(0x0f0b22, 0.9);
            bg.fillRoundedRect(cx + 2, cy, cardW - 4, 48, 6);
            bg.lineStyle(1, 0x1e293b, 0.5);
            bg.strokeRoundedRect(cx + 2, cy, cardW - 4, 48, 6);
            c.add(bg);

            c.add(this.add.text(cx + cardW / 2, cy + 14, `${s.val}`, { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
            c.add(this.add.text(cx + cardW / 2, cy + 34, s.label, { font: '800 8.5px sans-serif', fill: '#64748b' }).setOrigin(0.5));
        });

        // Attributes title
        const attTitleY = y + 196;
        c.add(this.add.text(x + w / 2, attTitleY, 'NİTELİKLER', { font: '700 11px sans-serif', fill: '#fbbf24', letterSpacing: 1.5 }).setOrigin(0.5));

        // Attributes bars
        const attributes = [
            { label: 'Hız', val: ps.speed || 50, color: 0x3b82f6 },
            { label: 'Dribbling', val: ps.dribbling || 50, color: 0x22c55e },
            { label: 'Şut', val: ps.shooting || 50, color: 0xef4444 },
            { label: 'Pas', val: ps.passing || 50, color: 0x06b6d4 },
            { label: 'Fizik', val: ps.physical || 50, color: 0xa855f7 },
            { label: 'Dayanıklılık', val: ps.stamina || 50, color: 0xf59e0b }
        ];

        attributes.forEach((attr, idx) => {
            const ay = y + 210 + idx * 26;
            const barWidth = w - 160;
            c.add(this.add.text(x + 20, ay, `⚙ ${attr.label}`, { font: '800 10.5px sans-serif', fill: '#cbd5e1' }));
            
            const bG = this.add.graphics();
            this.drawBar(bG, x + 110, ay - 2, barWidth, 6, attr.val / 100, attr.color, 0x1e293b);
            c.add(bG);

            c.add(this.add.text(x + w - 20, ay, `${attr.val}`, { font: '700 12px sans-serif', fill: '#ffffff' }).setOrigin(1, 0.5));
        });

        // Quote Box
        const qY = y + h - 50;
        const qG = this.add.graphics();
        qG.fillStyle(0x0a1428, 0.95);
        qG.fillRoundedRect(x + 16, qY, w - 32, 38, 6);
        qG.lineStyle(1, 0x1d4ed8, 0.4);
        qG.strokeRoundedRect(x + 16, qY, w - 32, 38, 6);
        c.add(qG);

        c.add(this.add.text(x + 28, qY + 19, '💬', { font: '14px Arial' }).setOrigin(0.5));
        c.add(this.add.text(x + 46, qY + 19, 'Doğru kulübü seç, efsanevi bir kariyere\nilk adımını at.', {
            font: '600 9.5px sans-serif', fill: '#38bdf8'
        }).setOrigin(0, 0.5));
    }

    renderBottomBarNew(c, x, y, w, h) {
        const bg = this.add.graphics();
        this.drawPanel(bg, x, y, w, h, { stroke: 0x334155, strokeAlpha: 0.6, fill: 0x05060b });
        c.add(bg);

        // Trophy / Welcome message
        c.add(this.add.circle(x + 30, y + h / 2, 16, 0x38bdf8, 0.15));
        c.add(this.add.text(x + 30, y + h / 2, '🏆', { font: '16px Arial' }).setOrigin(0.5));
        
        const clubNameStr = this.club && this.club.name ? this.club.name.toUpperCase() : 'KULÜBÜN';
        c.add(this.add.text(x + 60, y + 14, 'KARİYERİN BAŞLADI!', { font: '700 12px sans-serif', fill: '#ffffff' }));
        c.add(this.add.text(x + 60, y + 30, `${clubNameStr} ile hedeflerine ulaşmak için sahaya çık.`, { font: '800 9.5px sans-serif', fill: '#94a3b8' }));

        // Only one prominent GELİŞİM MERKEZİ card
        const cardW = 240;
        const cx = x + w - 16 - cardW;
        const cy = y + 8;
        
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x0f172a, 0.9);
        cardBg.fillRoundedRect(cx, cy, cardW, h - 16, 6);
        cardBg.lineStyle(1.5, 0xd946ef, 0.15);
        cardBg.strokeRoundedRect(cx, cy, cardW, h - 16, 6);
        c.add(cardBg);

        // Neon ambient glow on the card
        const cardGlow = this.add.graphics();
        cardGlow.fillStyle(0xd946ef, 0.05);
        cardGlow.fillRoundedRect(cx, cy, cardW, h - 16, 6);
        c.add(cardGlow);

        c.add(this.add.text(cx + 12, cy + 10, 'GELİŞİM MERKEZİ ⚡', { font: '700 11px sans-serif', fill: '#ffffff', letterSpacing: 0.5 }));
        c.add(this.add.text(cx + 12, cy + 22, 'Oyuncunu geliştir, potansiyelini ortaya çıkar', { font: '700 8px sans-serif', fill: '#d946ef' }));

        // Right arrow
        c.add(this.add.text(cx + cardW - 14, cy + (h - 16) / 2, '▶', { font: '700 13px sans-serif', fill: '#d946ef' }).setOrigin(0.5));

        const hit = this.add.rectangle(cx + cardW / 2, cy + (h - 16) / 2, cardW, h - 16, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
        c.add(hit);

        hit.on('pointerover', () => {
            cardBg.clear();
            cardBg.fillStyle(0xd946ef, 0.2);
            cardBg.fillRoundedRect(cx, cy, cardW, h - 16, 6);
            cardBg.lineStyle(1.5, 0x00ffff, 0.15);
            cardBg.strokeRoundedRect(cx, cy, cardW, h - 16, 6);
        });
        hit.on('pointerout', () => {
            cardBg.clear();
            cardBg.fillStyle(0x0f172a, 0.9);
            cardBg.fillRoundedRect(cx, cy, cardW, h - 16, 6);
            cardBg.lineStyle(1.5, 0xd946ef, 0.15);
            cardBg.strokeRoundedRect(cx, cy, cardW, h - 16, 6);
        });

        hit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.activeTab = 'gelisim';
            this.createTabBar();
            this.renderTab('gelisim');
        });
    }

    renderGelisimTab() {
        if (this.contentContainer) {
            this.contentContainer.removeAll(true);
        }
        const c = this.contentContainer;
        // Shift content up since tab bar is hidden
        const y0 = this.HEADER_H;
        const totalW = this.W - this.PAD * 2;
        const colGap = 16;

        // Player Stats check/load
        const ps = window.gameState.player.attributes;
        const genVal = window.gameState.player.overall || 50;

        // Initialize default selected upgrade if none is active
        if (!this.selectedUpgrade) {
            this.selectedUpgrade = {
                statKey: 'speed',
                targetValue: Math.min(100, (ps.speed || 50) + 10),
                label: 'HIZ'
            };
        }

        // Layout variables
        const w_left = 220;
        const x_left = this.PAD;
        const x_main = x_left + w_left + colGap;
        const w_main = totalW - w_left - colGap;
        const availableH = this.H - y0 - this.PAD;

        // =====================================================================
        // COLUMN 1: LEFT USER INFO PANEL
        // =====================================================================
        const leftPanel = this.add.graphics();
        leftPanel.fillStyle(0x05010a, 0.95);
        leftPanel.fillRoundedRect(x_left, y0, w_left, availableH, 12);
        leftPanel.lineStyle(1, 0xd946ef, 0.15);
        leftPanel.strokeRoundedRect(x_left, y0, w_left, availableH, 12);
        // Inner top accent line
        leftPanel.lineStyle(2, 0xd946ef, 0.15);
        leftPanel.lineBetween(x_left + 12, y0 + 1, x_left + w_left - 12, y0 + 1);
        c.add(leftPanel);

        // Profile Avatar Group
        const avX = x_left + 38, avY = y0 + 38;
        const avBg = this.add.graphics();
        avBg.fillStyle(0x0f0b22, 1);
        avBg.fillCircle(avX, avY, 24);
        avBg.lineStyle(2.5, 0xd946ef, 1);
        avBg.strokeCircle(avX, avY, 24);
        // Subtle outer ring
        avBg.lineStyle(1, 0xd946ef, 0.15);
        avBg.strokeCircle(avX, avY, 28);
        c.add(avBg);
        c.add(this.add.text(avX, avY, '👦', { font: '22px Arial' }).setOrigin(0.5));

        const playerName = window.gameState.player.name || window.gameState.player.username || 'OYUNCU';
        c.add(this.add.text(x_left + 72, y0 + 25, playerName.toUpperCase(), { font: '700 16px sans-serif', fill: '#ffffff', letterSpacing: 1 }));
        c.add(this.add.text(x_left + 72, y0 + 44, `FORVET • SEVİYE ${window.gameState.player.level || 1}`, { font: '700 9px sans-serif', fill: '#94a3b8', letterSpacing: 0.5 }));

        // Separator
        const sep1 = this.add.graphics();
        sep1.lineStyle(1, 0x1e293b, 0.5);
        sep1.lineBetween(x_left + 16, y0 + 68, x_left + w_left - 16, y0 + 68);
        c.add(sep1);

        // GEN badge — premium hexagonal feel
        const genX = x_left + w_left / 2;
        const genY = y0 + 102;
        const genBg = this.add.graphics();
        // Outer glow
        genBg.fillStyle(0xd946ef, 0.08);
        genBg.fillRoundedRect(genX - 40, genY - 30, 80, 60, 14);
        // Main badge
        genBg.fillStyle(0x0d0520, 1);
        genBg.fillRoundedRect(genX - 36, genY - 26, 72, 52, 12);
        genBg.lineStyle(2, 0xd946ef, 0.15);
        genBg.strokeRoundedRect(genX - 36, genY - 26, 72, 52, 12);
        c.add(genBg);
        
        c.add(this.add.text(genX, genY - 16, 'GEN', { font: '800 9px sans-serif', fill: '#d946ef', letterSpacing: 2 }).setOrigin(0.5));
        const genText = this.add.text(genX, genY + 10, `${genVal}`, { font: '700 31px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        genText.setShadow(0, 0, '#d946ef', 6, true, true);
        c.add(genText);

        // MEVCUT ÖZELLİKLER title
        const listStartY = y0 + 152;
        const attrTitle = this.add.text(x_left + 16, listStartY, 'ÖZELLİKLER', { font: '800 10px sans-serif', fill: '#a78bfa', letterSpacing: 2 });
        c.add(attrTitle);
        // Title underline
        const titleLine = this.add.graphics();
        titleLine.lineStyle(1, 0xa78bfa, 0.3);
        titleLine.lineBetween(x_left + 16, listStartY + 16, x_left + w_left - 16, listStartY + 16);
        c.add(titleLine);

        // Attributes vertical list
        const attributesList = [
            { key: 'speed', label: 'HIZ', color: 0x3b82f6, icon: '🏃' },
            { key: 'dribbling', label: 'DRİBLİNG', color: 0x22c55e, icon: '⚽' },
            { key: 'shooting', label: 'ŞUT', color: 0xef4444, icon: '🎯' },
            { key: 'passing', label: 'PAS', color: 0x06b6d4, icon: '💫' },
            { key: 'physical', label: 'FİZİK', color: 0xa855f7, icon: '💪' },
            { key: 'stamina', label: 'DAYANIKLILIK', color: 0xf59e0b, icon: '⚡' }
        ];

        attributesList.forEach((attr, idx) => {
            const ay = listStartY + 28 + idx * 34;
            const val = ps[attr.key] || 50;
            const barW = w_left - 70;

            // Icon
            c.add(this.add.text(x_left + 16, ay + 2, attr.icon, { font: '12px Arial' }).setOrigin(0, 0.5));
            // Label
            c.add(this.add.text(x_left + 34, ay + 2, attr.label, { font: '700 10px sans-serif', fill: '#94a3b8' }).setOrigin(0, 0.5));
            // Value — bold, right-aligned, prominent
            const valText = this.add.text(x_left + w_left - 16, ay + 2, `${val}`, { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(1, 0.5);
            c.add(valText);

            // Progress bar — track
            const bar = this.add.graphics();
            bar.fillStyle(0x1e293b, 0.6);
            bar.fillRoundedRect(x_left + 16, ay + 13, barW, 5, 2.5);
            // Progress bar — fill with subtle glow
            const fillW = barW * (val / 100);
            if (fillW > 0) {
                bar.fillStyle(attr.color, 0.3);
                bar.fillRoundedRect(x_left + 16, ay + 11, fillW, 9, 4);
                bar.fillStyle(attr.color, 1);
                bar.fillRoundedRect(x_left + 16, ay + 13, fillW, 5, 2.5);
            }
            c.add(bar);
        });

        // KULLANILABİLİR EZ at the bottom
        const ezBoxH = 54;
        const ezBoxY = y0 + availableH - ezBoxH - 12;
        const ezBg = this.add.graphics();
        ezBg.fillStyle(0x0a0902, 0.9);
        ezBg.fillRoundedRect(x_left + 12, ezBoxY, w_left - 24, ezBoxH, 10);
        ezBg.lineStyle(1.5, 0xfbbf24, 0.7);
        ezBg.strokeRoundedRect(x_left + 12, ezBoxY, w_left - 24, ezBoxH, 10);
        // Top accent
        ezBg.lineStyle(2, 0xfbbf24, 0.5);
        ezBg.lineBetween(x_left + 24, ezBoxY + 1, x_left + w_left - 24, ezBoxY + 1);
        c.add(ezBg);

        c.add(this.add.text(x_left + w_left / 2, ezBoxY + 16, 'KULLANILABİLİR EZ', { font: '700 8px sans-serif', fill: '#94a3b8', letterSpacing: 1.5 }).setOrigin(0.5));
        const formattedEz = (window.gameState.career.ez || 0).toLocaleString('tr-TR');
        const ezValText = this.add.text(x_left + w_left / 2, ezBoxY + 36, `${formattedEz} EZ`, { font: '700 21px sans-serif', fill: '#fbbf24' }).setOrigin(0.5);
        ezValText.setShadow(0, 0, '#fbbf24', 6, true, true);
        c.add(ezValText);

        // =====================================================================
        // COLUMN 2: CENTER AREA (MASCOT & NEON GROWTH TREE)
        // =====================================================================
        const mainPanel = this.add.graphics();
        mainPanel.fillStyle(0x020106, 0.9);
        mainPanel.fillRoundedRect(x_main, y0, w_main, availableH, 12);
        c.add(mainPanel);

        const centerX = x_main + w_main / 2;
        const treeCenterY = y0 + 190;

        // Mascot Circular Platform & Ball
        this.drawMascot(c, centerX, treeCenterY);

        // Branch Configurations
        const statKeys = {
            speed: { label: 'HIZ', icon: '🏃', color: 0x3b82f6, desc: 'Oyuncunun maksimum koşu hızı ve hızlanma yeteneğini artırır.' },
            dribbling: { label: 'DRİBLİNG', icon: '⚽', color: 0x22c55e, desc: 'Top sürme, dönüş hızı ve dar alanda top kontrolünü iyileştirir.' },
            shooting: { label: 'ŞUT', icon: '🎯', color: 0xef4444, desc: 'Şut gücünü ve kaleyi bulan şutların isabet oranını artırır.' },
            passing: { label: 'PAS', icon: '💫', color: 0x06b6d4, desc: 'Pas hızını ve pas atarken hata yapma olasılığını azaltır.' },
            physical: { label: 'FİZİK', icon: '💪', color: 0xa855f7, desc: 'İkili mücadele gücünü ve top çalma başarısını artırır.' },
            stamina: { label: 'DAYANIKLILIK', icon: '⚡', color: 0xf59e0b, desc: 'Stamina kapasitesini artırır ve maç içinde daha geç yorulmayı sağlar.' }
        };

        const branches = [
            { key: 'speed', side: 'left', row: 0 },
            { key: 'dribbling', side: 'right', row: 0 },
            { key: 'shooting', side: 'left', row: 1 },
            { key: 'passing', side: 'right', row: 1 },
            { key: 'physical', side: 'left', row: 2 },
            { key: 'stamina', side: 'right', row: 2 }
        ];

        const rowYs = [treeCenterY - 110, treeCenterY, treeCenterY + 110];
        const stepSpacing = 44;
        const steps = [50, 60, 70, 80, 90, 100];
        const nodePrices = { 60: 300, 70: 600, 80: 800, 90: 1200, 100: 1800 }; // Match visual prices for 70

        // Draw connections and nodes
        branches.forEach(b => {
            const keyInfo = statKeys[b.key];
            const ry = rowYs[b.row];
            const currentStatVal = ps[b.key] || 50;

            // Draw Branch Title Capsule
            const titleX = b.side === 'left' ? centerX - 190 : centerX + 190;
            const capG = this.add.graphics();
            capG.fillStyle(0x0a051d, 1);
            capG.fillRoundedRect(titleX - 60, ry - 38, 120, 24, 12);
            capG.lineStyle(1.5, keyInfo.color, 1);
            capG.strokeRoundedRect(titleX - 60, ry - 38, 120, 24, 12);
            c.add(capG);
            
            c.add(this.add.text(titleX, ry - 26, `${keyInfo.icon}  ${keyInfo.label}`, {
                font: '800 11px sans-serif', fill: '#ffffff'
            }).setOrigin(0.5));

            // Connection line drawing
            const connG = this.add.graphics();
            c.add(connG);

            // Connect closest node to hexagon
            const hexEdgeX = b.side === 'left' ? centerX - 65 : centerX + 65;
            const closestNodeX = b.side === 'left' ? centerX - 90 : centerX + 90;
            connG.lineStyle(2, keyInfo.color, currentStatVal >= 50 ? 1.0 : 0.2);
            
            connG.beginPath();
            connG.moveTo(hexEdgeX, treeCenterY);
            if (b.row === 1) { 
                connG.lineTo(closestNodeX, ry);
            } else { 
                connG.lineTo(hexEdgeX + (b.side === 'left' ? -20 : 20), ry);
                connG.lineTo(closestNodeX, ry);
            }
            connG.strokePath();

            steps.forEach((stepVal, idx) => {
                const nodeOffset = 90 + idx * stepSpacing;
                // Reverse left side nodes coordinates
                const nx = b.side === 'left' ? centerX - (90 + (5 - idx) * stepSpacing) : centerX + nodeOffset;

                // Draw line segment to next node if exists
                if (idx < steps.length - 1) {
                    const nextOffset = 90 + (idx + 1) * stepSpacing;
                    const nnx = b.side === 'left' ? centerX - (90 + (5 - (idx + 1)) * stepSpacing) : centerX + nextOffset;
                    
                    const isSegmentUnlocked = currentStatVal >= steps[idx + 1];
                    const segmentAlpha = isSegmentUnlocked ? 1.0 : 0.2;
                    
                    connG.lineStyle(2, keyInfo.color, segmentAlpha);
                    connG.lineBetween(nx, ry, nnx, ry);
                }

                // Node state mapping
                const isUnlocked = currentStatVal >= stepVal;
                const isNextUpgrade = !isUnlocked && currentStatVal === stepVal - 10;
                const isLocked = !isUnlocked && !isNextUpgrade;
                const isSelected = this.selectedUpgrade && this.selectedUpgrade.statKey === b.key && this.selectedUpgrade.targetValue === stepVal;

                // Draw node circle visual representation
                const nodeG = this.add.graphics();
                c.add(nodeG);

                let fillCol = 0x05060b;
                let strokeCol = 0x1e293b;
                let strokeThickness = 1.5;

                if (isUnlocked) {
                    fillCol = 0x090518;
                    strokeCol = keyInfo.color;
                    strokeThickness = 2.5;
                    // Glow
                    const glowG = this.add.graphics();
                    glowG.fillStyle(keyInfo.color, 0.25);
                    glowG.fillCircle(nx, ry, 19);
                    c.add(glowG);
                } else if (isNextUpgrade) {
                    fillCol = 0x0a0515;
                    strokeCol = keyInfo.color;
                    strokeThickness = 2.5;
                } else if (isLocked) {
                    fillCol = 0x0f0b1c;
                    strokeCol = 0x334155;
                    strokeThickness = 1.5;
                }

                if (isSelected) {
                    strokeCol = 0xffffff;
                    strokeThickness = 3;
                }

                nodeG.fillStyle(fillCol, 1);
                nodeG.fillCircle(nx, ry, 15);
                nodeG.lineStyle(strokeThickness, strokeCol, 1);
                nodeG.strokeCircle(nx, ry, 15);

                if (isNextUpgrade) {
                    this.tweens.add({
                        targets: nodeG,
                        alpha: 0.6,
                        duration: 800,
                        yoyo: true,
                        repeat: -1
                    });
                }

                // Draw value / lock
                let txtY = ry;
                if (isLocked && stepVal > 50) {
                    txtY = ry + 4;
                    c.add(this.add.text(nx, ry - 6, '🔒', { font: '9px Arial' }).setOrigin(0.5).setAlpha(0.6));
                }

                const txtCol = isUnlocked ? '#ffffff' : (isNextUpgrade ? '#ffffff' : '#64748b');
                c.add(this.add.text(nx, txtY, `${stepVal}`, {
                    font: `900 ${isLocked ? '9px' : '10.5px'} sans-serif`, fill: txtCol
                }).setOrigin(0.5));

                // Add crown icon for node 100
                if (stepVal === 100) {
                    c.add(this.add.text(nx, ry - 20, '👑', { font: '11px Arial' }).setOrigin(0.5));
                }

                // Price Capsule underneath nodes (60 to 100)
                if (stepVal > 50) {
                    const price = nodePrices[stepVal];
                    const pBg = this.add.graphics();
                    pBg.fillStyle(0x0f0a02, 1);
                    pBg.fillRoundedRect(nx - 22, ry + 19, 44, 14, 7);
                    pBg.lineStyle(1, 0xfbbf24, 0.8);
                    pBg.strokeRoundedRect(nx - 22, ry + 19, 44, 14, 7);
                    c.add(pBg);
                    c.add(this.add.text(nx, ry + 26, `${price} EZ`, {
                        font: '800 8px sans-serif', fill: '#fbbf24'
                    }).setOrigin(0.5));
                }

                // Hit area
                const hit = this.add.circle(nx, ry, 18, 0x000000, 0).setInteractive({ useHandCursor: true });
                if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
                c.add(hit);

                hit.on('pointerdown', () => {
                    if (window.audioManager) window.audioManager.playSFX('button_click');
                    this.selectedUpgrade = {
                        statKey: b.key,
                        targetValue: stepVal,
                        label: keyInfo.label
                    };
                    this.renderGelisimTab();
                });
            });
        });

        // =====================================================================
        // BOTTOM INFO & PURCHASE PANEL
        // =====================================================================
        const panelW = w_main - 32;
        const panelH = 94;
        const panelX = x_main + 16;
        const panelY = availableH + y0 - panelH - 16;

        const infoPanel = this.add.graphics();
        infoPanel.fillStyle(0x060212, 0.95);
        infoPanel.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
        infoPanel.lineStyle(1, 0x334155, 0.6);
        infoPanel.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
        // Top accent
        infoPanel.lineStyle(2, selInfo.color, 0.6);
        infoPanel.lineBetween(panelX + 12, panelY + 1, panelX + panelW - 12, panelY + 1);
        c.add(infoPanel);

        const selKey = this.selectedUpgrade.statKey;
        const selVal = this.selectedUpgrade.targetValue;
        const selInfo = statKeys[selKey];

        const userCurrentVal = ps[selKey] || 50;
        const upgradeCost = this.getUpgradeCost(userCurrentVal);

        const isAlreadyUnlocked = userCurrentVal >= selVal;
        const isEligibleToUpgrade = !isAlreadyUnlocked && userCurrentVal === selVal - 10;
        const isLockedFarther = !isAlreadyUnlocked && !isEligibleToUpgrade;

        // LEFT SIDE: Stat Icon & Title
        const circleBg = this.add.graphics();
        circleBg.fillStyle(0x0a1428, 1);
        circleBg.fillCircle(panelX + 44, panelY + panelH / 2, 24);
        circleBg.lineStyle(2, selInfo.color, 0.9);
        circleBg.strokeCircle(panelX + 44, panelY + panelH / 2, 24);
        c.add(circleBg);
        c.add(this.add.text(panelX + 44, panelY + panelH / 2, selInfo.icon, { font: '22px Arial' }).setOrigin(0.5));
        
        c.add(this.add.text(panelX + 80, panelY + panelH / 2, selInfo.label, { font: '700 21px sans-serif', fill: '#ffffff', letterSpacing: 1 }).setOrigin(0, 0.5));

        // MIDDLE: Progression 
        const metricX = panelX + panelW * 0.40;
        c.add(this.add.text(metricX, panelY + 20, 'MEVCUT', { font: '700 9px sans-serif', fill: '#94a3b8', letterSpacing: 1 }));
        const curValText = this.add.text(metricX, panelY + 52, `${userCurrentVal}`, { font: '700 37px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
        curValText.setShadow(0, 0, '#ffffff', 3, true, true);
        c.add(curValText);

        c.add(this.add.text(metricX + 60, panelY + 52, '→', { font: '700 21px sans-serif', fill: '#d946ef' }).setOrigin(0, 0.5));

        c.add(this.add.text(metricX + 90, panelY + 20, 'SONRAKİ', { font: '700 9px sans-serif', fill: '#00ffff', letterSpacing: 1 }));
        const nextValString = userCurrentVal < 100 ? `${userCurrentVal + 10}` : 'MAX';
        const nextValColor = userCurrentVal < 100 ? '#00ffff' : '#fbbf24';
        const nextText = this.add.text(metricX + 90, panelY + 52, nextValString, { font: '700 37px sans-serif', fill: nextValColor }).setOrigin(0, 0.5);
        if (userCurrentVal < 100) nextText.setShadow(0, 0, '#00ffff', 3, true, true);
        c.add(nextText);

        // RIGHT SIDE: MALİYET Box & Action buttons
        const btnW = 160;
        const actionBtnX = panelX + panelW - btnW - 20;
        
        const costX = actionBtnX - 130; // Pushed right slightly
        
        c.add(this.add.text(costX, panelY + 28, 'MALİYET', { font: '800 11px sans-serif', fill: '#94a3b8' }));
        
        const costBg = this.add.graphics();
        costBg.fillStyle(0x0f0a02, 1);
        costBg.fillRoundedRect(costX, panelY + 44, 110, 32, 8);
        costBg.lineStyle(1.5, isEligibleToUpgrade ? 0xfbbf24 : 0x334155, 1);
        costBg.strokeRoundedRect(costX, panelY + 44, 110, 32, 8);
        c.add(costBg);
        
        // Custom EZ Badge inside cost
        const ezBadge = this.add.graphics();
        ezBadge.fillStyle(0xfbbf24, 1);
        ezBadge.fillCircle(costX + 18, panelY + 60, 10);
        c.add(ezBadge);
        c.add(this.add.text(costX + 18, panelY + 60, 'EZ', { font: '700 11px sans-serif', fill: '#000000' }).setOrigin(0.5));

        let costLabel = `${upgradeCost} EZ`;
        let costColor = '#fbbf24';
        if (isAlreadyUnlocked) {
            costLabel = 'AÇIK';
            costColor = '#22c55e';
        } else if (isLockedFarther) {
            costLabel = 'KİLİTLİ';
            costColor = '#64748b';
        } else if (userCurrentVal >= 100) {
            costLabel = 'MAKSİMUM';
            costColor = '#ef4444';
        }
        c.add(this.add.text(costX + 38, panelY + 60, costLabel, { font: '700 17px sans-serif', fill: costColor }).setOrigin(0, 0.5));

        // Primary Action Upgrade button
        const actionBtnY = panelY + 18;
        const btnH = 38;

        const actionBg = this.add.graphics();
        let actionColor = 0xa855f7;
        let actionText = '↑ YÜKSELT';
        let actionActive = false;

        if (isAlreadyUnlocked) {
            actionColor = 0x1e293b;
            actionText = 'AÇILDI ✓';
            actionActive = false;
        } else if (isEligibleToUpgrade) {
            const canAfford = window.gameState.career.ez >= upgradeCost;
            actionColor = canAfford ? 0xa855f7 : 0x475569;
            actionText = canAfford ? '↑ YÜKSELT' : 'YETERSİZ EZ';
            actionActive = canAfford;
        } else if (isLockedFarther) {
            actionColor = 0x1e293b;
            actionText = '🔒 KİLİTLİ';
            actionActive = false;
        } else if (userCurrentVal >= 100) {
            actionColor = 0x1e293b;
            actionText = 'MAKSİMUM';
            actionActive = false;
        }

        actionBg.fillStyle(actionColor, 1);
        actionBg.fillRoundedRect(actionBtnX, actionBtnY, btnW, btnH, 8);
        c.add(actionBg);

        const btnTxt = this.add.text(actionBtnX + btnW / 2, actionBtnY + btnH / 2, actionText, {
            font: '700 15px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);
        c.add(btnTxt);

        if (actionActive) {
            const actHit = this.add.rectangle(actionBtnX + btnW / 2, actionBtnY + btnH / 2, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, actHit);
            c.add(actHit);

            actHit.on('pointerover', () => {
                actionBg.clear();
                actionBg.fillStyle(0xd946ef, 1);
                actionBg.fillRoundedRect(actionBtnX, actionBtnY, btnW, btnH, 8);
            });
            actHit.on('pointerout', () => {
                actionBg.clear();
                actionBg.fillStyle(actionColor, 1);
                actionBg.fillRoundedRect(actionBtnX, actionBtnY, btnW, btnH, 8);
            });
            actHit.on('pointerdown', () => {
                this.executeSkillUpgrade(selKey, upgradeCost, selVal);
            });
        }

        // Secondary VAZGEÇ cancel button
        const cancelY = actionBtnY + btnH + 6;
        const cancelBg = this.add.graphics();
        cancelBg.fillStyle(0x0a101f, 1);
        cancelBg.fillRoundedRect(actionBtnX, cancelY, btnW, 22, 6);
        cancelBg.lineStyle(1, 0x1e293b, 1);
        cancelBg.strokeRoundedRect(actionBtnX, cancelY, btnW, 22, 6);
        c.add(cancelBg);

        const cancelTxt = this.add.text(actionBtnX + btnW / 2, cancelY + 11, '✕ Vazgeç', { font: '700 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        c.add(cancelTxt);

        const cancelHit = this.add.rectangle(actionBtnX + btnW / 2, cancelY + 11, btnW, 22, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, cancelHit);
        c.add(cancelHit);

        cancelHit.on('pointerover', () => {
            cancelTxt.setFill('#ef4444');
        });
        cancelHit.on('pointerout', () => {
            cancelTxt.setFill('#94a3b8');
        });
        cancelHit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.activeTab = 'season';
            this.createTabBar();
            this.renderTab('season');
        });
    }

    drawMascot(c, x, y) {
        // Hexagon background container glow
        const hex = this.add.graphics();
        hex.lineStyle(3, 0xd946ef, 1); 
        hex.beginPath();
        const R = 64;
        for (let i = 0; i <= 6; i++) {
            const angle = i * Math.PI / 3 - Math.PI / 2;
            const vx = x + R * Math.cos(angle);
            const vy = y - 10 + R * Math.sin(angle);
            if (i === 0) hex.moveTo(vx, vy);
            else hex.lineTo(vx, vy);
        }
        hex.closePath();
        hex.strokePath();

        // Outer cyan hexagon glow
        const hex2 = this.add.graphics();
        hex2.lineStyle(1.5, 0x00ffff, 0.15);
        hex2.beginPath();
        const R2 = 72;
        for (let i = 0; i <= 6; i++) {
            const angle = i * Math.PI / 3 - Math.PI / 2;
            const vx = x + R2 * Math.cos(angle);
            const vy = y - 10 + R2 * Math.sin(angle);
            if (i === 0) hex2.moveTo(vx, vy);
            else hex2.lineTo(vx, vy);
        }
        hex2.closePath();
        hex2.strokePath();
        c.add(hex);
        c.add(hex2);

        // FURIO Badge
        const badgeBg = this.add.graphics();
        badgeBg.fillStyle(0x0f0b22, 1);
        badgeBg.lineStyle(1.5, 0x00ffff, 1);
        badgeBg.fillRoundedRect(x - 30, y + 54, 60, 18, 4);
        badgeBg.strokeRoundedRect(x - 30, y + 54, 60, 18, 4);
        c.add(badgeBg);
        c.add(this.add.text(x, y + 63, 'FURIO', { font: '700 10px sans-serif', fill: '#00ffff' }).setOrigin(0.5));

        // Platform
        const plat = this.add.graphics();
        plat.fillStyle(0x05011a, 0.8);
        plat.fillEllipse(x, y + 90, 120, 24);
        plat.lineStyle(2, 0xd946ef, 0.15);
        plat.strokeEllipse(x, y + 90, 120, 24);
        plat.lineStyle(1.5, 0x00ffff, 0.15);
        plat.strokeEllipse(x, y + 90, 135, 30);
        c.add(plat);

        // Mascot Body shadow
        c.add(this.add.ellipse(x, y + 45, 36, 12, 0x000000, 0.4));

        // Mascot
        const av = this.add.container(x, y - 10);
        
        av.add(this.add.circle(0, 0, 36, 0xfacc15, 0.15)); // Glow
        
        const face = this.add.graphics();
        face.fillStyle(0xfacc15, 1);
        face.fillCircle(0, 0, 32);
        face.lineStyle(2, 0xd97706, 1);
        face.strokeCircle(0, 0, 32);
        
        av.add(face);
        av.add(this.add.circle(-10, -6, 5, 0xffffff));
        av.add(this.add.circle(-9, -6, 2.5, 0x000000));
        av.add(this.add.circle(10, -6, 5, 0xffffff));
        av.add(this.add.circle(9, -6, 2.5, 0x000000));

        const mouth = this.add.graphics();
        mouth.lineStyle(2.5, 0xd97706, 1);
        mouth.beginPath();
        mouth.arc(0, 4, 12, 0, Math.PI, false);
        mouth.strokePath();
        av.add(mouth);

        c.add(av);

        // Football ball
        const ballG = this.add.graphics();
        ballG.fillStyle(0xffffff, 1);
        ballG.fillCircle(x + 55, y + 74, 14);
        ballG.lineStyle(1.5, 0x000000, 1);
        ballG.strokeCircle(x + 55, y + 74, 14);
        ballG.fillStyle(0x000000, 1);
        ballG.fillCircle(x + 55, y + 74, 3.5);
        c.add(ballG);
    }

    getUpgradeCost(currentVal) {
        if (window.EconomyConfig && typeof window.EconomyConfig.getUpgradeCost === 'function') {
            return window.EconomyConfig.getUpgradeCost(currentVal);
        }
        if (currentVal === 50) return 240;
        if (currentVal === 60) return 360;
        if (currentVal === 70) return 480;
        if (currentVal === 80) return 620;
        if (currentVal === 90) return 800;
        return 0; // Maxed
    }

    executeSkillUpgrade(statKey, cost, targetValue) {
        const currentEz = window.GameStateManager ? window.GameStateManager.getEZ() : (window.gameState.career.ez || 0);
        if (currentEz < cost) {
            this.showToast('⚠️ Geliştirme için yeterli EZ paranız bulunmuyor!');
            return;
        }

        // Deduct EZ and upgrade stat
        const oldValue = window.gameState.player.attributes[statKey] || (targetValue - 10);
        if (window.GameStateManager && window.GameStateManager.setEZ) {
            window.GameStateManager.setEZ(currentEz - cost);
        } else {
            window.gameState.career.ez = Math.max(0, currentEz - cost);
        }
        window.gameState.player.attributes[statKey] = targetValue;
        if (window.SaveManager) window.SaveManager.save();

        // Telemetry Event
        if (window.AnalyticsService) {
            window.AnalyticsService.track('stat_upgraded', {
                stat_name: statKey,
                old_value: oldValue,
                new_value: targetValue,
                cost_ez: cost
            });
        }

        // Recalculate overall
        if (window.GameStateManager && window.GameStateManager.calculateOverall) {
            window.GameStateManager.calculateOverall();
        }

        // Update active selection target to next level if below 100
        if (targetValue < 100) {
            this.selectedUpgrade.targetValue = targetValue + 10;
        }

        // Save progress instantly
        if (window.SaveManager) {
            window.SaveManager.save();
        }

        // Play positive sound
        if (window.audioManager) {
            window.audioManager.playSFX('powerup');
        }

        // Update header UI right away
        this.updateHeaderBadges();
        this.renderGelisimTab(); // Re-render to reflect new EZ balance

        this.showToast(`✅ Geliştirme Başarılı! Nitelik ${targetValue} seviyesine yükseltildi.`);

        // Rebuild UI immediately
        this.renderGelisimTab();
    }

    renderSquadTab() {
        if (this.contentContainer) this.contentContainer.removeAll(true);
        const c = this.contentContainer;
        const x = this.PAD;
        const y = this.TOP_Y;
        const w = this.W - this.PAD * 2;
        const h = this.H - this.TOP_Y - this.PAD;

        const activeSquad = window.CareerManager ? window.CareerManager.getOrInitSquad(this.cw.currentClubId) : null;
        const starting = (activeSquad && activeSquad.starting) ? activeSquad.starting : [];
        const bench = (activeSquad && activeSquad.bench) ? activeSquad.bench : [];

        const leftW = Math.floor(w * 0.77);
        const rightW = w - leftW - 14;
        const rightX = x + leftW + 14;

        const boxH = Math.floor((h - 12) / 2);

        // ---- 1. BAŞLANGIÇ KADROSU (3 OYUNCU) BOX ----
        const topG = this.add.graphics();
        topG.fillStyle(0x060212, 0.9).fillRoundedRect(x, y, leftW, boxH, 10);
        topG.lineStyle(1.5, 0x22c55e, 0.35).strokeRoundedRect(x, y, leftW, boxH, 10);
        c.add(topG);

        c.add(this.add.text(x + 16, y + 10, '⚽ BAŞLANGIÇ KADROSU (3 OYUNCU)', {
            font: '700 12.5px sans-serif', fill: '#22c55e', letterSpacing: 1.5
        }));

        const cardW = Math.floor((leftW - 32) / 3);
        const cardH = boxH - 40;
        const cardY = y + 30;

        starting.forEach((player, idx) => {
            const cx = x + 10 + idx * (cardW + 6);
            this.renderSquadCardNew(c, player, cx, cardY, cardW, cardH, true, 'BAŞLANGIÇ');
        });

        // ---- 2. YEDEKLER (3 OYUNCU) BOX ----
        const bY = y + boxH + 12;
        const botG = this.add.graphics();
        botG.fillStyle(0x060212, 0.9).fillRoundedRect(x, bY, leftW, boxH, 10);
        botG.lineStyle(1.5, 0xa855f7, 0.35).strokeRoundedRect(x, bY, leftW, boxH, 10);
        c.add(botG);

        c.add(this.add.text(x + 16, bY + 10, '🪑 YEDEKLER (3 OYUNCU)', {
            font: '700 12.5px sans-serif', fill: '#a855f7', letterSpacing: 1.5
        }));

        bench.forEach((player, idx) => {
            const cx = x + 10 + idx * (cardW + 6);
            this.renderSquadCardNew(c, player, cx, bY + 30, cardW, cardH, false, 'YEDEK');

            const hitArea = this.add.rectangle(cx + cardW / 2, bY + 30 + cardH / 2, cardW, cardH, 0, 0)
                .setInteractive({ useHandCursor: true });
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);
            c.add(hitArea);

            hitArea.on('pointerdown', () => {
                this.showSwapModal(player, idx, starting);
            });
        });

        // ---- 3. TAKIM GENİ SIDE PANEL ----
        const sideG = this.add.graphics();
        sideG.fillStyle(0x070318, 0.95).fillRoundedRect(rightX, y, rightW, h, 10);
        sideG.lineStyle(1.5, 0x00ffff, 0.4).strokeRoundedRect(rightX, y, rightW, h, 10);
        c.add(sideG);

        const cxRight = rightX + rightW / 2;

        // Club Badge / Shield Icon
        const bX = cxRight, bYPos = y + 50;
        const badgeG = this.add.graphics();
        const primaryColorHex = this.club.primaryColor || 0x00ffff;
        const secondaryColorHex = this.club.secondaryColor || 0xffffff;
        badgeG.fillStyle(primaryColorHex, 0.85);
        badgeG.lineStyle(2, secondaryColorHex, 0.9);
        badgeG.fillCircle(bX, bYPos, 28);
        badgeG.strokeCircle(bX, bYPos, 28);
        c.add(badgeG);
        c.add(this.add.text(bX, bYPos, (this.club.shortName || this.club.name || 'FC').substring(0, 3).toUpperCase(), {
            font: '800 15px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5));

        // Club Name & Formation
        const clubNameStr = (this.club.name || 'FURIO FC').toUpperCase();
        c.add(this.add.text(cxRight, y + 90, clubNameStr, {
            font: '700 15px sans-serif', fill: '#ffffff', letterSpacing: 1
        }).setOrigin(0.5));
        c.add(this.add.text(cxRight, y + 110, '3v3 FORMATI', {
            font: '800 10.5px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5));

        // Takım Geni Rating Big Number
        const teamOvr = (window.GameStateManager && window.GameStateManager.calculateTeamPower)
            ? window.GameStateManager.calculateTeamPower(activeSquad || this.club)
            : (this.club.overall || this.club.strength || 74);
        c.add(this.add.text(cxRight, y + 160, 'TAKIM GENİ', {
            font: '700 11.5px sans-serif', fill: '#94a3b8', letterSpacing: 1.5
        }).setOrigin(0.5));

        const ovrTxt = this.add.text(cxRight, y + 195, `${teamOvr}`, {
            font: '900 44px sans-serif', fill: '#00ffff'
        }).setOrigin(0.5);
        ovrTxt.setShadow(0, 0, '#00ffff', 15, true, true);
        c.add(ovrTxt);

        // Progress bar
        const barW = rightW - 36;
        const barX = rightX + 18;
        const barY = y + 232;
        const pG = this.add.graphics();
        this.drawBar(pG, barX, barY, barW, 8, teamOvr / 100, 0x00ffff, 0x1e293b);
        c.add(pG);

        // Additional squad detail summary
        const avgSpeed = Math.round((starting.reduce((acc, p) => acc + (p.speed || p.pace || 70), 0)) / (starting.length || 1));
        const avgShooting = Math.round((starting.reduce((acc, p) => acc + (p.shooting || p.shot || 70), 0)) / (starting.length || 1));
        
        c.add(this.add.text(rightX + 16, y + 265, `HIZ ORT: ${avgSpeed}`, { font: '700 10.5px sans-serif', fill: '#cbd5e1' }));
        c.add(this.add.text(rightX + 16, y + 285, `ŞUT ORT: ${avgShooting}`, { font: '700 10.5px sans-serif', fill: '#cbd5e1' }));
        c.add(this.add.text(rightX + 16, y + 315, '💡 Kadro Değişimi:', { font: '700 10px sans-serif', fill: '#fbbf24' }));
        c.add(this.add.text(rightX + 16, y + 332, 'Yedek oyuncuya tıklayarak\nilk 11 ile değiştirebilirsin.', { font: '600 9px sans-serif', fill: '#64748b' }));
    }

    renderSquadCardNew(container, player, cx, cy, cw, ch, isStarting, statusLabel) {
        const g = this.add.graphics();
        const mainColor = isStarting ? 0x22c55e : 0xa855f7;
        const isUser = player.isUserPlayer || player.id === 'user_player' || player.isUser;

        // Card background
        g.fillStyle(0x0b061a, 0.95).fillRoundedRect(cx, cy, cw, ch, 8);
        g.lineStyle(1.5, mainColor, isStarting ? 0.7 : 0.4).strokeRoundedRect(cx, cy, cw, ch, 8);
        container.add(g);

        // Top-left Position Badge
        const posStr = (player.position || 'ST').toUpperCase();
        const posBg = this.add.graphics();
        posBg.fillStyle(0x1e1535, 0.9);
        posBg.fillRoundedRect(cx + 6, cy + 6, 28, 16, 4);
        posBg.lineStyle(1, mainColor, 0.6);
        posBg.strokeRoundedRect(cx + 6, cy + 6, 28, 16, 4);
        container.add(posBg);
        container.add(this.add.text(cx + 20, cy + 14, posStr, {
            font: '800 9.5px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5));

        // Top-right Status Badge
        const statBg = this.add.graphics();
        statBg.fillStyle(mainColor, 0.25);
        statBg.fillRoundedRect(cx + cw - 48, cy + 6, 42, 16, 4);
        statBg.lineStyle(1, mainColor, 0.8);
        statBg.strokeRoundedRect(cx + cw - 48, cy + 6, 42, 16, 4);
        container.add(statBg);
        container.add(this.add.text(cx + cw - 27, cy + 14, statusLabel, {
            font: '800 8.5px sans-serif', fill: isStarting ? '#4ade80' : '#d8b4fe'
        }).setOrigin(0.5));

        // Center Avatar
        const avX = cx + 32, avY = cy + 46;
        container.add(this.add.circle(avX, avY, 17, mainColor, 0.2));
        const avBg = this.add.graphics();
        avBg.fillStyle(0x120c2b, 1);
        avBg.fillCircle(avX, avY, 14);
        avBg.lineStyle(1.5, mainColor, 0.8);
        avBg.strokeCircle(avX, avY, 14);
        container.add(avBg);

        const avatarEmoji = isUser ? '👤' : (posStr === 'GK' ? '🧤' : (posStr === 'ST' || posStr === 'ATT' ? '⚽' : '👟'));
        container.add(this.add.text(avX, avY, avatarEmoji, { font: '12px Arial' }).setOrigin(0.5));

        // Player Name & Info
        const rawName = isUser ? (window.gameState.player.name || 'KAPTAN (SEN)') : (player.displayName || player.name || 'Oyuncu');
        const nameStr = isUser ? `👤 ${rawName}` : rawName;
        const truncatedName = nameStr.length > 13 ? nameStr.substring(0, 12) + '.' : nameStr;

        container.add(this.add.text(cx + 54, cy + 34, truncatedName, {
            font: '700 11.5px sans-serif', fill: isUser ? '#fbbf24' : '#ffffff'
        }));

        const flag = player.nationalityFlag || '🇹🇷';
        container.add(this.add.text(cx + 54, cy + 49, `${flag} ${posStr}`, {
            font: '800 9px sans-serif', fill: '#94a3b8'
        }));

        // Overall Rating Number
        const ovrVal = isUser ? (window.gameState.player.overall || player.overall || 70) : (player.overall || player.rating || 70);
        container.add(this.add.text(cx + cw - 24, cy + 34, `${ovrVal}`, {
            font: '900 18px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5));
        container.add(this.add.text(cx + cw - 24, cy + 50, 'GEN', {
            font: '800 8px sans-serif', fill: '#64748b'
        }).setOrigin(0.5));

        // 6 Attribute Columns at the bottom
        const attrs = isUser ? window.gameState.player.attributes : {
            speed: player.speed || player.pace || 70,
            shooting: player.shooting || player.shot || 70,
            passing: player.passing || player.pass || 70,
            dribbling: player.dribbling || player.dribble || 70,
            physical: player.physical || player.defense || 70,
            stamina: player.stamina || player.physical || 70
        };

        const statList = [
            { key: 'HIZ', val: attrs.speed || attrs.pace || 70 },
            { key: 'ŞUT', val: attrs.shooting || attrs.shot || 70 },
            { key: 'PAS', val: attrs.passing || attrs.pass || 70 },
            { key: 'DRI', val: attrs.dribbling || attrs.dribble || 70 },
            { key: 'DEF', val: attrs.defense || attrs.physical || 70 },
            { key: 'FİZ', val: attrs.physical || attrs.stamina || 70 }
        ];

        const colW = Math.floor(cw / 6);
        const statY = cy + ch - 30;

        statList.forEach((st, i) => {
            const colX = cx + i * colW + colW / 2;
            container.add(this.add.text(colX, statY, st.key, {
                font: '800 10px sans-serif', fill: '#94a3b8'
            }).setOrigin(0.5));
            container.add(this.add.text(colX, statY + 12, `${st.val}`, {
                font: '800 10.5px sans-serif', fill: '#ffffff'
            }).setOrigin(0.5));
        });
    }

    showSwapModal(benchPlayer, benchIdx, startingList) {
        const modalContainer = this.add.container(0, 0);
        
        // Dimmed background
        const dim = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0.75)
            .setInteractive();
        modalContainer.add(dim);

        const mw = 400, mh = 300;
        const mx = this.W / 2 - mw / 2;
        const my = this.H / 2 - mh / 2;

        const mBg = this.add.graphics();
        mBg.fillStyle(0x0a0518, 0.98).fillRoundedRect(mx, my, mw, mh, 12);
        mBg.lineStyle(2, 0x00ffff, 0.8).strokeRoundedRect(mx, my, mw, mh, 12);
        modalContainer.add(mBg);

        const mTitle = this.add.text(this.W / 2, my + 25, "OYUNCUYU İLK 3'LÜYE AL", {
            font: '700 17px sans-serif', fill: '#00ffff'
        }).setOrigin(0.5);

        const pName = benchPlayer.displayName || benchPlayer.name || 'Oyuncu';
        const pPos = benchPlayer.position || 'ST';
        const pOvr = benchPlayer.overall || benchPlayer.rating || 60;

        const mSub = this.add.text(this.W / 2, my + 55, `${pName.toUpperCase()} (${pPos} | GEN: ${pOvr})`, {
            font: '800 13px sans-serif', fill: '#fbbf24'
        }).setOrigin(0.5);

        const mInstr = this.add.text(this.W / 2, my + 80, "Hangi aktif oyuncunun yerine geçeceğini seçin:", {
            font: '600 12px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5);

        modalContainer.add([mTitle, mSub, mInstr]);

        const isGk = pPos === 'GK';

        // Target option buttons
        const btnW = 340, btnH = 40;
        let by = my + 105;

        const createOptionBtn = (slotIdx, slotName, activePlayer) => {
            const isEligible = isGk ? (slotIdx === 0) : (slotIdx !== 0);
            
            const btnBg = this.add.graphics();
            const btnColor = isEligible ? 0x22c55e : 0x1e293b;
            btnBg.fillStyle(btnColor, isEligible ? 1 : 0.5);
            btnBg.fillRoundedRect(mx + 30, by, btnW, btnH, 6);
            modalContainer.add(btnBg);

            const activeName = activePlayer ? (activePlayer.displayName || activePlayer.name || 'Oyuncu') : 'Boş';
            const btnText = this.add.text(mx + 45, by + 20, `${slotName}: ${activeName}`, {
                font: '700 13px sans-serif', fill: isEligible ? '#000000' : '#64748b'
            }).setOrigin(0, 0.5);
            modalContainer.add(btnText);

            if (isEligible) {
                const hit = this.add.rectangle(mx + 30 + btnW / 2, by + btnH / 2, btnW, btnH, 0, 0)
                    .setInteractive({ useHandCursor: true });
                if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
                modalContainer.add(hit);

                hit.on('pointerdown', () => {
                    modalContainer.destroy();
                    const ok = window.CareerManager.swapSquadPlayers(this.cw.currentClubId, benchIdx, slotIdx);
                    if (ok) {
                        this.showToast(`✅ ${pName} ilk 3'lüye dahil edildi!`);
                        this.renderTab('squad');
                    }
                });
            }

            by += 46;
        };

        createOptionBtn(0, "GK (KALECİ)", startingList[0]);
        createOptionBtn(1, "DEF (DEFANS)", startingList[1]);
        createOptionBtn(2, "ST (FORVET)", startingList[2]);

        // Cancel Button
        const cancelBtn = this.add.text(this.W / 2, my + mh - 20, "İPTAL", {
            font: '700 14px sans-serif', fill: '#ef4444'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        modalContainer.add(cancelBtn);

        cancelBtn.on('pointerdown', () => {
            modalContainer.destroy();
        });
    }

    shutdown() {
        try {
            this.tweens.killAll();
            this.time.removeAllEvents();
            if (this.contentContainer) {
                this.contentContainer.removeAll(true);
            }
            this.children.removeAll(true);
        } catch (e) {
            console.warn('[CareerWorldScene] Error during shutdown:', e);
        }
    }
}
