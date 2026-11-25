class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.sceneData = data || {};
    }

    create() {
        this.cameras.main.fadeIn(300);
        console.log("GAMEPLAY_ENTER");
        console.log("GAMEPLAY_CREATE_START");
        window.AI_DEBUG_MODE = false; // Disabled for production
        this.input.keyboard.on('keydown-O', () => { window.AI_DEBUG_MODE = !window.AI_DEBUG_MODE; });
        
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;
        this.isMobile = this.sys.game.device.os.android || this.sys.game.device.os.iOS || this.sys.game.device.input.touch;

        this.physics.world.isPaused = false;
        this.physics.world.gravity.y = 0;
        this.physics.world.setBounds(-100, 0, 2200, 1200);
        this.cameras.main.setBounds(-100, 0, 2200, 1200);

        this.score = { left: 0, right: 0 };
        this.matchTime = 0;
        this.matchDuration = 90000; // 90 seconds
        this.matchState = 'INITIALIZING'; // Authoritative state: INITIALIZING, INTRO, PLAYING, PAUSED, FINISHED
        this.isGamePaused = false;
        this.isPauseMenuOpen = false;
        this.pauseMenuContainer = null;
        this.resetting = false;
        this.isIntroActive = false;
        this.matchFinished = false;
        this.ballState = 'FREE'; // FREE, CONTROLLED, KICKING

        // User player performance stats tracking
        this.userPlayerStats = {
            goals: 0,
            assists: 0,
            shots: 0,
            shotsOnTarget: 0,
            passes: 0,
            tackles: 0,
            staminaUsed: 0
        };
        this.lastTouchPlayer = null;
        this.secondLastTouchPlayer = null;

        this.uiCamera = this.cameras.add(0, 0, this.width, this.height);
        
        this.createEnvironment();
        console.log("FIELD_READY");
        this.createPhysicsObjects();
        this.setupColliders();
        console.log("ASSETS_READY");
        this.setupInput();
        console.log("CONTROLS_READY");

        this.children.list.forEach(child => this.uiCamera.ignore(child));
        const preUICount = this.children.list.length;

        this.createHUD();
        console.log("HUD_READY");
        this.createMobileControls();

        // Optional Input Debug (For QA Testing)
        this.createInputDebug();

        for (let i = preUICount; i < this.children.list.length; i++) {
            this.cameras.main.ignore(this.children.list[i]);
        }
        
        // --- CLEANUP ---
        this.events.once('shutdown', () => {
            if (this.sparkEmitter) this.sparkEmitter.destroy();
            if (this.trailEmitter) this.trailEmitter.destroy();
            if (this.ballTrail) this.ballTrail.destroy();
            this.shutdown();
        });

        this.cameras.main.startFollow(this.ball, true, 0.2, 0.2); // Faster camera tracking
        this.cameras.main.setZoom(0.85);

        // Wind system removal: WeatherManager will no longer apply force
        this.weatherManager = new (window.WeatherManager || class { update(){} setWeather(){} })(this);
        this.weatherManager.setWeather(window.gameState.currentWeather || 'Güneşli ☀️');

        if (window.audioManager) {
            window.audioManager.scene = this; // Update scene context for tweens
            window.audioManager.stopBGM(1000); // Fade out menu music over 1s
            window.audioManager.playAmbience('furio_fc_taraftar_gameplay_loop');
        }

        // Memory cleanup listener is merged above
        console.log("MATCH_STATE_READY");
        
        this.createMatchIntro();
        
        console.log("MATCH_STARTED");
        
    }

    shutdown() {
        console.log("[GameScene] SHUTDOWN: Cleaning up match state and memory.");
        this.input.keyboard.off('keydown-Q');
        this.input.keyboard.off('keydown-C');
        this.input.keyboard.off('keydown-O');
        
        // Remove ALL input listeners to prevent double-firings in next match
        this.input.removeAllListeners();
        
        if (this.sparkEmitter) {
            this.sparkEmitter.stop();
            this.sparkEmitter = null;
        }
        if (this.trailEmitter) {
            this.trailEmitter.stop();
            this.trailEmitter = null;
        }
        
        if (this.pauseMenuContainer) {
            this.pauseMenuContainer.destroy();
            this.pauseMenuContainer = null;
        }
        
        // Fully clear out players array and destroy physics bodies
        if (this.players) {
            this.players.forEach(p => {
                if (p) {
                    if (p.body) p.body.destroy();
                    p.destroy();
                }
            });
            this.players = [];
        }
        
        if (this.ball && this.ball.body) {
            this.ball.body.destroy();
            this.ball.destroy();
            this.ball = null;
        }

        if (this.walls) {
            this.walls.destroy(true);
            this.walls = null;
        }
        
        if (this.goalStructures) {
            this.goalStructures.destroy(true);
            this.goalStructures = null;
        }
        
        if (this.input) {
            this.input.enabled = true;
        }
        
        // Wipe local references
        this.humanPlayer = null;
        this.ballController = null;
        this.lastBallController = null;
        this.lastTouchPlayer = null;
        this.secondLastTouchPlayer = null;
        this.weatherManager = null;
        
        // Important: Stop physics world safely if it was running
        if (this.physics && this.physics.world) {
            this.physics.world.isPaused = true;
        }
        
        // Remove all tweens and time events created in this scene
        this.tweens.killAll();
        this.time.removeAllEvents();
    }



    createMatchIntro() {
        this.matchState = 'INTRO';
        this.isIntroActive = true;
        if (this.physics && this.physics.world) {
            this.physics.world.isPaused = true;
        }
        this.physics.pause();
        
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        const introContainer = this.add.container(0, 0).setDepth(950).setScrollFactor(0);
        this.cameras.main.ignore(introContainer);
        
        // Dark semi-transparent overlay
        const overlay = this.add.rectangle(cx, cy, this.width * 1.5, this.height * 1.5, 0x050110, 0.85);
        overlay.setInteractive(); // Block clicks from falling through to game objects if any, though HUD is above it
        introContainer.add(overlay);

        // Cyberpunk background diagonal grid lines
        const bgGraphics = this.add.graphics();
        bgGraphics.lineStyle(2, 0xd946ef, 0.10);
        for (let i = -1000; i < 2000; i += 100) {
            bgGraphics.beginPath(); bgGraphics.moveTo(i, 0); bgGraphics.lineTo(i + 1000, this.height); bgGraphics.strokePath();
        }
        bgGraphics.lineStyle(2, 0x06b6d4, 0.10);
        for (let i = -1000; i < 2000; i += 100) {
            bgGraphics.beginPath(); bgGraphics.moveTo(i + 1000, 0); bgGraphics.lineTo(i, this.height); bgGraphics.strokePath();
        }
        introContainer.add(bgGraphics);
        
        const hCol = (window.gameState.teamColors && window.gameState.teamColors.home) ? window.gameState.teamColors.home.primary : 0xd946ef;
        const aCol = (window.gameState.teamColors && window.gameState.teamColors.away) ? window.gameState.teamColors.away.primary : 0x06b6d4;
        const homeColorHex = "#" + hCol.toString(16).padStart(6, '0');
        const awayColorHex = "#" + aCol.toString(16).padStart(6, '0');
        
        const activeMatch = window.gameState.activeMatch;
        let homeName = "HOME CLUB";
        let awayName = "AWAY CLUB";
        let leagueName = "LİG";
        let stadiumName = "STADYUM";
        let matchDay = "HAFTA 01";
        let hClub = null;
        let aClub = null;
        
        if (activeMatch) {
            hClub = window.TeamDatabase ? window.TeamDatabase.getClub(activeMatch.homeTeamId) : null;
            aClub = window.TeamDatabase ? window.TeamDatabase.getClub(activeMatch.awayTeamId) : null;
            if (hClub) homeName = hClub.name.toUpperCase();
            if (aClub) awayName = aClub.name.toUpperCase();
            
            const league = (hClub && window.TeamDatabase) ? window.TeamDatabase.getLeague(hClub.leagueId || hClub.league) : null;
            if (league && league.name) leagueName = league.name.toUpperCase();
            else if (activeMatch.competition) leagueName = activeMatch.competition.toUpperCase();
            
            const wNum = activeMatch.matchDay || activeMatch.week || 1;
            matchDay = activeMatch.roundName ? activeMatch.roundName.toUpperCase() : "HAFTA " + String(wNum).padStart(2, '0');
            if (activeMatch.stadium) stadiumName = activeMatch.stadium.toUpperCase();
        }

        const contentGroup = this.add.container(0, 0);
        introContainer.add(contentGroup);

        // Unified Badges using UIUtils.drawClubShield
        let homeLogo, awayLogo;
        if (window.UIUtils && window.UIUtils.drawClubShield) {
            homeLogo = window.UIUtils.drawClubShield(this, cx - 280, cy - 90, hClub || { name: homeName, shortName: homeName.substring(0,3), primaryColor: hCol, secondaryColor: 0xffffff }, 110);
            awayLogo = window.UIUtils.drawClubShield(this, cx + 280, cy - 90, aClub || { name: awayName, shortName: awayName.substring(0,3), primaryColor: aCol, secondaryColor: 0xffffff }, 110);
        } else {
            homeLogo = this.add.circle(cx - 280, cy - 90, 50, hCol);
            awayLogo = this.add.circle(cx + 280, cy - 90, 50, aCol);
        }
        contentGroup.add([homeLogo, awayLogo]);

        // TEAM NAMES & LABELS
        const homeTxt = this.add.text(cx - 280, cy + 40, homeName, { font: '700 31px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
        const homeLabel = this.add.text(cx - 280, cy + 70, "HOME TEAM", { font: '600 16px sans-serif', fill: homeColorHex, fontStyle: 'italic' }).setOrigin(0.5);
        homeLabel.setShadow(0, 0, homeColorHex, 10, true, true);
        
        const awayTxt = this.add.text(cx + 280, cy + 40, awayName, { font: '700 31px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
        const awayLabel = this.add.text(cx + 280, cy + 70, "AWAY TEAM", { font: '600 16px sans-serif', fill: awayColorHex, fontStyle: 'italic' }).setOrigin(0.5);
        awayLabel.setShadow(0, 0, awayColorHex, 10, true, true);

        const vsTxt = this.add.text(cx, cy - 50, "VS", { font: '700 65px sans-serif', fill: '#f8fafc', fontStyle: 'italic' }).setOrigin(0.5);
        vsTxt.setShadow(0, 0, '#ffffff', 15, true, true);

        contentGroup.add([homeTxt, homeLabel, awayTxt, awayLabel, vsTxt]);

        // INFO PANEL
        const panelWidth = 760;
        const panelHeight = 50;
        const panelY = cy + 140;
        
        const panelBox = this.add.graphics();
        panelBox.fillStyle(0x050110, 0.8);
        panelBox.fillRoundedRect(cx - panelWidth/2, panelY - panelHeight/2, panelWidth, panelHeight, 6);
        
        const panelBorder = this.add.graphics();
        panelBorder.lineStyle(2, hCol, 1);
        panelBorder.beginPath(); panelBorder.moveTo(cx, panelY - panelHeight/2); panelBorder.lineTo(cx - panelWidth/2 + 6, panelY - panelHeight/2);
        panelBorder.arc(cx - panelWidth/2 + 6, panelY - panelHeight/2 + 6, 6, 1.5*Math.PI, Math.PI, true);
        panelBorder.lineTo(cx - panelWidth/2, panelY + panelHeight/2 - 6);
        panelBorder.arc(cx - panelWidth/2 + 6, panelY + panelHeight/2 - 6, 6, Math.PI, 0.5*Math.PI, true);
        panelBorder.lineTo(cx, panelY + panelHeight/2); panelBorder.strokePath();

        const panelBorderR = this.add.graphics();
        panelBorderR.lineStyle(2, aCol, 1);
        panelBorderR.beginPath(); panelBorderR.moveTo(cx, panelY - panelHeight/2); panelBorderR.lineTo(cx + panelWidth/2 - 6, panelY - panelHeight/2);
        panelBorderR.arc(cx + panelWidth/2 - 6, panelY - panelHeight/2 + 6, 6, 1.5*Math.PI, 0, false);
        panelBorderR.lineTo(cx + panelWidth/2, panelY + panelHeight/2 - 6);
        panelBorderR.arc(cx + panelWidth/2 - 6, panelY + panelHeight/2 - 6, 6, 0, 0.5*Math.PI, false);
        panelBorderR.lineTo(cx, panelY + panelHeight/2); panelBorderR.strokePath();

        const div1 = this.add.line(0, 0, cx - 120, panelY - 15, cx - 120, panelY + 15, 0xffffff, 0.15);
        const div2 = this.add.line(0, 0, cx + 120, panelY - 15, cx + 120, panelY + 15, 0xffffff, 0.15);
        contentGroup.add([panelBox, panelBorder, panelBorderR, div1, div2]);

        const createInfoCol = (x, title, subtitle, color, iconStr) => {
            const ico = this.add.text(x - 80, panelY, iconStr, { font: '20px sans-serif' }).setOrigin(0.5);
            const t = this.add.text(x, panelY - 8, title, { font: '800 13px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
            const s = this.add.text(x, panelY + 10, subtitle, { font: '600 11px sans-serif', fill: color }).setOrigin(0.5);
            contentGroup.add([ico, t, s]);
        };
        
        createInfoCol(cx - 220, leagueName, "LEAGUE", "#d946ef", "🏆");
        createInfoCol(cx, matchDay, "MATCHDAY", "#0ea5e9", "📅");
        createInfoCol(cx + 220, stadiumName, "STADIUM", "#d946ef", "🏟️");

        // BOTTOM COUNTDOWN
        const countY = cy + 240;
        
        const reticleContainer = this.add.container(cx, countY);
        const rCircle = this.add.graphics();
        rCircle.lineStyle(2, 0x06b6d4, 0.8);
        rCircle.strokeCircle(0, 0, 50);
        rCircle.beginPath(); rCircle.moveTo(-75, 0); rCircle.lineTo(-40, 0); rCircle.strokePath();
        rCircle.beginPath(); rCircle.moveTo(40, 0); rCircle.lineTo(75, 0); rCircle.strokePath();
        rCircle.beginPath(); rCircle.moveTo(0, -75); rCircle.lineTo(0, -40); rCircle.strokePath();
        rCircle.beginPath(); rCircle.moveTo(0, 40); rCircle.lineTo(0, 75); rCircle.strokePath();
        rCircle.fillStyle(0xd946ef, 1); rCircle.fillCircle(-30, -30, 4); rCircle.fillCircle(30, 30, 4);
        reticleContainer.add(rCircle);
        introContainer.add(reticleContainer);

        const countdownTxt = this.add.text(cx, countY, "", { font: '700 81px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5);
        introContainer.add(countdownTxt);

        // INITIAL STATE FOR ANIMATION
        contentGroup.setAlpha(0); contentGroup.setScale(1.1);
        reticleContainer.setAlpha(0); reticleContainer.setScale(1.5);
        
        // 1. Enter Animation
        this.tweens.add({ targets: contentGroup, alpha: 1, scale: 1, duration: 500, ease: 'Power3' });
        
        // Authoritative Game Start Function
        const startGameplay = () => {
            if (this.matchState === 'PLAYING') return;
            
            const activateEntities = () => {
                this.matchState = 'PLAYING';
                this.isIntroActive = false;
                this.isGamePaused = false;
                this.resetting = false;
                this.input.enabled = true;
                
                if (this.physics && this.physics.world) {
                    this.physics.world.isPaused = false;
                }
                this.physics.resume();
                
                if (this.players) {
                    this.players.forEach(p => {
                        if (p && p.body) {
                            p.body.enable = true;
                            p.body.moves = true;
                        }
                    });
                }
                if (this.ball && this.ball.body) {
                    this.ball.body.enable = true;
                    this.ball.body.moves = true;
                }
                
                console.log("[GameScene] COUNTDOWN COMPLETE -> GAMEPLAY STARTED. matchState = PLAYING, physics.world.isPaused =", this.physics.world.isPaused);
            };

            if (introContainer && introContainer.active) {
                this.tweens.add({
                    targets: introContainer,
                    alpha: 0,
                    duration: 350,
                    ease: 'Power2',
                    onComplete: () => {
                        try { introContainer.destroy(); } catch(e) {}
                        activateEntities();
                    }
                });
            } else {
                activateEntities();
            }
        };

        // 2. Clear & Robust Countdown Steps
        const steps = [
            { num: "3", color: "#d946ef", delay: 500 },
            { num: "2", color: "#8b5cf6", delay: 1300 },
            { num: "1", color: "#06b6d4", delay: 2100 },
            { num: "GO!", color: "#22c55e", delay: 2900 }
        ];

        steps.forEach(step => {
            this.time.delayedCall(step.delay, () => {
                reticleContainer.setAlpha(1).setScale(1.2);
                countdownTxt.setText(step.num).setFill(step.color).setScale(0.6).setAlpha(1);
                countdownTxt.setShadow(0, 0, step.color, 20, true, true);
                
                this.tweens.add({ targets: countdownTxt, scale: 1, duration: 200, ease: 'Back.out' });
                if (window.audioManager) { try { window.audioManager.playSFX('button_click'); } catch(e){} }
                
                if (step.num === "GO!") {
                    if (window.audioManager) { try { window.audioManager.playSFX('whistle_start'); } catch(e){} }
                    startGameplay();
                }
            });
        });

        // Fail-safe backup timer: Force gameplay start if delayedCall gets stuck
        this.time.delayedCall(3800, () => {
            startGameplay();
        });
    }

    createEnvironment() {
        this.add.rectangle(1000, 600, 2000, 1200, 0x010005).setDepth(-100);
        
        if (!this.textures.exists('hex_grid')) {
            const hexGraphics = this.make.graphics({x: 0, y: 0, add: false});
            hexGraphics.lineStyle(2, 0x1d4ed8, 0.4); 
            for(let y = 0; y < 1200; y += 80) {
                for(let x = 0; x < 2000; x += 138) {
                    let ox = (y % 160 === 0) ? x : x + 69;
                    hexGraphics.beginPath();
                    for(let i=0; i<=6; i++) {
                        const angle = i * Math.PI / 3;
                        const px = ox + Math.cos(angle) * 45;
                        const py = y + Math.sin(angle) * 45;
                        if(i===0) hexGraphics.moveTo(px, py); else hexGraphics.lineTo(px, py);
                    }
                    hexGraphics.strokePath();
                }
            }
            hexGraphics.generateTexture('hex_grid', 2000, 1200);
        }
        
        this.hexBg = this.add.image(1000, 600, 'hex_grid').setDepth(-95);
        this.tweens.add({ targets: this.hexBg, alpha: 0.2, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        this.spotlights = [];
        const drawSpotlight = (x, color, angle, sweep) => {
            const light = this.add.graphics().setDepth(-94).setBlendMode('ADD');
            light.fillStyle(color, 0.15);
            light.beginPath();
            light.moveTo(x, -200);
            light.lineTo(x - sweep, 1400);
            light.lineTo(x + sweep, 1400);
            light.fill();
            this.spotlights.push(light);
            this.tweens.add({ targets: light, x: (Math.random() > 0.5 ? '+=300' : '-=300'), duration: 6000 + Math.random()*4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        };
        drawSpotlight(400, 0xd946ef, 0.15, 600);
        drawSpotlight(1000, 0x38bdf8, 0, 800);
        drawSpotlight(1600, 0xd946ef, -0.5, 600);

        const lines = this.add.graphics().setDepth(-90);
        lines.lineStyle(8, 0xc084fc, 0.2);
        lines.strokeRect(100, 100, 1800, 1000);
        lines.beginPath(); lines.moveTo(1000, 100); lines.lineTo(1000, 1100); lines.strokePath();
        lines.strokeCircle(1000, 600, 150);
        lines.strokeRect(100, 350, 250, 500); lines.strokeRect(100, 450, 80, 300);
        lines.strokeRect(1650, 350, 250, 500); lines.strokeRect(1820, 450, 80, 300);
        lines.lineStyle(3, 0xffffff, 0.8);
        lines.strokeRect(100, 100, 1800, 1000);
        lines.beginPath(); lines.moveTo(1000, 100); lines.lineTo(1000, 1100); lines.strokePath();
        lines.strokeCircle(1000, 600, 150); lines.fillCircle(1000, 600, 10);
        lines.strokeRect(100, 350, 250, 500); lines.strokeRect(100, 450, 80, 300);
        lines.strokeRect(1650, 350, 250, 500); lines.strokeRect(1820, 450, 80, 300);
        this.tweens.add({ targets: lines, alpha: 0.7, duration: 1500, yoyo: true, repeat: -1 });

        this.sparkEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 300, max: 900 }, angle: { min: 0, max: 360 }, lifespan: { min: 200, max: 500 },
            scale: { start: 2.0, end: 0 }, blendMode: 'ADD', tint: [0xff0055, 0x22d3ee, 0xffffff], gravityY: 1000, emitting: false
        }).setDepth(200);

        this.trailEmitter = this.add.particles(0, 0, 'particle', {
            speed: 0, lifespan: 200, scale: { start: 1.5, end: 0 }, alpha: { start: 0.3, end: 0 }, blendMode: 'ADD', emitting: false
        }).setDepth(138);
    }

    createPhysicsObjects() {
        this.goalStructures = this.physics.add.staticGroup();

        // Left Goal Net Walls
        this.goalStructures.create(50, 475, null, null, false).setSize(100, 8).setOrigin(0.5); // Top net wall
        this.goalStructures.create(50, 725, null, null, false).setSize(100, 8).setOrigin(0.5); // Bottom net wall
        this.goalStructures.create(2, 600, null, null, false).setSize(8, 250).setOrigin(0.5);   // Back net wall

        // Left Goal Gap Blocks (between net walls and outer walls)
        this.goalStructures.create(50, 437.5, null, null, false).setSize(100, 75).setOrigin(0.5);
        this.goalStructures.create(50, 762.5, null, null, false).setSize(100, 75).setOrigin(0.5);

        // Right Goal Net Walls
        this.goalStructures.create(1950, 475, null, null, false).setSize(100, 8).setOrigin(0.5); // Top net wall
        this.goalStructures.create(1950, 725, null, null, false).setSize(100, 8).setOrigin(0.5); // Bottom net wall
        this.goalStructures.create(1998, 600, null, null, false).setSize(8, 250).setOrigin(0.5);  // Back net wall

        // Right Goal Gap Blocks
        this.goalStructures.create(1950, 437.5, null, null, false).setSize(100, 75).setOrigin(0.5);
        this.goalStructures.create(1950, 762.5, null, null, false).setSize(100, 75).setOrigin(0.5);

        // Goal Posts (Physics Circles for realistic bounce)
        const leftTopPost = this.add.circle(100, 475, 8, 0xffffff, 0);
        this.physics.add.existing(leftTopPost, true);
        leftTopPost.body.setCircle(8);
        this.goalStructures.add(leftTopPost);

        const leftBotPost = this.add.circle(100, 725, 8, 0xffffff, 0);
        this.physics.add.existing(leftBotPost, true);
        leftBotPost.body.setCircle(8);
        this.goalStructures.add(leftBotPost);

        const rightTopPost = this.add.circle(1900, 475, 8, 0xffffff, 0);
        this.physics.add.existing(rightTopPost, true);
        rightTopPost.body.setCircle(8);
        this.goalStructures.add(rightTopPost);

        const rightBotPost = this.add.circle(1900, 725, 8, 0xffffff, 0);
        this.physics.add.existing(rightBotPost, true);
        rightBotPost.body.setCircle(8);
        this.goalStructures.add(rightBotPost);

        const drawNet = (x, y, isLeft) => {
            const color = isLeft ? 0xf43f5e : 0x3b82f6;
            const net = this.add.graphics().setDepth(-80);
            net.lineStyle(3, color, 0.9); net.strokeRect(x - 50, y - 125, 100, 250);
            net.lineStyle(1, color, 0.4);
            for(let i=10; i<100; i+=10) { net.moveTo(x-50+i, y-125); net.lineTo(x-50+i, y+125); }
            for(let i=10; i<250; i+=10) { net.moveTo(x-50, y-125+i); net.lineTo(x+50, y-125+i); }
            net.strokePath();
            this.add.rectangle(x, y, 120, 270, color, 0.2).setBlendMode('ADD').setDepth(-81);
        };
        drawNet(50, 600, true); drawNet(1950, 600, false);

        this.walls = this.physics.add.staticGroup();
        this.walls.add(this.add.rectangle(1000, 50, 2000, 100, 0, 0));
        this.walls.add(this.add.rectangle(1000, 1150, 2000, 100, 0, 0));
        this.walls.add(this.add.rectangle(50, 200, 100, 400, 0, 0));
        this.walls.add(this.add.rectangle(50, 1000, 100, 400, 0, 0));
        this.walls.add(this.add.rectangle(1950, 200, 100, 400, 0, 0));
        this.walls.add(this.add.rectangle(1950, 1000, 100, 400, 0, 0));

        const ballId = (window.gameState.customization && window.gameState.customization.equipped) ? window.gameState.customization.equipped.ball : 'ball_basic';
        this.ball = this.physics.add.image(1000, 600, ballId).setDepth(140).setScale(0.9);
        console.log("BALL_READY");
        this.ball.setCircle(16);
        this.ball.setOffset(2, 2);
        this.ball.setBounce(0.4); // Arcade bounce
        this.ball.setDrag(250); // Less friction, rolls longer
        this.ball.setMass(0.5); // Lighter than players for proper momentum transfer
        this.ball.setMaxVelocity(1200);
        this.ball.setCollideWorldBounds(true);
        this.ballGlow = this.add.circle(0, 0, 24, 0xffffff, 0.4).setBlendMode('ADD').setDepth(139);
        this.ballShadow = this.add.ellipse(0, 0, 24, 12, 0x000000, 0.6).setDepth(139);

        this.ballTrail = this.add.particles(0, 0, 'particle', {
            speed: 0, lifespan: 250, scale: { start: 3.5, end: 0 }, alpha: { start: 0.7, end: 0 },
            blendMode: 'ADD', tint: [0x38bdf8, 0xf43f5e], frequency: 16
        }).setDepth(138);
        this.ballTrail.startFollow(this.ball);

        const activeMatch = window.gameState.activeMatch;
        if (!activeMatch) {
            console.error("GameScene: activeMatch eksik. Kariyer modundan gelinmedi.");
            this.scene.start('CareerWorldScene');
            return;
        }

        let homeCol = 0xe11d48;
        let awayCol = 0x2563eb;
        
        this.myShort = "HOME";
        this.oppShort = "AWAY";
        let oppPlayers = ["Rakip Forvet", "Rakip Defans", "Rakip Kaleci"];
        let myPlayers = ["Oyuncu", "Takım Arkadaşı", "Takım Kalecisi"];
        
        if (activeMatch) {
            try {
                this.myShort = window.TeamDatabase.getShortName(activeMatch.homeTeamId);
                this.oppShort = window.TeamDatabase.getShortName(activeMatch.awayTeamId);
                
                const isUserHome = activeMatch.userSide === 'home';
                const userClubId = isUserHome ? activeMatch.homeTeamId : activeMatch.awayTeamId;
                const oppClubId = isUserHome ? activeMatch.awayTeamId : activeMatch.homeTeamId;
                
                const userClub = window.TeamDatabase.getClub(userClubId);
                const oppClub = window.TeamDatabase.getClub(oppClubId);
                
                const homeKitObj = isUserHome ? (activeMatch.userKit || userClub?.homeKitColors) : (activeMatch.opponentKit || userClub?.homeKitColors);
                const awayKitObj = isUserHome ? (activeMatch.opponentKit || oppClub?.awayKitColors || oppClub?.homeKitColors) : (activeMatch.userKit || oppClub?.awayKitColors || oppClub?.homeKitColors);

                homeCol = {
                    primary: (window.gameState.teamColors && window.gameState.teamColors.home) ? window.gameState.teamColors.home.primary : 
                              (homeKitObj?.primary || homeKitObj?.shirt || userClub?.primaryColor) || 0xe11d48,
                    secondary: (window.gameState.teamColors && window.gameState.teamColors.home) ? window.gameState.teamColors.home.secondary : 
                              (homeKitObj?.secondary || homeKitObj?.shorts || userClub?.secondaryColor) || 0xffffff
                };
                awayCol = {
                    primary: (window.gameState.teamColors && window.gameState.teamColors.away) ? window.gameState.teamColors.away.primary : 
                              (awayKitObj?.primary || awayKitObj?.shirt || oppClub?.primaryColor) || 0x2563eb,
                    secondary: (window.gameState.teamColors && window.gameState.teamColors.away) ? window.gameState.teamColors.away.secondary : 
                              (awayKitObj?.secondary || awayKitObj?.shorts || oppClub?.secondaryColor) || 0xffffff
                };
                
                if (userClub && userClub.squad) {
                    this.myShort = window.TeamDatabase.getShortName(userClubId);
                    myPlayers = [
                        window.TeamDatabase.getPlayerSafeName(userClub.squad.st || {}), 
                        window.TeamDatabase.getPlayerSafeName(userClub.squad.mid || {}), 
                        window.TeamDatabase.getPlayerSafeName(userClub.squad.gk || {})
                    ];
                }
                
                if (oppClub && oppClub.squad) {
                    this.oppShort = window.TeamDatabase.getShortName(oppClubId);
                    oppPlayers = [
                        window.TeamDatabase.getPlayerSafeName(oppClub.squad.st || {}),
                        window.TeamDatabase.getPlayerSafeName(oppClub.squad.mid || {}),
                        window.TeamDatabase.getPlayerSafeName(oppClub.squad.gk || {})
                    ];
                }
            } catch (err) {
                console.error("GameScene activeMatch parsing error: ", err);
            }
        }


        let userStStats = null, userMidStats = null, userGkStats = null;
        let oppStStats = null, oppMidStats = null, oppGkStats = null;
        
        if (activeMatch) {
            const isUserHome = activeMatch.userSide === 'home';
            const userClubId = isUserHome ? activeMatch.homeTeamId : activeMatch.awayTeamId;
            const oppClubId = isUserHome ? activeMatch.awayTeamId : activeMatch.homeTeamId;
            
            const userClub = window.TeamDatabase.getClub(userClubId);
            const oppClub = window.TeamDatabase.getClub(oppClubId);
            
            if (userClub && userClub.squad) {
                // Get human customized stats for human player from global state (Player.js constructor handles this automatically)
                // But for teammates, get it from club database:
                const mapSquadStat = (player) => ({
                    speed: player.speed || 50, shooting: player.shooting || 50, passing: player.passing || 50,
                    physical: player.defense || 50, dribbling: player.dribbling || 50, stamina: 70
                });
                userMidStats = mapSquadStat(userClub.squad.mid);
                userGkStats = mapSquadStat(userClub.squad.gk);
            }
            if (oppClub && oppClub.squad) {
                const mapSquadStat = (player) => ({
                    speed: player.speed || 50, shooting: player.shooting || 50, passing: player.passing || 50,
                    physical: player.defense || 50, dribbling: player.dribbling || 50, stamina: 70
                });
                oppStStats = mapSquadStat(oppClub.squad.st);
                oppMidStats = mapSquadStat(oppClub.squad.mid);
                oppGkStats = mapSquadStat(oppClub.squad.gk);
            }
        }

        const myLevel = window.gameState.player.level || 1;
        const enemyController = Math.min(4, Math.floor(myLevel / 10));
        this.players = [];

        // p1 is human, Player.js will grab attributes from gameState automatically
        const p1 = new Player(this, 800, 450, true, true, 1, homeCol); p1._formation='ATT'; p1._homeX=800; p1._homeY=450;
        p1.playerName = "⭐ " + (window.gameState.player.username || window.gameState.player.name || myPlayers[0]).toUpperCase(); p1.playerRole = "ST";
        
        const p2 = new Player(this, 600, 750, true, false, 0, homeCol, userMidStats); p2._formation='DEF'; p2._homeX=600; p2._homeY=750;
        p2.playerName = myPlayers[1].toUpperCase(); p2.playerRole = "DEF";
        
        const gk1 = new Player(this, 150, 600, true, false, 0, homeCol, userGkStats); gk1.isGoalkeeper=true; gk1._homeX=150; gk1._homeY=600;
        gk1.playerName = myPlayers[2].toUpperCase(); gk1.playerRole = "GK";

        const e1 = new Player(this, 1200, 450, false, false, enemyController, awayCol, oppStStats); e1._formation='ATT'; e1._homeX=1200; e1._homeY=450;
        e1.playerName = "⭐ " + oppPlayers[0].toUpperCase(); e1.playerRole = "ST";

        const e2 = new Player(this, 1400, 750, false, false, enemyController, awayCol, oppMidStats); e2._formation='DEF'; e2._homeX=1400; e2._homeY=750;
        e2.playerName = oppPlayers[1].toUpperCase(); e2.playerRole = "DEF";

        const gk2 = new Player(this, 1850, 600, false, false, enemyController, awayCol, oppGkStats); gk2.isGoalkeeper=true; gk2._homeX=1850; gk2._homeY=600;
        gk2.playerName = oppPlayers[2].toUpperCase(); gk2.playerRole = "GK";

        this.players.push(p1, p2, gk1, e1, e2, gk2);
        this.humanPlayer = p1;
        console.log("PLAYERS_READY");
        console.log("AI_READY");

        // Team intelligence and playStyle derived from club strength
        let userTeamIntel = 0.75;
        let oppTeamIntel = 0.75;
        let userPlayStyle = 'BALANCED';
        let oppPlayStyle = 'BALANCED';
        
        if (activeMatch) {
            const isUserHome = activeMatch.userSide === 'home';
            const userClub = isUserHome ? activeMatch.homeClub : activeMatch.awayClub;
            const oppClub = isUserHome ? activeMatch.awayClub : activeMatch.homeClub;
            if (userClub && userClub.strength) userTeamIntel = Phaser.Math.Clamp(userClub.strength / 100, 0.5, 0.95);
            if (oppClub && oppClub.strength) oppTeamIntel = Phaser.Math.Clamp(oppClub.strength / 100, 0.5, 0.95);
            
            if (userClub && userClub.playStyle) userPlayStyle = userClub.playStyle;
            if (oppClub && oppClub.playStyle) oppPlayStyle = oppClub.playStyle;
        }
        
        this.players.forEach(p => {
            if (!p.isHuman) {
                p.teamIntelligence = p.isLeftTeam ? userTeamIntel : oppTeamIntel;
            }
            p.playStyle = p.isLeftTeam ? userPlayStyle : oppPlayStyle;
        });

        // Telemetry Match Start Tracking
        this.kickoffTimestamp = Date.now();
        this.firstActionRecorded = false;
        this.abandonTracked = false;
        this.matchIndex = window.AnalyticsService ? window.AnalyticsService.getNextMatchIndex() : 1;

        if (window.AnalyticsService) {
            const activeMatch = window.gameState.activeMatch;
            window.AnalyticsService.track('match_start', {
                match_id: activeMatch ? (activeMatch.id || 'match_' + Date.now()) : ('match_' + Date.now()),
                match_number: window.gameState.career ? (window.gameState.career.currentWeek || 1) : 1,
                match_index: this.matchIndex,
                home_club: this.myShort || 'HOME',
                away_club: this.oppShort || 'AWAY'
            });
        }
    }

    setupColliders() {
        this.physics.add.collider(this.ball, this.walls);
        this.physics.add.collider(this.players, this.walls);
        this.physics.add.collider(this.ball, this.goalStructures);
        this.physics.add.collider(this.players, this.goalStructures);
        this.physics.add.collider(this.players, this.players, this.handlePlayerCollision, null, this);
        this.physics.add.collider(this.players, this.ball, this.handleBallOverlap, this.processBallCollision, this);
    }

    handlePlayerCollision(p1, p2) {
        if (!p1.body || !p2.body) return;
        
        const resolveTackle = (attacker, defender) => {
            const dist = Phaser.Math.Distance.Between(attacker.x, attacker.y, defender.x, defender.y);
            const isHumanBodySteal = attacker.isHuman && dist < 90;
            if ((attacker.isTackling || isHumanBodySteal) && defender.hasPossession && attacker.isLeftTeam !== defender.isLeftTeam) {
                // POSSESSION PROTECTION WINDOW
                if (defender.possessionTimer > 0) return;
                if (dist > 115) return;
                
                const atkVelAngle = Math.atan2(attacker.body.velocity.y, attacker.body.velocity.x);
                const defVelAngle = Math.atan2(defender.body.velocity.y, defender.body.velocity.x);
                let angleDiff = Math.abs(atkVelAngle - defVelAngle);
                if (angleDiff > Math.PI) angleDiff = (Math.PI * 2) - angleDiff;
                
                if (angleDiff < 0.4 && Math.random() > 0.8) return;
                
                defender.hasPossession = false;
                attacker.hasPossession = true;
                attacker.possessionTimer = 800; // 0.8s of safe window
                this.ballController = attacker;
                this.lastBallController = attacker;
                this.ballState = 'CONTROLLED';
                
                if (attacker === this.humanPlayer && this.userPlayerStats) {
                    this.userPlayerStats.tackles++;
                    this.recordMatchRatingEvent(0.25, "Top Çalma / Müdahale");
                } else if (defender === this.humanPlayer) {
                    if (this.userPlayerStats) this.userPlayerStats.turnovers = (this.userPlayerStats.turnovers || 0) + 1;
                    this.recordMatchRatingEvent(-0.20, "Top Kaybı");
                }

                attacker.shootCooldown = 0; 
                defender.shootCooldown = 1500; // Longer stun
                defender.tackleCooldown = 2000;
                
                defender.body.setVelocity(0, 0); defender.body.setAcceleration(0, 0);
                
                if (this.ball) {
                    this.ball.body.setVelocity(
                        (attacker.x - defender.x) * 4,
                        (attacker.y - defender.y) * 4
                    );
                }
                
                this.cameras.main.shake(120, 0.010);
                const hit = this.add.circle(defender.x, defender.y, 40, 0xff0000, 0.7).setDepth(200);
                this.uiCamera.ignore(hit);
                hit.setBlendMode(Phaser.BlendModes.ADD);
                this.tweens.add({ targets: hit, scale: 1.5, alpha: 0, duration: 250, onComplete: () => hit.destroy() });
                if (this.sparkEmitter) this.sparkEmitter.emitParticleAt(defender.x, defender.y, 25);
            }
        };
        resolveTackle(p1, p2); resolveTackle(p2, p1);
    }

    processBallCollision(player, ball) {
        if (player.isGoalkeeper) return !player.isHoldingBall;
        
        // If a player just shot/passed the ball, their shootCooldown is active. 
        if (player.shootCooldown > 0 && this.lastBallController === player) return false;
        
        // Prevent physical bounce if the player already has possession (allows true dribbling)
        if (player.hasPossession) return false;
        
        // INSTANT POSSESSION: If player is ready to receive ball, don't let it bounce physically.
        if (player.shootCooldown <= 0 && !player.isGoalkeeper) {
            this.handleBallOverlap(player, ball);
            return false;
        }
        
        // Return true to enable real physics momentum transfer for loose balls
        return true; 
    }

    handleBallOverlap(player, ball) {
        if (!player.body || !ball.body) return;
        
        // Goalkeeper catch/parry (unchanged)
        if (player.isGoalkeeper) {
            if (player.isHoldingBall || player.hasPossession) return; // FIX: Don't interfere if GK already has the ball or is about to clear it
            const ballSpeed = ball.body.velocity.length();
            if (ballSpeed < 450 && player.catchCooldown <= 0) {
                player.isHoldingBall = true;
                player.heldBallTimer = Phaser.Math.FloatBetween(400, 800);
                ball.body.setVelocity(0);
                player.hasPossession = true;
                player.possessionTimer = player.heldBallTimer + 600;
                this.ballController = player;
                this.lastBallController = player;
                if (player === this.humanPlayer) {
                    this.recordMatchRatingEvent(0.40, "Kurtarış");
                }
                const glowCircle = this.add.circle(player.x, player.y, 35, 0x00ffff, 0.15).setDepth(200).setBlendMode('ADD');
                this.uiCamera.ignore(glowCircle);
                this.tweens.add({ targets: glowCircle, scale: 1.4, alpha: 0, duration: 250, onComplete: () => glowCircle.destroy() });
                return;
            } else {
                player.shootCooldown = 300;
                player.catchCooldown = 500;
                if (this.sparkEmitter) this.sparkEmitter.emitParticleAt(ball.x, ball.y, 5);
                return;
            }
        }
        // Physical deflection only
        if (player.shootCooldown > 0) {
            return;
        }

        // PHYSICAL CONTACT REGISTERED -> GAIN POSSESSION
        if (!player.isGoalkeeper) {
            this.players.forEach(p => p.hasPossession = false);
            player.hasPossession = true;
            player.possessionTimer = 400;
            this.ballController = player;
            this.ballState = 'CONTROLLED';
            this.lastBallController = player;
            
            // Check pending human pass completion or turnover
            if (this._pendingHumanPass) {
                if (player.isLeftTeam && player !== this.humanPlayer) {
                    if (this.userPlayerStats) this.userPlayerStats.accuratePasses = (this.userPlayerStats.accuratePasses || 0) + 1;
                    this.recordMatchRatingEvent(0.15, "İsabetli Pas");
                } else if (!player.isLeftTeam) {
                    if (this.userPlayerStats) this.userPlayerStats.turnovers = (this.userPlayerStats.turnovers || 0) + 1;
                    this.recordMatchRatingEvent(-0.20, "Top Kaybı / Hatalı Pas");
                }
                this._pendingHumanPass = false;
            }

            // Record touches for assist tracking
            if (player.isLeftTeam && this.lastTouchPlayer !== player) {
                this.secondLastTouchPlayer = this.lastTouchPlayer;
                this.lastTouchPlayer = player;
            }

            // Dribble Assist & Magnetic Control: Keep ball close when moving
            const speedSq = player.body.velocity.lengthSq();
            if (speedSq > 500) {
                // Snap ball velocity to player's velocity with slight forward push
                ball.body.velocity.x = player.body.velocity.x * 1.15;
                ball.body.velocity.y = player.body.velocity.y * 1.15;
                ball.body.angularVelocity *= 0.5;
            } else {
                // Magnetic stop when player is stationary
                ball.body.velocity.x *= 0.5;
                ball.body.velocity.y *= 0.5;
            }
        }
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,SHIFT,F,Q,C,O');
        
        // Manual player switching key bindings
        this.input.keyboard.on('keydown-Q', () => this.switchActivePlayer());
        this.input.keyboard.on('keydown-C', () => this.switchActivePlayer());
        
        this.input.keyboard.on('keydown-O', () => {
            console.log("DEV CHEAT: Skip Match");
            this.userPlayerStats.goals += 2;
            this.score.left += 2;
            this.matchTimer = this.matchDuration;
        });
    }

    createHUD() {
        const safeArea = window.getSafeArea ? window.getSafeArea() : { safeTop: 0, safeRight: 0 };
        const cx = this.width / 2; const topY = 25 + safeArea.safeTop;

        // Cyberpunk scoreboard graphics with dynamic team colors/names
        let homeClubShort = this.myShort;
        let awayClubShort = this.oppShort;
        
        let homeColorHex = "#d946ef";
        let awayColorHex = "#00ffff";
        let homeColorInt = 0xd946ef;
        let awayColorInt = 0x00ffff;

        const isUserHome = window.gameState.activeMatch ? window.gameState.activeMatch.userSide === 'home' : true;
        
        const hCol = (window.gameState.teamColors && window.gameState.teamColors.home) ? window.gameState.teamColors.home.primary : 
                     (this.sceneData.homeColor !== undefined ? this.sceneData.homeColor.primary : 0xd946ef);
                     
        const aCol = (window.gameState.teamColors && window.gameState.teamColors.away) ? window.gameState.teamColors.away.primary : 
                     (this.sceneData.awayColor !== undefined ? this.sceneData.awayColor.primary : 0x00ffff);
        
        homeColorInt = hCol;
        homeColorHex = "#" + hCol.toString(16).padStart(6, '0');
        
        awayColorInt = aCol;
        awayColorHex = "#" + aCol.toString(16).padStart(6, '0');

        const sbBg = this.add.graphics().setScrollFactor(0).setDepth(1000);
        sbBg.fillStyle(0x020008, 0.96);
        sbBg.beginPath();
        sbBg.moveTo(cx - 180, 5 + safeArea.safeTop);
        sbBg.lineTo(cx + 180, 5 + safeArea.safeTop);
        sbBg.lineTo(cx + 160, 45 + safeArea.safeTop);
        sbBg.lineTo(cx - 160, 45 + safeArea.safeTop);
        sbBg.closePath();
        sbBg.fillPath();

        // Magenta line (left team / user)
        sbBg.lineStyle(2, homeColorInt, 0.8);
        sbBg.beginPath();
        sbBg.moveTo(cx - 180, 5 + safeArea.safeTop);
        sbBg.lineTo(cx, 5 + safeArea.safeTop);
        sbBg.lineTo(cx - 3, 45 + safeArea.safeTop);
        sbBg.lineTo(cx - 160, 45 + safeArea.safeTop);
        sbBg.closePath();
        sbBg.strokePath();

        // Cyan line (right team / opponent)
        sbBg.lineStyle(2, awayColorInt, 0.8);
        sbBg.beginPath();
        sbBg.moveTo(cx, 5 + safeArea.safeTop);
        sbBg.lineTo(cx + 180, 5 + safeArea.safeTop);
        sbBg.lineTo(cx + 160, 45 + safeArea.safeTop);
        sbBg.lineTo(cx + 3, 45 + safeArea.safeTop);
        sbBg.closePath();
        sbBg.strokePath();

        this.add.text(cx - 110, topY + 2, homeClubShort, { font: '700 16px sans-serif', fill: homeColorHex }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        this.scoreTextLeft = this.add.text(cx - 50, topY + 2, "0", { font: '700 29px sans-serif', fill: homeColorHex }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        this.timerText = this.add.text(cx, topY + 2, "01:30", { font: '700 21px sans-serif', fill: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        this.scoreTextRight = this.add.text(cx + 50, topY + 2, "0", { font: '700 29px sans-serif', fill: awayColorHex }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        this.add.text(cx + 110, topY + 2, awayClubShort, { font: '700 16px sans-serif', fill: awayColorHex }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        
        // Clean, framed speed badge
        const spdBg = this.add.graphics().setScrollFactor(0).setDepth(1000);
        spdBg.fillStyle(0x0a0f1d, 0.95);
        spdBg.fillRoundedRect(cx - 52, topY + 27, 104, 18, 9);
        spdBg.lineStyle(1.5, 0x1e293b, 0.9);
        spdBg.strokeRoundedRect(cx - 52, topY + 27, 104, 18, 9);
        this.speedText = this.add.text(cx, topY + 36, "SPD: 0 KM/H", { font: '700 11px monospace', fill: '#38bdf8' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        // Pause Button binding
        const pauseX = this.width - Math.max(50, safeArea.safeRight + 30);
        const pauseY = 32 + safeArea.safeTop;
        const pauseBtn = this.add.circle(pauseX, pauseY, 18, 0x020008, 0.8).setStrokeStyle(1.5, 0x00ffff).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(1001);
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, pauseBtn);
        const pauseTxt = this.add.text(pauseX, pauseY, "II", { font: '900 14px Arial', fill: '#00ffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
        
        pauseBtn.on('pointerdown', () => {
            this.showPauseMenu();
        });
        
        // Hover effect for Pause
        pauseBtn.on('pointerover', () => {
            pauseBtn.setStrokeStyle(2, 0xd946ef);
            pauseTxt.setFill('#d946ef');
        });
        pauseBtn.on('pointerout', () => {
            pauseBtn.setStrokeStyle(1.5, 0x00ffff);
            pauseTxt.setFill('#00ffff');
        });

        this.createStaminaBar(); this.createMinimap();
    }

    createMinimap() {
        const mx = this.width / 2; const my = this.height - 110;
        const mapBg = this.add.graphics().setScrollFactor(0).setDepth(1000);
        mapBg.fillStyle(0x050110, 0.85); mapBg.fillRoundedRect(mx - 110, my - 55, 220, 110, 15);
        mapBg.lineStyle(1.5, 0x334155, 0.85); mapBg.strokeRoundedRect(mx - 110, my - 55, 220, 110, 15);
        // Pre-allocate minimap dots (max 12 players + 1 ball = 13)
        this.minimapDots = [];
        for (let i = 0; i < 13; i++) {
            const dot = this.add.circle(0, 0, i < 12 ? 3.5 : 4.5, 0xffffff).setScrollFactor(0).setDepth(i < 12 ? 1001 : 1002).setVisible(false);
            this.cameras.main.ignore(dot);
            this.minimapDots.push(dot);
        }
    }
    
    updateMinimap() {
        if (!this.minimapDots || this.minimapDots.length === 0) return;
        const mx = this.width / 2 - 110; const my = this.height - 165;
        let idx = 0;
        this.players.forEach(p => {
            if (!p.body || idx >= 12) return;
            const dot = this.minimapDots[idx];
            dot.x = mx + (p.x * 0.11);
            dot.y = my + (p.y * 0.091);
            if (p === this.humanPlayer) {
                dot.setRadius(5);
                dot.fillColor = 0x00ffff;
                dot.setStrokeStyle(1.5, 0xfacc15, 1);
            } else if (p.isLeftTeam) {
                dot.setRadius(3.5);
                dot.fillColor = 0xd946ef;
                dot.setStrokeStyle(0);
            } else {
                dot.setRadius(3.5);
                dot.fillColor = 0x3b82f6;
                dot.setStrokeStyle(0);
            }
            dot.setVisible(true);
            idx++;
        });
        // Hide unused player dots
        for (let i = idx; i < 12; i++) {
            this.minimapDots[i].setVisible(false);
        }
        // Ball dot (index 12)
        if (this.ball && this.minimapDots[12]) {
            this.minimapDots[12].x = mx + (this.ball.x * 0.11);
            this.minimapDots[12].y = my + (this.ball.y * 0.091);
            this.minimapDots[12].setRadius(4.5);
            this.minimapDots[12].fillColor = 0xffffff;
            this.minimapDots[12].setStrokeStyle(1, 0x38bdf8, 0.9);
            this.minimapDots[12].setVisible(true);
        }
    }


    createMobileControls() {
        this.mobileKeys = { left: false, right: false, up: false, down: false, shoot: false, pass: false, through: false, special: false, joyAngle: 0, joyForce: 0 };
        const h = this.height; 
        const safeArea = window.getSafeArea ? window.getSafeArea() : { safeLeft: 0, safeRight: 0 };
        
        this.mobileControlsGroup = this.add.group();
        
        // Multi-touch tracking helper
        this.input.addPointer(3); // Support up to 3 fingers easily
        
        // --- REDESIGNED TRUE FLOATING JOYSTICK (Left) ---
        const maxDist = 80;
        
        // Joystick Visuals - Large, comfortable, premium (Floating, initially hidden)
        const joyBase = this.add.circle(0, 0, 120, 0x0f172a, 0.4).setStrokeStyle(2, 0x00ffff, 0.15).setScrollFactor(0).setDepth(1000).setAlpha(0);
        const joyStick = this.add.circle(0, 0, 40, 0x00ffff, 0.15).setStrokeStyle(1.5, 0xffffff, 0.9).setScrollFactor(0).setDepth(1001).setAlpha(0);
        
        this.mobileControlsGroup.addMultiple([joyBase, joyStick]);
        
        let activeJoyPointer = null;
        let startJoyX = 0;
        let startJoyY = 0;
        
        const updateJoy = (p) => {
            const angle = Phaser.Math.Angle.Between(startJoyX, startJoyY, p.x, p.y);
            const dist = Math.min(maxDist, Phaser.Math.Distance.Between(startJoyX, startJoyY, p.x, p.y));
            joyStick.x = startJoyX + Math.cos(angle) * dist;
            joyStick.y = startJoyY + Math.sin(angle) * dist;
            
            const force = Phaser.Math.Distance.Between(startJoyX, startJoyY, p.x, p.y) / maxDist;
            
            // Dynamic Joystick Visual Feedback
            joyStick.setScale(1 + (Math.min(1, force) * 0.4)); // Expands as you pull
            if (force > 0.8) {
                joyStick.setFillStyle(0xd946ef, 0.4); // Turns pink at full tilt
            } else {
                joyStick.setFillStyle(0x00ffff, 0.15); // Default cyan
            }

            if (force > 0.15) {
                this.mobileKeys.left = Math.cos(angle) < -0.3;
                this.mobileKeys.right = Math.cos(angle) > 0.3;
                this.mobileKeys.up = Math.sin(angle) < -0.3;
                this.mobileKeys.down = Math.sin(angle) > 0.3;
                this.mobileKeys.joyAngle = angle;
                this.mobileKeys.joyForce = Math.min(1, force);
            } else {
                this.mobileKeys.left = false; this.mobileKeys.right = false; this.mobileKeys.up = false; this.mobileKeys.down = false;
                this.mobileKeys.joyAngle = 0;
                this.mobileKeys.joyForce = 0;
            }
        };
        
        this.input.on('pointerdown', (p) => {
            if (p.x < this.width / 2 && !activeJoyPointer) {
                activeJoyPointer = p;
                startJoyX = p.x;
                startJoyY = p.y;
                joyBase.setPosition(startJoyX, startJoyY).setAlpha(1);
                joyStick.setPosition(startJoyX, startJoyY).setAlpha(1).setScale(1.1);
                updateJoy(p);
            }
        });
        
        this.input.on('pointermove', (p) => { 
            if (activeJoyPointer && p.id === activeJoyPointer.id && p.isDown) {
                updateJoy(p);
            }
        });
        
        const resetJoy = (p) => {
            if (activeJoyPointer && p.id === activeJoyPointer.id) {
                activeJoyPointer = null;
                joyBase.setAlpha(0);
                joyStick.setAlpha(0).setScale(1);
                this.mobileKeys.left = false; this.mobileKeys.right = false; this.mobileKeys.up = false; this.mobileKeys.down = false;
                this.mobileKeys.joyAngle = 0;
                this.mobileKeys.joyForce = 0;
            }
        };
        
        this.input.on('pointerup', resetJoy);
        // Removed pointerout to avoid sensitive resets when sliding off canvas
        // Also handle pointercancel explicitly
        this.input.on('pointercancel', resetJoy);

        // --- REDESIGNED ACTION BUTTONS (Right) ---
        const actX = Math.min(this.width - 140, this.width - safeArea.safeRight - 100); 
        const actY = h - 140;

        const createActBtn = (x, y, radius, color, label, icon, key, fontSize = '20px') => {
            const btnBg = this.add.circle(x, y, radius, 0x0f172a, 0.4).setStrokeStyle(1.5, color, 0.6).setScrollFactor(0).setDepth(1001);
            const btnIcon = this.add.text(x, y - 6, icon, {fontSize: fontSize}).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
            const btnText = this.add.text(x, y + radius * 0.4, label, {font: '800 11px sans-serif', fill: '#ffffff'}).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
            
            // Massive hit zone
            const hitZone = this.add.circle(x, y, radius * 2.5).setInteractive().setScrollFactor(0).setDepth(1003);
            
            this.mobileControlsGroup.addMultiple([btnBg, btnIcon, btnText, hitZone]);
            
            hitZone.on('pointerdown', (p) => { 
                this.mobileKeys[key] = true;
                if (key === 'through') this.mobileKeys['sprint'] = true;
                
                // Add camera shake on shoot for max juice
                if (key === 'shoot' && this.cameras && this.cameras.main) {
                    this.cameras.main.shake(100, 0.005);
                }

                // Juicy press tween
                this.tweens.add({
                    targets: [btnBg, btnIcon, btnText],
                    scale: 0.85,
                    alpha: 0.9,
                    duration: 50,
                    ease: 'Power2'
                });
                btnBg.setStrokeStyle(3, color, 1);
            });
            
            const resetBtn = () => { 
                this.mobileKeys[key] = false; 
                if (key === 'through') this.mobileKeys['sprint'] = false;
                // Juicy release elastic tween
                this.tweens.add({
                    targets: [btnBg, btnIcon, btnText],
                    scale: 1,
                    alpha: 0.4,
                    duration: 300,
                    ease: 'Back.easeOut'
                });
                btnBg.setStrokeStyle(1.5, color, 0.6);
            };
            hitZone.on('pointerup', resetBtn);
            hitZone.on('pointerupoutside', resetBtn);
            hitZone.on('pointercancel', resetBtn);
            hitZone.on('pointerout', (p) => {
                if (!p || !p.isDown) resetBtn();
            });
            return { bg: btnBg, icon: btnIcon, text: btnText, color: color };
        };

        // Ergonomic mobile layout with increased spacing & optimized hitboxes
        createActBtn(actX + 65, actY - 65, 48, 0xf43f5e, "SHOOT", "🎯", "shoot", '24px');
        createActBtn(actX + 35, actY + 55, 42, 0x38bdf8, "PASS", "👟", "pass", '20px');
        this.sprintBtnObj = createActBtn(actX - 85, actY + 25, 40, 0x4ade80, "SPRINT", "🏃", "through", '18px');

        this.createPossessionBar();
    }

    switchActivePlayer() {
        return;
    }

    createPossessionBar() {
        const cx = this.width / 2;
        const safeArea = window.getSafeArea ? window.getSafeArea() : { safeTop: 0 };
        this.possessionBarBaseX = cx - 80;
        const barY = 56 + safeArea.safeTop; 
        
        this.possessionBarContainer = this.add.container(this.possessionBarBaseX, barY).setScrollFactor(0).setDepth(1100);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x050110, 0.85);
        bg.fillRoundedRect(0, 0, 160, 26, 13);
        bg.lineStyle(1.5, 0x00ffff, 0.25);
        bg.strokeRoundedRect(0, 0, 160, 26, 13);
        
        const avatarBg = this.add.circle(13, 13, 9, 0x1e293b).setStrokeStyle(1, 0xffffff, 0.4);
        const avatarTxt = this.add.text(13, 13, "👤", {font: '10px sans-serif'}).setOrigin(0.5);
        
        this.possessionNameTxt = this.add.text(28, 13, "TOP BOŞTA", {font: '800 11px sans-serif', fill: '#ffffff'}).setOrigin(0, 0.5);
        this.possessionRoleTxt = this.add.text(148, 13, "-", {font: '600 10px sans-serif', fill: '#00ffff'}).setOrigin(1, 0.5);
        
        this.possessionBarContainer.add([bg, avatarBg, avatarTxt, this.possessionNameTxt, this.possessionRoleTxt]);
        this.possessionBarContainer.setAlpha(0.4); 
        
        this.lastPossessionPlayer = null;
    }

    createInputDebug() {
        this.inputDebugText = this.add.text(10, 10, "INPUT DEBUG: OFF", { font: '10px monospace', fill: '#00ff00', backgroundColor: '#00000088' }).setScrollFactor(0).setDepth(2000).setVisible(false);
        // Hidden tap zone to toggle debug (top left corner)
        this.add.rectangle(40, 40, 80, 80, 0, 0).setInteractive().setScrollFactor(0).setDepth(2001).on('pointerdown', () => {
            this.inputDebugText.setVisible(!this.inputDebugText.visible);
        });
    }

    updateInputDebug() {
        if (!this.inputDebugText || !this.inputDebugText.visible) return;
        const mk = this.mobileKeys;
        const text = `--- INPUT DEBUG ---
JOY: L:${mk.left} R:${mk.right} U:${mk.up} D:${mk.down}
     ANG:${mk.joyAngle.toFixed(2)} FRC:${mk.joyForce.toFixed(2)}
BTN: SHOOT:${mk.shoot} PASS:${mk.pass} SPRINT:${mk.through}
PTR: ${this.input.pointer1.isDown?'P1 ':''}${this.input.pointer2.isDown?'P2 ':''}${this.input.pointer3.isDown?'P3 ':''}
POS: ${this.ballController ? this.ballController.name : 'NONE'}`;
        this.inputDebugText.setText(text);
    }

    updatePossessionBar() {
        if (!this.possessionBarContainer) return;
        
        const currentPlayer = this.ballController;
        if (currentPlayer !== this.lastPossessionPlayer) {
            this.lastPossessionPlayer = currentPlayer;
            this.tweens.killTweensOf(this.possessionBarContainer);
            
            if (currentPlayer) {
                let name = currentPlayer.playerName || "PLAYER";
                name = name.replace("⭐ ", "");
                if (name.length > 11) name = name.substring(0, 10) + "…"; 
                const role = currentPlayer.playerRole || currentPlayer._formation || "CF";
                
                this.possessionNameTxt.setText(name);
                this.possessionRoleTxt.setText(role);
                
                const color = currentPlayer.isLeftTeam ? '#d946ef' : '#3b82f6';
                this.possessionRoleTxt.setFill(color);
                
                this.possessionBarContainer.x = this.possessionBarBaseX + 15;
                this.tweens.add({
                    targets: this.possessionBarContainer,
                    alpha: 1,
                    x: this.possessionBarBaseX,
                    ease: 'Power2',
                    duration: 150
                });
            } else {
                this.possessionNameTxt.setText("TOP BOŞTA");
                this.possessionRoleTxt.setText("-");
                this.possessionRoleTxt.setFill('#64748b');
                
                this.tweens.add({
                    targets: this.possessionBarContainer,
                    alpha: 0.3,
                    duration: 200
                });
            }
        }
    }

    update(time, delta) {
        if (!this._hasLoggedUpdateLoop) {
            console.log("UPDATE_LOOP_ACTIVE");
            this._hasLoggedUpdateLoop = true;
        }
        if (!window.gameState || this.isGamePaused || this.resetting || this.isIntroActive || (this.matchState && this.matchState !== 'PLAYING')) return;
        
        if (!this._hasLoggedGameplayLoopActive) {
            console.log("[GameScene] GAMEPLAY_ACTIVE_LOOP_RUNNING: matchTime =", this.matchTime);
            this._hasLoggedGameplayLoopActive = true;
        }

        const dt = Math.min(delta, 33.33);
        const timeScale = dt / 16.666;

        if (this.weatherManager) this.weatherManager.update();
        
        this.updatePossessionBar();

        if (this.ballState === 'CONTROLLED' && this.ballController && this.ball) {
            // Ball is perfectly bound to the controller's foot in Player.js
            // GameScene just ensures the state remains valid.
            const dist = Phaser.Math.Distance.Between(this.ballController.x, this.ballController.y, this.ball.x, this.ball.y);
            if (dist > 120 || !this.ballController.hasPossession) {
                this.ballController.hasPossession = false;
                this.ballController = null;
                this.ballState = 'FREE';
            }
        }
        
        // Removed physics override checkCollision.none so the ball still respects world bounds and goal posts

        // Forgiving loose ball pickup for human controlled player
        if (!this.ballController && this.humanPlayer && this.humanPlayer.shootCooldown <= 0 && this.ball) {
            const dist = Phaser.Math.Distance.Between(this.humanPlayer.x, this.humanPlayer.y, this.ball.x, this.ball.y);
            const pickupRadius = 75 + ((this.humanPlayer.stats.dribbling || 1.0) * 25);
            if (dist <= pickupRadius) {
                this.handleBallOverlap(this.humanPlayer, this.ball);
            }
        }

        // Stuck prevention
        if (this.ball && this.ball.body && !this.ballController) {
            if (this.ball.body.velocity.lengthSq() < 100) {
                this._stuckTimer = (this._stuckTimer || 0) + delta;
                if (this._stuckTimer > 1000) {
                    this.ball.body.setVelocityY(-350); this.ball.body.setVelocityX((Math.random() - 0.5) * 500);
                    this._stuckTimer = 0;
                }
            } else this._stuckTimer = 0;
        }

        // Anti-Stacking & Goalkeeper Safe Zone - Directly modifies position
        for(let i=0; i<this.players.length; i++) {
            for(let j=i+1; j<this.players.length; j++) {
                const p1 = this.players[i]; const p2 = this.players[j];
                if(p1.body && p2.body) {
                    const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
                    
                    let safeRadius = 45;
                    let pushMult = 0.3;
                    
                    // Goalkeeper Restriction (Shield active if GK has ball against opponents)
                    const isP1GK = p1.isGoalkeeper && (p1.hasPossession || p1.isHoldingBall) && p1.isLeftTeam !== p2.isLeftTeam;
                    const isP2GK = p2.isGoalkeeper && (p2.hasPossession || p2.isHoldingBall) && p2.isLeftTeam !== p1.isLeftTeam;
                    
                    if (isP1GK || isP2GK) {
                        safeRadius = 100;
                        pushMult = 0.85; // Stronger push for safe zone
                    }
                    
                    if (dist < safeRadius) { 
                        const safeDist = dist === 0 ? 0.01 : dist; // Prevent div by zero
                        const overlap = safeRadius - safeDist;
                        const dx = dist === 0 ? (Math.random() - 0.5) : (p1.x - p2.x) / safeDist;
                        const dy = dist === 0 ? (Math.random() - 0.5) : (p1.y - p2.y) / safeDist;
                        const push = overlap * pushMult * timeScale;
                        
                        const applyPush = (p, px, py) => {
                            if (isNaN(px) || isNaN(py)) return;
                            p.x += px; p.y += py;
                            // Hard boundary clamp so anti-stacking doesn't push through walls
                            if (p.y < 120 || p.y > 1080) {
                                if (p.x < 120) p.x = 120;
                                if (p.x > 1880) p.x = 1880;
                            }
                        };
                        
                        if (isP1GK && !isP2GK) {
                            applyPush(p2, -dx * push, -dy * push);
                        } else if (isP2GK && !isP1GK) {
                            applyPush(p1, dx * push, dy * push);
                        } else {
                            if (!p1.hasPossession && !p1.isGoalkeeper) applyPush(p1, dx * push, dy * push);
                            if (!p2.hasPossession && !p2.isGoalkeeper) applyPush(p2, -dx * push, -dy * push);
                        }
                    }
                }
            }
        }

        this.players.forEach(p => p.update && p.update(time, delta, this.cursors || this.keys, this.mobileKeys, this.ball));

        // Controlled player switching has been disabled (user stays in control of their custom character)

        if (this.ballShadow && this.ball) { this.ballShadow.x = this.ball.x; this.ballShadow.y = this.ball.y + 15; }
        if (this.ballGlow && this.ball) { this.ballGlow.x = this.ball.x; this.ballGlow.y = this.ball.y; }

        // Player indicator is handled by minimal arrow in Player.js


        // Smooth Camera Tracking (clamped between 0.78 and 0.86, no abrupt drops)
        if (this.ball && this.ball.body) {
            let targetZoom = 0.84;
            if (this.ball.x < 350 || this.ball.x > 1650 || this.ball.y < 250 || this.ball.y > 950) {
                targetZoom = 0.79;
            }
            this.cameras.main.zoom += (targetZoom - this.cameras.main.zoom) * 0.04 * timeScale;
        }

        // Accurate Player Speed KM/H with EMA Smoothing (frame-rate independent, clamped 0 - 36 km/h)
        if (this.humanPlayer && this.humanPlayer.body && this.speedText) {
            const pxSpeed = this.humanPlayer.body.velocity.length();
            const rawKmh = (pxSpeed / 300) * 35;
            const clampedKmh = Math.min(36, Math.max(0, rawKmh));
            
            if (this._smoothedSpeedKmh === undefined) this._smoothedSpeedKmh = 0;
            if (pxSpeed < 5) {
                this._smoothedSpeedKmh = 0;
            } else {
                const alpha = 0.15; // ~200 ms EMA smoothing
                this._smoothedSpeedKmh = (alpha * clampedKmh) + ((1 - alpha) * this._smoothedSpeedKmh);
            }
            const displayKmh = Math.round(this._smoothedSpeedKmh);
            this.speedText.setText(`SPD: ${displayKmh} KM/H`);
        }

        // Dynamic Sprint Button 3 States
        if (this.sprintBtnObj && this.humanPlayer) {
            if (this.humanPlayer.isFatigued || this.humanPlayer.stamina < 5) {
                // State 3: Locked / No Stamina
                this.sprintBtnObj.bg.setFillStyle(0x334155, 0.35);
                this.sprintBtnObj.bg.setStrokeStyle(1.5, 0x64748b, 0.4);
                this.sprintBtnObj.icon.setText("🔒");
                this.sprintBtnObj.text.setFill("#64748b");
                this.sprintBtnObj.bg.setScale(1.0);
            } else if (this.humanPlayer.isSprinting || (this.mobileKeys && (this.mobileKeys.through || this.mobileKeys.sprint))) {
                // State 2: Pressed / Sprinting
                this.sprintBtnObj.bg.setFillStyle(0x22c55e, 0.90);
                this.sprintBtnObj.bg.setStrokeStyle(3, 0x00ffff, 1.0);
                this.sprintBtnObj.icon.setText("⚡");
                this.sprintBtnObj.text.setFill("#ffffff");
                this.sprintBtnObj.bg.setScale(0.92);
            } else {
                // State 1: Active / Ready
                this.sprintBtnObj.bg.setFillStyle(0x0f172a, 0.65);
                this.sprintBtnObj.bg.setStrokeStyle(2, 0x4ade80, 0.85);
                this.sprintBtnObj.icon.setText("🏃");
                this.sprintBtnObj.text.setFill("#4ade80");
                this.sprintBtnObj.bg.setScale(1.0);
            }
        }

        // Smooth Minimap update (30 FPS instead of 500ms stutter)
        this._minimapAccum = (this._minimapAccum || 0) + delta;
        if (this._minimapAccum >= 33) {
            this._minimapAccum = 0;
            this.updateMinimap();
        }

        if (!this.matchFinished) {
            // Match Time Countdown
            this.matchTime += delta;
            if (this.matchTime >= this.matchDuration) {
                this.matchTime = this.matchDuration;
            }
            const remaining = this.matchDuration - this.matchTime;
            
            this._timerAccum = (this._timerAccum || 0) + delta;
            if (this._timerAccum >= 500) {
                this._timerAccum = 0;
                const mins = Math.floor(remaining / 60000); 
                const secs = Math.floor((remaining % 60000) / 1000);
                this.timerText.setText(`${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`);
            }

            // End match when time hits 0 (guarded)
            if (remaining <= 0 && !this.resetting) {
                this.endMatch();
            }
        }

        // Render stamina bar HUD for controlled player (throttled)
        this._staminaAccum = (this._staminaAccum || 0) + delta;
        if (this.humanPlayer && this._staminaAccum > 100) {
            this._staminaAccum = 0;
            this.drawStaminaHUD(this.humanPlayer.stamina);
        }
        
        // Update Ball Controller Bar (throttled)
        this._bcBarAccum = (this._bcBarAccum || 0) + delta;
        if (this.ballControllerBar && this.ballControllerText && this._bcBarAccum > 100) {
            this._bcBarAccum = 0;
            this.ballControllerBar.clear();
            const bx = this.width - 250;
            const by = this.height - 40;
            const bw = 160;
            const bh = 24;
            
            this.ballControllerBar.fillStyle(0x02000c, 0.8);
            this.ballControllerBar.fillRoundedRect(bx - bw/2, by - bh/2, bw, bh, 6);
            
            if (this.ballController) {
                const color = this.ballController.isLeftTeam ? 0xd946ef : 0x3b82f6;
                this.ballControllerBar.lineStyle(1.5, color, 1);
                this.ballControllerBar.strokeRoundedRect(bx - bw/2, by - bh/2, bw, bh, 6);
                
                // Add possession indicator circle
                this.ballControllerBar.fillStyle(color, 1);
                this.ballControllerBar.fillCircle(bx - bw/2 + 12, by, 4);
                
                let bName = this.ballController.playerName.replace("⭐ ", "");
                this.ballControllerText.setText(bName.length > 12 ? bName.substring(0, 10) + "..." : bName);
                this.ballControllerText.setFill('#ffffff');
                this.ballControllerText.setX(bx + 8);
            } else {
                this.ballControllerBar.lineStyle(1, 0x475569, 0.8);
                this.ballControllerBar.strokeRoundedRect(bx - bw/2, by - bh/2, bw, bh, 6);
                this.ballControllerText.setText("SERBEST TOP");
                this.ballControllerText.setFill('#94a3b8');
                this.ballControllerText.setX(bx);
            }
        }

        // Precise goal line crossing detection (full ball must cross strictly between posts)
        if (!this.resetting && this.ball && !this.goalScored) {
            const ballRadius = 20;
            // Goal Left (Right team scores)
            if (this.ball.x < 125 - ballRadius && this.ball.y > 470 && this.ball.y < 730) {
                this.goalScored = true;
                this.handleGoal('right');
            }
            // Goal Right (Left team scores)
            else if (this.ball.x > 1875 + ballRadius && this.ball.y > 470 && this.ball.y < 730) {
                this.goalScored = true;
                this.handleGoal('left');
            }
            }
    }

    handleGoal(winnerSide) {
        if (this.resetting) return;
        this.resetting = true;
        
        if (window.AnalyticsManager) window.AnalyticsManager.logEvent('goal_scored', { side: winnerSide });
        
        let scorer = this.lastTouchPlayer;

        if (winnerSide === 'left') {
            this.score.left++;
            if (this.lastTouchPlayer === this.humanPlayer) {
                this.userPlayerStats.goals++;
                this.recordMatchRatingEvent(1.2, "Gol");
            }
            if (this.secondLastTouchPlayer === this.humanPlayer) {
                this.userPlayerStats.assists++;
                this.recordMatchRatingEvent(0.8, "Asist");
            }
        } else {
            this.score.right++;
        }
        
        this.scoreTextLeft.setText(this.score.left); this.scoreTextRight.setText(this.score.right);
        this.cameras.main.shake(400, 0.015); this.cameras.main.zoomTo(1.2, 600, 'Sine.easeInOut');
        
        const goalText = this.add.text(this.width/2, 180, "GOAL!", { font: '700 65px sans-serif', fill: '#ffffff', fontStyle: 'italic' }).setOrigin(0.5).setDepth(2000).setScrollFactor(0);
        goalText.setStroke('#d946ef', 8);
        const textShadow = this.add.text(this.width/2, 186, "GOAL!", { font: '700 65px sans-serif', fill: '#000000', fontStyle: 'italic' }).setOrigin(0.5).setDepth(1999).setScrollFactor(0);
        
        let scorerName = scorer ? (scorer.playerName || "") : "";
        
        // Remove star prefix and any generic fallback words to ensure clean DB names
        scorerName = scorerName.replace("⭐ ", "").replace(/^(CPU|PLAYER|STRIKER|DEFENDER|KEEPER|UNKNOWN|TEAMMATE A|TEAMMATE B|Rakip Forvet|Rakip Defans|Rakip Kaleci|Oyuncu|Takım Arkadaşı|Takım Kalecisi)$/i, "").trim().toUpperCase();
        if (!scorerName) scorerName = "GOAL"; // Fallback text if name completely fails
        const scorerText = this.add.text(this.width/2, 240, scorerName, { font: '700 29px sans-serif', fill: '#facc15', letterSpacing: 2 }).setOrigin(0.5).setDepth(2000).setScrollFactor(0);
        scorerText.setStroke('#000000', 4);
        
        this.cameras.main.ignore([goalText, textShadow, scorerText]);

        // Premium pop-in animation
        goalText.setScale(0); textShadow.setScale(0); scorerText.setAlpha(0); scorerText.y += 20;
        
        this.tweens.add({ targets: [goalText, textShadow], scale: 1.2, duration: 400, ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({ targets: [goalText, textShadow], scale: 1.3, alpha: 0, duration: 600, delay: 200, ease: 'Power2' });
            }
        });
        
        this.tweens.add({ targets: scorerText, alpha: 1, y: '-=20', duration: 300, ease: 'Back.out', delay: 150,
            onComplete: () => {
                this.tweens.add({ targets: scorerText, alpha: 0, scale: 1.1, duration: 600, delay: 350, ease: 'Power2' });
            }
        });
        
        const goalParticles = this.add.particles(this.ball.x, this.ball.y, 'ball_basic', {
            speed: { min: 100, max: 400 }, lifespan: 1000, scale: { start: 0.5, end: 0 },
            blendMode: 'ADD', tint: [0xd946ef, 0x38bdf8, 0xffffff], quantity: 50, duration: 100
        }).setDepth(1000);
        this.uiCamera.ignore(goalParticles);
        this.time.delayedCall(1500, () => goalParticles.destroy());

        // Apply Goal Animation Effect (2D Screen / Goal Effect)
        if (window.gameState && window.gameState.customization && window.gameState.customization.equipped) {
            const anim = window.gameState.customization.equipped.goalAnimation;
            const cx = this.width / 2;
            const cy = this.height / 2;
            const bx = this.ball.x;
            const by = this.ball.y;
            
            let pSystem = null;

            if (anim === 'anim_default' || anim === 'default_goal') {
                const flash = this.add.rectangle(cx, cy, this.width, this.height, 0xffffff, 0.3).setDepth(1500).setScrollFactor(0);
                this.tweens.add({ targets: flash, alpha: 0, duration: 500, onComplete: () => flash.destroy() });
            } else if (anim === 'anim_fire' || anim === 'fire_burst') {
                pSystem = this.add.particles(bx, by, 'ball_basic', {
                    speed: { min: 200, max: 600 }, angle: { min: -135, max: -45 }, scale: { start: 1, end: 0.1 },
                    alpha: { start: 1, end: 0 }, lifespan: 800, quantity: 100, duration: 400, blendMode: 'ADD', tint: [0xff0000, 0xffa500, 0xffff00]
                }).setDepth(1500);
            } else if (anim === 'anim_electric' || anim === 'electric_wave') {
                pSystem = this.add.particles(bx, by, 'ball_basic', {
                    speed: { min: 300, max: 800 }, angle: { min: 0, max: 360 }, scale: { start: 0.2, end: 1.2 },
                    alpha: { start: 1, end: 0 }, lifespan: 600, quantity: 80, duration: 400, blendMode: 'ADD', tint: [0x00ffff, 0x0000ff]
                }).setDepth(1500);
                const ring = this.add.circle(bx, by, 20, 0x00ffff).setStrokeStyle(4, 0xffffff).setDepth(1501);
                this.tweens.add({ targets: ring, radius: 400, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
            } else if (anim === 'anim_ice' || anim === 'ice_break') {
                pSystem = this.add.particles(bx, by, 'ball_basic', {
                    speed: { min: 100, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 0.8, end: 0 },
                    alpha: { start: 0.9, end: 0 }, lifespan: 1500, quantity: 120, duration: 500, blendMode: 'ADD', tint: [0xadd8e6, 0xffffff]
                }).setDepth(1500);
            } else if (anim === 'anim_neon' || anim === 'neon_ring') {
                const ring1 = this.add.circle(bx, by, 30).setStrokeStyle(8, 0xd946ef).setDepth(1500);
                const ring2 = this.add.circle(bx, by, 30).setStrokeStyle(4, 0x00ffff).setDepth(1501);
                this.tweens.add({ targets: ring1, radius: 500, alpha: 0, duration: 1000, ease: 'Quad.easeOut' });
                this.tweens.add({ targets: ring2, radius: 600, alpha: 0, duration: 1200, ease: 'Quad.easeOut', onComplete: () => { ring1.destroy(); ring2.destroy(); }});
            } else if (anim === 'anim_energy' || anim === 'energy_explosion') {
                const flash = this.add.circle(bx, by, 80, 0xffffff, 1).setDepth(1500);
                this.tweens.add({ targets: flash, scale: 10, alpha: 0, duration: 800, ease: 'Expo.easeOut', onComplete: () => flash.destroy() });
                
                pSystem = this.add.particles(bx, by, 'ball_basic', {
                    speed: { min: 400, max: 1000 }, angle: { min: 0, max: 360 }, scale: { start: 1, end: 0 },
                    alpha: { start: 1, end: 0 }, lifespan: 1000, quantity: 150, duration: 300, blendMode: 'ADD', tint: [0x10b981, 0x059669]
                }).setDepth(1501);
            }
            
            if (pSystem) {
                this.uiCamera.ignore(pSystem);
                this.time.delayedCall(1500, () => pSystem.destroy());
            }
        }

        // Delay before resetting positions for next kickoff
        this.time.delayedCall(1200, () => {
            goalText.destroy(); textShadow.destroy(); scorerText.destroy();
            this.resetPositions();
        });
        
        // Reset touches
        this.lastTouchPlayer = null;
        this.secondLastTouchPlayer = null;
    }

    resetPositions() {
        this.ballState = 'FREE';
        if (this.ball && this.ball.body) {
            this.ball.body.checkCollision.none = false;
        }
        
        this.ball.setPosition(1000, 600);
        this.ball.body.setVelocity(0, 0);
        this.ball.body.setAngularVelocity(0);
        
        this.goalScored = false;
        
        // Remove possession and GK held states from all players
        this.ballController = null;
        this.players.forEach(p => {
            if (p.resetState) {
                let hx = p._homeX || 1000;
                let hy = p._homeY || 600;
                hx += (Math.random() - 0.5) * 5; // Jitter to prevent exact overlap
                hy += (Math.random() - 0.5) * 5;
                p.resetState(hx, hy);
            }
        });
        this.cameras.main.zoomTo(0.8, 500, 'Sine.easeInOut');
        this._smoothedSpeedKmh = 0;
        if (this.speedText) this.speedText.setText("SPD: 0 KM/H");
        if (this.humanPlayer && this.humanPlayer.body) {
            this.humanPlayer.body.setVelocity(0, 0);
            this.humanPlayer.body.setAcceleration(0, 0);
        }
        this.resetting = false;
    }

    createStaminaBar() {
        this.staminaGraphics = this.add.graphics().setScrollFactor(0).setDepth(1000);
        
        this.staminaAvatar = this.add.text(0, 0, "😐", { fontSize: '19px' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        
        this.staminaPlayerName = this.add.text(0, 0, "", { 
            font: '800 14px "Inter", sans-serif', 
            fill: '#ffffff',
            letterSpacing: 1
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1001);
        
        this.staminaPosition = this.add.text(0, 0, "CF", { 
            font: '800 11px "Inter", sans-serif', 
            fill: '#d946ef'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
        
        this.staminaRatingValue = this.add.text(0, 0, "6.5", { 
            font: '900 13px "Inter", sans-serif', 
            fill: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1001);
        
        this.staminaLightning = this.add.text(0, 0, "⚡", { fontSize: '14px' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    }

    drawStaminaHUD(stamina) {
        if (!this.staminaGraphics) return;
        this.staminaGraphics.clear();
        
        // Bottom Center Placement
        const w = 460;
        const h = 40;
        const r = 20;
        const x = (this.width - w) / 2;
        const y = this.height - h - 15;
        
        const maxStamina = 100;
        const pct = Math.max(0, stamina / maxStamina);

        // Container background
        this.staminaGraphics.fillStyle(0x060614, 0.85);
        this.staminaGraphics.fillRoundedRect(x, y, w, h, r);
        
        // Avatar circle
        const avatarX = x + 25;
        const avatarY = y + h/2;
        this.staminaGraphics.fillStyle(0x1e1b4b, 1);
        this.staminaGraphics.fillCircle(avatarX, avatarY, 14);
        this.staminaGraphics.lineStyle(1.5, 0x00ffff, 0.15);
        this.staminaGraphics.strokeCircle(avatarX, avatarY, 14);
        
        const hp = this.humanPlayer || {};
        const profile = window.gameState.player || {};
        const expressionMap = { 'neutral': '😐', 'angry': '😠', 'sad': '😢', 'crying': '😭' };
        // Use humanPlayer's expression if available, else fallback
        const expr = (hp && hp.expression) ? hp.expression : (profile.expression || 'neutral');
        this.staminaAvatar.setText(expressionMap[expr] || "😐");
        this.staminaAvatar.setPosition(avatarX, avatarY);
        
        // Show real player name from squad if we are controlling them, else fallback
        let pName = hp.playerName ? hp.playerName : (profile.name || "OYUNCU");
        pName = pName.replace("⭐ ", "");
        this.staminaPlayerName.setText(pName.toUpperCase());
        this.staminaPlayerName.setPosition(avatarX + 25, avatarY);
        
        // Position badge
        const posW = 34; const posH = 20;
        const posX = x + 160;
        const posY = y + h/2 - posH/2;
        this.staminaGraphics.fillStyle(0x020008, 0.6);
        this.staminaGraphics.fillRoundedRect(posX, posY, posW, posH, 4);
        this.staminaGraphics.lineStyle(1, 0xd946ef, 0.15);
        this.staminaGraphics.strokeRoundedRect(posX, posY, posW, posH, 4);
        
        let pRole = hp.role || "CF";
        this.staminaPosition.setText(pRole);
        this.staminaPosition.setPosition(posX + posW/2, y + h/2);
        
        // Rating
        const currentRating = this.calculatePlayerRating ? this.calculatePlayerRating().toFixed(1) : "6.5";
        this.staminaRatingValue.setText(currentRating);
        this.staminaRatingValue.setPosition(posX + posW + 20, avatarY);
        this.staminaLightning.setPosition(posX + posW + 55, avatarY);

        // Stamina bar track
        const trackX = posX + posW + 65;
        const trackY = y + h/2 - 5;
        const trackW = 160;
        const trackH = 10;
        
        // Segmented fill 
        const segCount = 15;
        const segGap = 3;
        const slant = 4;
        const segW = (trackW - (segGap * (segCount - 1))) / segCount;
        const activeSeg = Math.round(pct * segCount);
        
        for (let i = 0; i < segCount; i++) {
            const sx = trackX + i * (segW + segGap);
            
            this.staminaGraphics.beginPath();
            this.staminaGraphics.moveTo(sx + slant, trackY);
            this.staminaGraphics.lineTo(sx + slant + segW, trackY);
            this.staminaGraphics.lineTo(sx + segW, trackY + trackH);
            this.staminaGraphics.lineTo(sx, trackY + trackH);
            this.staminaGraphics.closePath();
            
            if (i < activeSeg) {
                if (pct > 0.5) this.staminaGraphics.fillStyle(0x4ade80, 1);
                else if (pct > 0.25) this.staminaGraphics.fillStyle(0xfbbf24, 1);
                else this.staminaGraphics.fillStyle(0xf43f5e, 1);
            } else {
                this.staminaGraphics.fillStyle(0x1e1b4b, 0.6);
            }
            this.staminaGraphics.fillPath();
        }
    }

    closePauseMenu() {
        if (this.pauseMenuContainer) {
            this.pauseMenuContainer.destroy();
            this.pauseMenuContainer = null;
        }
        if (this.mobileControlsGroup) {
            this.mobileControlsGroup.setVisible(true);
        }
        this.isPauseMenuOpen = false;
        this.isGamePaused = false;
    }

    showPauseMenu() {
        if (this.isPauseMenuOpen) return;
        this.isPauseMenuOpen = true;
        this.isGamePaused = true;
        
        // Pause physics
        this.physics.pause();
        
        if (this.mobileControlsGroup) {
            this.mobileControlsGroup.setVisible(false);
        }

        const cx = this.width / 2;
        const cy = this.height / 2;

        // Cleanup any old container if it exists
        if (this.pauseMenuContainer) {
            this.pauseMenuContainer.destroy();
            this.pauseMenuContainer = null;
        }

        this.pauseMenuContainer = this.add.container(0, 0).setDepth(10000).setScrollFactor(0);
        this.cameras.main.ignore(this.pauseMenuContainer);

        // 1. Dark overlay
        const overlay = this.add.rectangle(cx, cy, this.width, this.height, 0x000000, 0);
        overlay.setInteractive();
        this.tweens.add({ targets: overlay, fillAlpha: 0.75, duration: 250 });

        // 2. Glassmorphism Main Panel
        const panelW = 460;
        const panelH = 430;
        
        // Background card
        const panel = this.add.graphics();
        panel.fillStyle(0x080314, 0.9);
        panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 20);
        
        // Main Glow Border
        panel.lineStyle(2, 0xd946ef, 1);
        panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 20);

        // Cyber corner accents (small styling details)
        panel.lineStyle(1.5, 0x00ffff, 0.15);
        // Top-left cyber line
        panel.beginPath();
        panel.moveTo(cx - panelW / 2 + 10, cy - panelH / 2 + 30);
        panel.lineTo(cx - panelW / 2 + 10, cy - panelH / 2 + 10);
        panel.lineTo(cx - panelW / 2 + 30, cy - panelH / 2 + 10);
        // Bottom-right cyber line
        panel.moveTo(cx + panelW / 2 - 10, cy + panelH / 2 - 30);
        panel.lineTo(cx + panelW / 2 - 10, cy + panelH / 2 - 10);
        panel.lineTo(cx + panelW / 2 - 30, cy + panelH / 2 - 10);
        panel.strokePath();

        this.pauseMenuContainer.add([overlay, panel]);

        // Hexagonal Pause Logo at the top center
        const hexG = this.add.graphics();
        const hexX = cx;
        const hexY = cy - panelH / 2 + 45;
        const hexSize = 20;
        
        hexG.fillStyle(0x0d0321, 0.95);
        hexG.lineStyle(2, 0xd946ef, 1);
        hexG.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 - Math.PI / 2; // Flat top style
            const px = hexX + Math.cos(angle) * hexSize;
            const py = hexY + Math.sin(angle) * hexSize;
            if (i === 0) hexG.moveTo(px, py);
            else hexG.lineTo(px, py);
        }
        hexG.closePath();
        hexG.fillPath();
        hexG.strokePath();

        // Draw pause bars inside hexagon
        hexG.lineStyle(2.5, 0xffffff, 1);
        hexG.lineBetween(hexX - 4, hexY - 7, hexX - 4, hexY + 7);
        hexG.lineBetween(hexX + 4, hexY - 7, hexX + 4, hexY + 7);
        this.pauseMenuContainer.add(hexG);

        // Header text
        const title = this.add.text(cx, cy - 110, "OYUN DURAKLATILDI", { font: '700 26px sans-serif', fill: '#ffffff', letterSpacing: 2 }).setOrigin(0.5);
        title.setShadow(0, 0, '#d946ef', 12, true, true);
        const subtitle = this.add.text(cx, cy - 80, "Ne yapmak istersin?", { font: '700 12.5px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        this.pauseMenuContainer.add([title, subtitle]);

        // Close Button (X) at top right of the panel
        const closeBtn = this.add.container(cx + panelW / 2 - 35, cy - panelH / 2 + 35);
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0x0e051c, 0.85);
        closeBg.lineStyle(1.8, 0xd946ef, 1);
        closeBg.fillRoundedRect(-14, -14, 28, 28, 6);
        closeBg.strokeRoundedRect(-14, -14, 28, 28, 6);
        
        const closeX = this.add.text(0, 0, "X", { font: '900 12.5px sans-serif', fill: '#d946ef' }).setOrigin(0.5);
        closeBtn.add([closeBg, closeX]);
        this.pauseMenuContainer.add(closeBtn);

        // Setup Close Button Interaction directly on closeBtn container
        closeBtn.setSize(28, 28);
        closeBtn.setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, closeBtn);
        closeBtn.on('pointerdown', () => {
            this.closePauseMenu();
            this.physics.resume();
        });
        closeBtn.on('pointerover', () => {
            closeBg.clear();
            closeBg.fillStyle(0x0e051c, 0.85);
            closeBg.lineStyle(2, 0x00ffff, 1);
            closeBg.fillRoundedRect(-14, -14, 28, 28, 6);
            closeBg.strokeRoundedRect(-14, -14, 28, 28, 6);
            closeX.setFill('#00ffff');
        });
        closeBtn.on('pointerout', () => {
            closeBg.clear();
            closeBg.fillStyle(0x0e051c, 0.85);
            closeBg.lineStyle(1.8, 0xd946ef, 1);
            closeBg.fillRoundedRect(-14, -14, 28, 28, 6);
            closeBg.strokeRoundedRect(-14, -14, 28, 28, 6);
            closeX.setFill('#d946ef');
        });

        // 4. Buttons List
        const buttonStartY = cy - 35;
        const buttonSpacing = 82;

        const buildButton = (yOffset, icon, label, desc, themeColor, onClick) => {
            const btnCont = this.add.container(cx, buttonStartY + yOffset);
            
            const btnW = 380;
            const btnH = 64;

            // Background panel
            const bg = this.add.graphics();
            bg.fillStyle(0x06010e, 0.95);
            bg.lineStyle(1.8, themeColor, 0.6);
            bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
            bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

            // Left icon hexagon
            const hexX = -btnW / 2 + 35;
            const hexG = this.add.graphics();
            hexG.fillStyle(0x0d0321, 0.9);
            hexG.lineStyle(1.8, themeColor, 0.95);
            hexG.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 - Math.PI / 2;
                const px = hexX + Math.cos(angle) * 18;
                const py = Math.sin(angle) * 18;
                if (i === 0) hexG.moveTo(px, py);
                else hexG.lineTo(px, py);
            }
            hexG.closePath();
            hexG.fillPath();
            hexG.strokePath();

            // Text icon inside hexagon
            const iconText = this.add.text(hexX, 0, icon, { font: '700 14px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

            // Labels
            const labelTxt = this.add.text(-btnW / 2 + 70, -10, label, { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
            const descTxt = this.add.text(-btnW / 2 + 70, 12, desc, { font: '800 10.5px sans-serif', fill: '#94a3b8' }).setOrigin(0, 0.5);

            // Right-aligned arrows
            const arrowText = this.add.text(btnW / 2 - 35, 0, ">>>", { font: '700 14px sans-serif', fill: themeColor }).setOrigin(0.5);

            btnCont.add([bg, hexG, iconText, labelTxt, descTxt, arrowText]);
            this.pauseMenuContainer.add(btnCont);

            // Interaction area
            const hitArea = this.add.rectangle(0, 0, btnW, btnH, 0, 0)
                .setInteractive({ useHandCursor: true });
            btnCont.add(hitArea);

            hitArea.on('pointerover', () => {
                this.tweens.add({ targets: btnCont, scaleX: 1.02, scaleY: 1.02, duration: 150 });
                
                // Redraw with highlight glow style
                bg.clear();
                bg.fillStyle(0x06010e, 0.95);
                bg.lineStyle(2, themeColor, 1);
                bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
                bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
                
                arrowText.setFill('#ffffff');
                arrowText.setShadow(0, 0, themeColor, 10, true, true);
            });

            hitArea.on('pointerout', () => {
                this.tweens.add({ targets: btnCont, scaleX: 1, scaleY: 1, duration: 150 });
                
                // Redraw with regular style
                bg.clear();
                bg.fillStyle(0x06010e, 0.95);
                bg.lineStyle(1.8, themeColor, 0.6);
                bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
                bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
                
                arrowText.setFill(themeColor);
                arrowText.setShadow(0, 0, '#000000', 0);
            });

            hitArea.on('pointerdown', () => {
                this.tweens.add({
                    targets: btnCont, scaleX: 0.96, scaleY: 0.96, duration: 60, yoyo: true,
                    onComplete: () => {
                        onClick();
                    }
                });
            });
        };

        // Button 1: DEVAM ET (Pink)
        buildButton(0, "▶", "DEVAM ET", "Oyuna kaldığın yerden devam et.", 0xd946ef, () => {
            this.closePauseMenu();
            this.physics.resume();
        });

        // Button 2: YENİDEN BAŞLAT (Purple)
        buildButton(buttonSpacing, "↻", "YENİDEN BAŞLAT", "Maçı baştan başlat.", 0x7048e8, () => {
            this.closePauseMenu();
            this.scene.restart();
        });

        // Button 3: MENÜYE DÖN (Red)
        buildButton(buttonSpacing * 2, "🏠", "MENÜYE DÖN", "Ana menüye dön.", 0xef4444, () => {
            this.closePauseMenu();
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MenuScene'));
        });

        // Intro Animation
        this.pauseMenuContainer.setAlpha(0);
        this.pauseMenuContainer.setScale(0.9);
        this.tweens.add({
            targets: this.pauseMenuContainer,
            alpha: 1,
            scale: 1,
            duration: 250,
            ease: 'Back.out'
        });
    }

    recordMatchRatingEvent(delta, reason) {
        if (this.currentMatchRating === undefined) this.currentMatchRating = 6.0;
        this.currentMatchRating = Phaser.Math.Clamp(Number((this.currentMatchRating + delta).toFixed(2)), 1.0, 10.0);
        const sign = delta >= 0 ? `+${delta.toFixed(2)}` : `${delta.toFixed(2)}`;
        console.log(`[MatchRating] ${sign} (${reason}) -> ${this.currentMatchRating.toFixed(1)}`);
    }

    calculatePlayerRating() {
        return this.currentMatchRating !== undefined ? Number(this.currentMatchRating.toFixed(1)) : 6.0;
    }

    endMatch() {
        // GUARD: Prevent multiple calls
        if (this.matchFinished) return;
        this.matchFinished = true;
        
        console.log("[GameScene] MATCH FINISHED TRIGGERED");

        // 1. Stop everything safely
        this.isGamePaused = true;
        
        // 2. Disable ALL input (prevents HUD clicks during transition)
        this.input.enabled = false;
        if (this.input.keyboard) this.input.keyboard.removeAllListeners();
        
        try { this.physics.pause(); } catch(e) { }
        
        // 3. Stop all AI and player movement completely
        this.players.forEach(p => {
            if (p && p.body) {
                p.body.setVelocity(0, 0);
                p.body.setAcceleration(0, 0);
            }
        });
        if (this.ball && this.ball.body) {
            this.ball.body.setVelocity(0, 0);
            this.ball.body.setAcceleration(0, 0);
        }
        
        this._smoothedSpeedKmh = 0;
        if (this.speedText) this.speedText.setText("SPD: 0 KM/H");
        
        // 4. Calculate result (once)
        const ratingVal = Number(this.calculatePlayerRating().toFixed(1));
        const staminaVal = Math.round(this.userPlayerStats.staminaUsed || 0);
        
        const matchStats = {
            scoreLeft: this.score.left,
            scoreRight: this.score.right,
            isWin: this.score.left > this.score.right,
            userStats: {
                name: this.humanPlayer ? this.humanPlayer.playerName : 'Player',
                expression: (window.gameState && window.gameState.customization && window.gameState.customization.equipped) ? window.gameState.customization.equipped.expression : '😐',
                goals: this.userPlayerStats.goals,
                assists: this.userPlayerStats.assists,
                shots: this.userPlayerStats.shots,
                shotsOnTarget: this.userPlayerStats.shotsOnTarget,
                passes: this.userPlayerStats.passes,
                accuratePasses: this.userPlayerStats.accuratePasses || 0,
                tackles: this.userPlayerStats.tackles,
                staminaUsed: staminaVal,
                rating: ratingVal
            }
        };
        
        // 5. Save to career
        if (window.gameState && window.gameState.career) {
            window.gameState.career.goals = (window.gameState.career.goals || 0) + this.userPlayerStats.goals;
        }

        // Telemetry Match End Tracking
        if (window.AnalyticsService) {
            const activeMatch = window.gameState.activeMatch;
            const isWin = this.score.left > this.score.right;
            const isDraw = this.score.left === this.score.right;
            const resultStr = isWin ? 'win' : (isDraw ? 'draw' : 'loss');

            window.AnalyticsService.track('match_end', {
                match_id: activeMatch ? (activeMatch.id || 'match_' + Date.now()) : ('match_' + Date.now()),
                match_number: window.gameState.career ? (window.gameState.career.currentWeek || 1) : 1,
                match_index: this.matchIndex || 1,
                result: resultStr,
                user_score: this.score.left,
                opp_score: this.score.right,
                duration_sec: Math.max(1, Math.round((Date.now() - (this.kickoffTimestamp || Date.now())) / 1000)),
                completed: true
            });

            window.AnalyticsService.incrementMatchIndex();
        }
        
        // 6. Safe scene transition with fallback
        this.cameras.main.fadeOut(800);
        if (this.uiCamera) this.uiCamera.fadeOut(800); // Fade HUD so it doesn't freeze on screen
        
        // Use setTimeout as a foolproof fallback in case Phaser's internal clock gets paused
        let transitionStarted = false;
        const transitionToNextScene = () => {
            if (transitionStarted) return;
            transitionStarted = true;
            console.log("[GameScene] Starting PostMatchScene");
            this.scene.start('PostMatchScene', matchStats);
        };
        
        this.time.delayedCall(850, transitionToNextScene);
        setTimeout(transitionToNextScene, 1000); // Guaranteed trigger
    }

    shutdown() {
        // Track match abandon if match was left before completion
        if (!this.matchFinished && !this.abandonTracked && this.kickoffTimestamp > 0 && window.AnalyticsService) {
            this.abandonTracked = true;
            const activeMatch = window.gameState.activeMatch;
            window.AnalyticsService.track('match_abandon', {
                match_id: activeMatch ? (activeMatch.id || 'match_' + Date.now()) : ('match_' + Date.now()),
                match_number: window.gameState.career ? (window.gameState.career.currentWeek || 1) : 1,
                match_index: this.matchIndex || 1,
                time_spent_sec: Math.max(1, Math.round((Date.now() - this.kickoffTimestamp) / 1000))
            });
        }
    }
}
