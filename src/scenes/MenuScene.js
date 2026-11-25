class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
        this.currentTab = 'missions';
        this.tabs = ['Görevler', 'Modlar', 'Multiplayer', 'Profil'];
    }

    
    
    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        if (window.audioManager) {
            window.audioManager.scene = this;
            window.audioManager.playBGM('bgm', 1500);
        }

        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        this.createBackground();
        this.createProfileCard();
        this.createMenuButtons();
        this.createSpinButton();
        this.createBottomBar();

        this.cameras.main.fadeIn(1000, 0, 0, 0);
    }

    createBackground() {
        // Base Cyber Gradient Background
        const baseG = this.add.graphics();
        baseG.fillGradientStyle(0x0f051d, 0x0f051d, 0x1e0b36, 0x070f26, 1);
        baseG.fillRect(0, 0, this.width, this.height);

        let bgKey = 'bg_stadium';

        if (this.textures.exists(bgKey)) {
            const bgImage = this.add.image(this.width / 2, this.height / 2, bgKey);
            const scaleX = this.width / bgImage.width;
            const scaleY = this.height / bgImage.height;
            const scale = Math.max(scaleX, scaleY);
            bgImage.setScale(scale);
            bgImage.setAlpha(0.85); // Allow cyber gradient to shine through
        }
        
        const vignette = this.add.graphics();
        vignette.fillStyle(0x0a0515, 0.25);
        vignette.fillRect(0, 0, this.width, this.height);

        if (this.textures.exists('particle')) {
            this.add.particles(0, 0, 'particle', {
                x: { min: 0, max: this.width },
                y: { min: 0, max: this.height },
                lifespan: 4000,
                speedY: { min: -10, max: -30 },
                speedX: { min: -10, max: 10 },
                scale: { start: 1, end: 0 },
                alpha: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                frequency: 300,
                maxParticles: 20,
                tint: [ 0xdb2777, 0x9333ea, 0xffffff ]
            });
        }
    }

    createProfileCard() {
        const startX = 50;
        const profile = window.gameState.player;
        const profileContainer = this.add.container(startX, 40);
        
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x07111f, 0.65); // Dark navy glass
        cardBg.fillRoundedRect(0, 0, 360, 76, 12);
        cardBg.lineStyle(1.5, 0x06b6d4, 0.8); // Glowing cyan border
        cardBg.strokeRoundedRect(0, 0, 360, 76, 12);

        const avatarGlow = this.add.circle(46, 38, 28, 0x06b6d4, 0.3);
        const avatarCircle = this.add.circle(46, 38, 25, 0x0f172a).setStrokeStyle(1.5, 0x06b6d4);
        const expressionMap = { 'neutral': '😐', 'angry': '😠', 'sad': '😢', 'crying': '😭' };
        const avatarFace = this.add.text(46, 38, expressionMap[profile.expression] || '😐', { fontSize: '23px' }).setOrigin(0.5);

        const displayUsername = (window.gameState.userProfile && window.gameState.userProfile.username) ? window.gameState.userProfile.username : profile.name;
        const nameText = this.add.text(88, 16, displayUsername, { font: '700 20px sans-serif', fill: '#ffffff' });
        const editIcon = this.add.text(88 + nameText.width + 8, 18, "✏️", { fontSize: '15px' });
        const levelText = this.add.text(88, 44, `Level ${profile.level}`, { font: '600 13px sans-serif', fill: '#94a3b8' });
        const ezText = this.add.text(158, 44, `🪙 ${window.gameState.career.ez} EZ`, { font: '700 13px sans-serif', fill: '#fbbf24' });

        const adBtn = this.add.container(250, 42);
        const adBg = this.add.graphics();
        adBg.fillStyle(0x0d9488, 0.8);
        adBg.fillRoundedRect(0, 0, 95, 18, 4);
        adBg.lineStyle(1, 0x2dd4bf, 0.5);
        adBg.strokeRoundedRect(0, 0, 95, 18, 4);
        const adText = this.add.text(47.5, 9, "📺 +100 EZ İZLE", { font: '700 10px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        adBtn.add([adBg, adText]);
        
        const adHit = this.add.rectangle(47.5, 9, 95, 18, 0x0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, adHit);
        adBtn.add(adHit);
        adHit.on('pointerdown', () => this.watchAdReward());

        profileContainer.add([cardBg, avatarGlow, avatarCircle, avatarFace, nameText, editIcon, levelText, ezText, adBtn]);
        
        const cardHit = this.add.rectangle(0, 0, 240, 76, 0x0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, cardHit);
        profileContainer.add(cardHit);
        cardHit.on('pointerdown', () => this.openNameEditModal());
    }

    createMenuButtons() {
        const startX = 50;
        const career = window.gameState && window.gameState.career;
        const hasCareer = career && (career.started || career.careerStarted) && !!career.currentClubId;
        this.hasCareer = hasCareer;
        const careerLabel = hasCareer ? (window.Localization.translate('CONTINUE_CAREER') || "KARİYERE DEVAM ET") : (window.Localization.translate('NEW_CAREER') || "YENİ KARİYER");
        const careerSub = hasCareer ? "Kaldığın yerden devam et" : "Yolculuğunu başlat";
        
        const buttons = [
            { label: careerLabel, sub: window.Localization.translate('CAREER_SUB') || "Yolculuğunu başlat", icon: "🏆", color: 0x9333ea, action: () => this.startCareer() },
            { label: window.Localization.translate('CUSTOMIZE') || "ÖZELLEŞTİR", sub: window.Localization.translate('CUSTOMIZE_SUB') || "Tarzını belirle", icon: "👕", color: 0x06b6d4, action: () => { this.cameras.main.fadeOut(300); this.time.delayedCall(300, () => this.scene.start('CustomizationScene')); } },
            { label: window.Localization.translate('BALLS') || "TOPLAR", sub: window.Localization.translate('BALLS_SUB') || "Koleksiyonunu geliştir", icon: "⚽", color: 0xec4899, action: () => { this.cameras.main.fadeOut(300); this.time.delayedCall(300, () => this.scene.start('BallShopScene')); } },
            { label: window.Localization.translate('SETTINGS') || "AYARLAR", sub: window.Localization.translate('SETTINGS_SUB') || "Oyunu yapılandır", icon: "⚙️", color: 0x8b5cf6, action: () => this.openGameSettings() }
        ];

        buttons.forEach((btn, i) => {
            const y = 132 + (i * 84);
            const btnContainer = this.add.container(startX, y);

            const btnBg = this.add.graphics();
            btnBg.fillStyle(0x07111f, 0.75); // Deep navy glass
            btnBg.fillRoundedRect(0, 0, 360, 74, 12);
            btnBg.lineStyle(1.5, 0x1e293b, 0.8);
            btnBg.strokeRoundedRect(0, 0, 360, 74, 12);

            const glowOutline = this.add.graphics();
            glowOutline.lineStyle(2, btn.color, 1);
            glowOutline.strokeRoundedRect(0, 0, 360, 74, 12);
            glowOutline.setAlpha(0);

            const accentStripe = this.add.graphics();
            accentStripe.fillStyle(btn.color, 1);
            accentStripe.fillRoundedRect(0, 10, 4, 54, 2);

            const iconBg = this.add.circle(42, 37, 22, 0x0f172a, 0.8).setStrokeStyle(1, btn.color, 0.4);
            const iconText = this.add.text(42, 37, btn.icon, { fontSize: '21px' }).setOrigin(0.5);

            const title = this.add.text(82, 16, btn.label, { font: '800 20px sans-serif', fill: '#ffffff' });
            const subText = this.add.text(82, 42, btn.sub, { font: '600 12px sans-serif', fill: '#64748b' });
            const arrow = this.add.text(330, 37, "▶", { font: '16px sans-serif', fill: '#475569' }).setOrigin(0.5);

            btnContainer.add([btnBg, glowOutline, accentStripe, iconBg, iconText, title, subText, arrow]);

            const hitArea = this.add.rectangle(0, 0, 360, 74, 0x000000, 0).setOrigin(0).setInteractive({ useHandCursor: true });
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);
            btnContainer.add(hitArea);

            hitArea.on('pointerover', () => {
                this.tweens.add({ targets: glowOutline, alpha: 1, duration: 150 });
                this.tweens.add({ targets: btnContainer, scaleX: 1.02, scaleY: 1.02, duration: 150 });
                arrow.setFill('#ffffff');
                arrow.setX(336);
                title.setShadow(0, 0, '#ffffff', 5, true, true);
            });

            hitArea.on('pointerout', () => {
                this.tweens.add({ targets: glowOutline, alpha: 0, duration: 150 });
                this.tweens.add({ targets: btnContainer, scaleX: 1, scaleY: 1, duration: 150 });
                arrow.setFill('#475569');
                arrow.setX(330);
                title.setShadow(0, 0, '#000000', 0, false, false);
            });

            hitArea.on('pointerdown', () => {
                this.tweens.add({
                    targets: btnContainer,
                    scale: 0.96,
                    duration: 50,
                    yoyo: true,
                    onComplete: btn.action
                });
            });
        });
    }

    createSpinButton() {
        const x = this.width - 90;
        const y = this.height / 2;

        const container = this.add.container(x, y);

        // Auras for ambient glow
        const aura = this.add.graphics();
        aura.fillGradientStyle(0x00ffff, 0xff00ff, 0x000000, 0x000000, 0.3);
        aura.fillCircle(0, 0, 55);

        // Dark background base
        const bg = this.add.circle(0, 0, 44, 0x050a14);
        
        // Outer Dual-Color Ring
        const ringGfx = this.add.graphics();
        // Magenta Half (Top-Right)
        ringGfx.lineStyle(3, 0xff00ff, 1);
        ringGfx.beginPath();
        ringGfx.arc(0, 0, 44, -Math.PI/2 - 0.3, Math.PI/2 - 0.1, false);
        ringGfx.strokePath();
        
        // Cyan Half (Bottom-Left)
        ringGfx.lineStyle(3, 0x00ffff, 1);
        ringGfx.beginPath();
        ringGfx.arc(0, 0, 44, Math.PI/2 + 0.3, Math.PI*1.5 - 0.1, false);
        ringGfx.strokePath();

        // Inner glowing ring
        const innerRing = this.add.circle(0, 0, 41).setStrokeStyle(1, 0x475569, 0.4);

        // --- Center Emblem ---
        const emblemY = -6;
        
        // Inner gear/chip circle
        const gear = this.add.graphics();
        gear.lineStyle(2, 0x00ffff, 0.15);
        gear.strokeCircle(0, emblemY, 14);
        gear.lineStyle(1.5, 0xff00ff, 0.8);
        gear.strokeCircle(0, emblemY, 10);
        
        // Center Star
        const star = this.add.star(0, emblemY - 0.5, 5, 3.5, 7, 0xff00ff).setAlpha(0.9);

        // Circular Arrows around Emblem
        const arrowGfx = this.add.graphics();
        
        // Top Magenta Arrow (starts left, goes right over top, points down)
        arrowGfx.lineStyle(2.5, 0xff00ff, 1);
        arrowGfx.beginPath();
        arrowGfx.arc(0, emblemY, 21, Math.PI, 0.1, false);
        arrowGfx.strokePath();
        arrowGfx.fillStyle(0xff00ff, 1);
        arrowGfx.fillTriangle(21, emblemY - 2, 16, emblemY - 10, 26, emblemY - 10);

        // Bottom Cyan Arrow (starts right, goes left over bottom, points up)
        arrowGfx.lineStyle(2.5, 0x00ffff, 1);
        arrowGfx.beginPath();
        arrowGfx.arc(0, emblemY, 21, 0, Math.PI + 0.1, false);
        arrowGfx.strokePath();
        arrowGfx.fillStyle(0x00ffff, 1);
        arrowGfx.fillTriangle(-21, emblemY + 2, -16, emblemY + 10, -26, emblemY + 10);

        // Text "ÇEVİR"
        const label = this.add.text(0, 22, "ÇEVİR", { 
            font: '700 15px sans-serif', 
            fill: '#ffffff', 
            letterSpacing: 1 
        }).setOrigin(0.5);
        label.setShadow(0, 0, '#ffffff', 8, true, true);

        container.add([aura, bg, ringGfx, innerRing, gear, star, arrowGfx, label]);

        const lastSpin = window.gameState.career.lastDailySpin || 0;
        const now = Date.now();
        const canSpin = (now - lastSpin) > 24 * 60 * 60 * 1000;
        
        if (canSpin) {
            const bx = 32, by = -30;
            const badgeGlow = this.add.circle(bx, by, 14, 0xff0055, 0.4);
            const badge = this.add.circle(bx, by, 9, 0xff0055).setStrokeStyle(1.5, 0xffffff, 0.8);
            const badgeText = this.add.text(bx, by, "!", { font: '700 13px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
            container.add([badgeGlow, badge, badgeText]);
            
            // Pulse animation for badge
            this.tweens.add({
                targets: badgeGlow,
                scale: 1.3,
                alpha: 0.1,
                duration: 800,
                yoyo: true,
                repeat: -1
            });
        }

        const hitArea = this.add.circle(0, 0, 44, 0x000000, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);
        container.add(hitArea);

        // Ambient rotation for the arrows
        this.tweens.add({
            targets: arrowGfx,
            angle: 360,
            duration: 8000,
            repeat: -1,
            ease: 'Linear'
        });

        // Aura pulse
        this.tweens.add({
            targets: aura,
            scaleX: 1.1,
            scaleY: 1.1,
            alpha: 0.15,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Hover Effects
        hitArea.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.08, duration: 150 });
            label.setShadow(0, 0, '#00ffff', 12, true, true);
        });

        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1, duration: 150 });
            label.setShadow(0, 0, '#ffffff', 8, true, true);
        });

        hitArea.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scale: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: () => this._openSpinModal()
            });
        });
    }

    createBottomBar() {
        const barHeight = 92;
        const y = this.height - barHeight;

        // ── Main black/transparent background bar ──
        const barBg = this.add.graphics();
        barBg.fillStyle(0x020208, 0.95);
        barBg.fillRect(0, y, this.width, barHeight);
        
        // Top edge glow border
        barBg.lineStyle(1.5, 0x1e1b4b, 0.6);
        barBg.lineBetween(0, y, this.width, y);

        const items = [
            { icon: '🏆', text: 'BAŞARIMLAR', color: 0xfbbf24, action: () => this._openAchievementsModal() },
            { icon: '📋', text: 'SKOR TABLOSU', color: 0x38bdf8, action: () => this._openLeaderboardModal() },
            { icon: '🛒', text: 'MAĞAZA', color: 0xa855f7, action: () => this._openShopModal(), badge: true },
            { icon: '🎁', text: 'GÜNLÜK ÖDÜL', color: 0xf43f5e, action: () => this._openSpinModal(), badge: this._canClaimDaily() }
        ];

        const panelW = 190;
        const gap = 8;
        const slant = 15;
        const totalW = (items.length * panelW) + ((items.length - 1) * gap);
        const startX = (this.width - totalW) / 2;

        // ── Draw Left Wing ──
        const leftWing = this.add.graphics();
        const lwEndX = startX - 12;
        leftWing.fillStyle(0x0a0a14, 0.85);
        leftWing.beginPath();
        leftWing.moveTo(0, y + 8);
        leftWing.lineTo(lwEndX + slant, y + 8);
        leftWing.lineTo(lwEndX, y + barHeight - 8);
        leftWing.lineTo(0, y + barHeight - 8);
        leftWing.closePath();
        leftWing.fillPath();
        leftWing.lineStyle(1.5, 0x1e1b4b, 0.7);
        leftWing.strokePath();

        // Left Wing Details (watermark logo and text)
        const lwEmblem = this.add.text(24, y + barHeight / 2, '⚡', { font: '700 17px sans-serif', fill: '#00ffff' }).setOrigin(0.5).setAlpha(0.25);
        const lwText = this.add.text(48, y + barHeight / 2, 'FURIO FC', { font: '700 11px sans-serif', fill: '#cbd5e1', letterSpacing: 1.5 }).setOrigin(0, 0.5).setAlpha(0.3);

        // ── Draw Right Wing ──
        const rightWing = this.add.graphics();
        const rwStartX = startX + totalW + 12;
        rightWing.fillStyle(0x0a0a14, 0.85);
        rightWing.beginPath();
        rightWing.moveTo(rwStartX + slant, y + 8);
        rightWing.lineTo(this.width, y + 8);
        rightWing.lineTo(this.width, y + barHeight - 8);
        rightWing.lineTo(rwStartX, y + barHeight - 8);
        rightWing.closePath();
        rightWing.fillPath();
        rightWing.lineStyle(1.5, 0x1e1b4b, 0.7);
        rightWing.strokePath();

        // Right Wing Details
        const rwText1 = this.add.text(this.width - 120, y + barHeight / 2 - 8, 'FURIO FC', { font: '900 8.5px sans-serif', fill: '#cbd5e1', letterSpacing: 1 }).setOrigin(0.5).setAlpha(0.2);
        const rwText2 = this.add.text(this.width - 50, y + barHeight / 2 + 8, 'FURIO FC', { font: '900 8.5px sans-serif', fill: '#cbd5e1', letterSpacing: 1 }).setOrigin(0.5).setAlpha(0.15);

        // ── Draw main buttons/panels ──
        items.forEach((item, i) => {
            const px = startX + i * (panelW + gap);
            const py = y + 8;
            const ph = barHeight - 16;

            const container = this.add.container(px, py);

            const cardBg = this.add.graphics();
            const borderG = this.add.graphics();
            const activeLine = this.add.graphics();

            // Set colors
            const themeColor = item.color;
            const darkFillColor = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.IntegerToColor(themeColor),
                Phaser.Display.Color.IntegerToColor(0x000000),
                100, 92
            ).color;

            // Draw Parallelogram fill
            const drawPanelBody = (g, fillAlpha) => {
                g.clear();
                g.fillStyle(darkFillColor, fillAlpha);
                g.beginPath();
                g.moveTo(slant, 0);
                g.lineTo(panelW + slant, 0);
                g.lineTo(panelW, ph);
                g.lineTo(0, ph);
                g.closePath();
                g.fillPath();
            };

            // Draw Parallelogram border
            const drawPanelBorder = (g, strokeAlpha, width = 1.5) => {
                g.clear();
                g.lineStyle(width, themeColor, strokeAlpha);
                g.beginPath();
                g.moveTo(slant, 0);
                g.lineTo(panelW + slant, 0);
                g.lineTo(panelW, ph);
                g.lineTo(0, ph);
                g.closePath();
                g.strokePath();
            };

            drawPanelBody(cardBg, 0.7);
            drawPanelBorder(borderG, 0.35);

            // Icon Group (circle in the upper center of parallelogram)
            const iconCx = panelW / 2 + slant / 2;
            const iconCy = ph / 2 - 10;

            const iconRing = this.add.graphics();
            iconRing.lineStyle(2, themeColor, 0.6);
            iconRing.strokeCircle(iconCx, iconCy, 20);

            const iconCircleBg = this.add.graphics();
            iconCircleBg.fillStyle(0x020208, 0.95);
            iconCircleBg.fillCircle(iconCx, iconCy, 19);

            const iconText = this.add.text(iconCx, iconCy, item.icon, { fontSize: '21px' }).setOrigin(0.5);

            // Label
            const label = this.add.text(panelW / 2 + slant / 2, ph - 16, item.text, {
                font: '900 9.5px sans-serif', fill: '#94a3b8', letterSpacing: 0.5
            }).setOrigin(0.5);

            container.add([cardBg, borderG, iconRing, iconCircleBg, iconText, label, activeLine]);

            // Notification Badge (number "1" in a matching theme circle)
            if (item.badge) {
                const badgeX = iconCx + 14;
                const badgeY = iconCy - 14;
                const badgeBgCircle = this.add.circle(badgeX, badgeY, 7.5, themeColor);
                const badgeText = this.add.text(badgeX, badgeY, '1', { font: '900 8.5px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
                
                // Add soft pulse tween to the badge
                this.tweens.add({
                    targets: badgeBgCircle,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 1000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                container.add([badgeBgCircle, badgeText]);
            }

            // Hit area (slanted)
            const hitArea = this.add.rectangle(panelW / 2 + slant / 2, ph / 2, panelW, ph, 0, 0).setInteractive({ useHandCursor: true });
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);
            container.add(hitArea);

            // Interactive Actions
            hitArea.on('pointerover', () => {
                label.setFill('#ffffff');
                label.setShadow(0, 0, this._colorToHex(themeColor), 8, true, true);
                
                drawPanelBody(cardBg, 0.85);
                drawPanelBorder(borderG, 1.0, 2);

                // Draw active bottom bar indicator
                activeLine.clear();
                activeLine.lineStyle(3, themeColor, 1.0);
                activeLine.beginPath();
                activeLine.moveTo(4, ph - 2);
                activeLine.lineTo(panelW - 4, ph - 2);
                activeLine.strokePath();

                // Rotate/scale icon circle slightly
                this.tweens.add({
                    targets: iconText,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    duration: 100
                });
            });

            hitArea.on('pointerout', () => {
                label.setFill('#94a3b8');
                label.setShadow(0, 0, '#000', 0, false, false);
                
                drawPanelBody(cardBg, 0.7);
                drawPanelBorder(borderG, 0.35, 1.5);
                
                activeLine.clear();

                this.tweens.add({
                    targets: iconText,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 100
                });
            });

            hitArea.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                this.tweens.add({
                    targets: container,
                    scaleX: 0.95,
                    scaleY: 0.95,
                    duration: 60,
                    yoyo: true,
                    onComplete: () => item.action()
                });
            });
        });
    }

    _colorToHex(num) {
        return '#' + num.toString(16).padStart(6, '0');
    }

    _canClaimDaily() {
        const lastSpin = window.gameState.career.lastDailySpin || 0;
        return (Date.now() - lastSpin) > 24 * 60 * 60 * 1000;
    }

    // =====================================================================
    // ACHIEVEMENTS MODAL (placeholder)
    // =====================================================================
    _openAchievementsModal() {
        const modal = this.add.container(0, 0).setDepth(200);
        this.activeModal = modal;
        const overlay = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x02040a, 0.92).setInteractive();
        modal.add(overlay);

        const bW = 860, bH = 660;
        const cx = this.width / 2, cy = this.height / 2;

        const bg = this.add.graphics();
        bg.fillStyle(0x060b18, 1);
        bg.fillRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 16);
        bg.lineStyle(2, 0xfbbf24, 0.4); // Subtle gold border
        bg.strokeRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 16);
        
        // Corner tech accents
        bg.lineStyle(2, 0xfbbf24, 0.8);
        bg.beginPath(); bg.moveTo(cx - bW/2 + 250, cy - bH/2); bg.lineTo(cx - bW/2 + 265, cy - bH/2 + 15); bg.strokePath();
        bg.beginPath(); bg.moveTo(cx + bW/2 - 250, cy - bH/2); bg.lineTo(cx + bW/2 - 265, cy - bH/2 + 15); bg.strokePath();
        modal.add(bg);

        const title = this.add.text(cx, cy - bH / 2 + 40, '🏆 BAŞARIMLAR', {
            font: '700 33px sans-serif', fill: '#fcd34d'
        }).setOrigin(0.5);
        title.setShadow(0, 0, '#fbbf24', 20, true, true);
        modal.add(title);
        
        // Line under title
        const titleLine = this.add.graphics();
        titleLine.fillGradientStyle(0x060b18, 0xfbbf24, 0xfbbf24, 0x060b18, 0, 1, 1, 0);
        titleLine.fillRect(cx - 150, cy - bH / 2 + 70, 300, 3);
        modal.add(titleLine);

        // Retrieve Stats safely
        const cw = window.GameStateManager && window.GameStateManager.getCareerData() ? window.GameStateManager.getCareerData() : {};
        const pStats = (window.gameState.player && window.gameState.player.stats) || {};
        const seasonStats = cw.seasonStats || { goals: 0, assists: 0 };
        const ezCoins = window.gameState.career.ez || 0;
        const careerStarted = window.gameState.career.started;

        const achievements = [
            { name: 'İlk Gol', desc: 'İlk golünü at', icon: '⚽', done: (pStats.goals || window.gameState.career.goals || 0) >= 1 },
            { name: 'Kariyer Başlangıcı', desc: 'İlk sözleşmeni imzala', icon: '📝', done: !!careerStarted },
            { name: 'Koleksiyoncu', desc: '5 top edin', icon: '⚽', done: (window.gameState.customization && window.gameState.customization.unlockedBalls ? window.gameState.customization.unlockedBalls.length : 0) >= 5 },
            { name: 'Hat-Trick', desc: 'Bir maçta 3 gol at', icon: '🎩', done: (pStats.hatTricks || 0) >= 1 },
            { name: 'Şampiyon', desc: 'Lig şampiyonu ol', icon: '🥇', done: (pStats.championships || 0) >= 1 },
            { name: 'Zenginlik', desc: '5000 EZ biriktir', icon: '💰', done: ezCoins >= 5000 },
            { name: 'Asist Ustası', desc: 'Bir sezonda 10 asist yap', icon: '👟', done: (seasonStats.assists || pStats.assists || 0) >= 10 },
            { name: 'Seri Galibiyet', desc: '5 maç üst üste kazan', icon: '🏆', done: (pStats.winStreak || pStats.maxWinStreak || 0) >= 5 },
            { name: 'Gol Kralı', desc: 'Bir sezonda 20 gol at', icon: '👑', done: (seasonStats.goals || pStats.goals || 0) >= 20 },
            { name: 'Duvar', desc: 'Bir maçta gol yeme', icon: '🛡️', done: (pStats.cleanSheets || 0) >= 1 },
            { name: 'Demir Adam', desc: '20 maç oyna', icon: '👕', done: (pStats.matches || 0) >= 20 },
            { name: 'Kupa Avcısı', desc: 'Bir kupa kazan', icon: '🏆', done: (pStats.cupsWon || 0) >= 1 }
        ];

        let completedCount = 0;

        achievements.forEach((a, i) => {
            if (a.done) completedCount++;
            const row = Math.floor(i / 3);
            const col = i % 3;
            
            const cardW = 260;
            const cardH = 90;
            const startX = cx - bW / 2 + 30;
            const startY = cy - bH / 2 + 105;
            
            const ax = startX + col * (cardW + 10) + cardW/2;
            const ay = startY + row * (cardH + 15) + cardH/2;

            const cardCont = this.add.container(ax, ay);
            
            const rowBg = this.add.graphics();
            if (a.done) {
                // Completed styling (Green)
                rowBg.fillStyle(0x022c22, 0.8);
                rowBg.fillRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 12);
                rowBg.lineStyle(2, 0x22c55e, 0.8);
                rowBg.strokeRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 12);
            } else {
                // Incomplete styling (Dark Blue)
                rowBg.fillStyle(0x0b1120, 0.9);
                rowBg.fillRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 12);
                rowBg.lineStyle(1.5, 0x1e293b, 0.8);
                rowBg.strokeRoundedRect(-cardW/2, -cardH/2, cardW, cardH, 12);
            }
            cardCont.add(rowBg);

            // Icon background circle
            const iconBg = this.add.circle(-cardW/2 + 40, 0, 25, a.done ? 0x064e3b : 0x0f172a, 1);
            if (a.done) iconBg.setStrokeStyle(1.5, 0x22c55e);
            else iconBg.setStrokeStyle(1.5, 0x334155);
            cardCont.add(iconBg);

            cardCont.add(this.add.text(-cardW/2 + 40, 0, a.icon, { fontSize: '27px' }).setOrigin(0.5));
            
            cardCont.add(this.add.text(-cardW/2 + 80, -12, a.name, { font: '700 17px sans-serif', fill: a.done ? '#4ade80' : '#f8fafc' }).setOrigin(0, 0.5));
            cardCont.add(this.add.text(-cardW/2 + 80, 12, a.desc, { font: '600 12px sans-serif', fill: '#94a3b8' }).setOrigin(0, 0.5));
            
            if (a.done) {
                // Green checkmark
                cardCont.add(this.add.circle(cardW/2 - 25, 0, 12, 0x22c55e, 1));
                cardCont.add(this.add.text(cardW/2 - 25, 1, '✓', { font: '700 15px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
            } else {
                // Empty circle
                cardCont.add(this.add.circle(cardW/2 - 25, 0, 12, 0x0b1120, 1).setStrokeStyle(1.5, 0x334155));
            }
            
            modal.add(cardCont);
        });

        // Bottom Progress Bar Area
        const bottomY = cy + bH / 2 - 40;
        
        // Left Star
        const starLeft = this.add.circle(cx - 150, bottomY, 15, 0x1e293b, 1).setStrokeStyle(1.5, 0xfbbf24);
        modal.add(starLeft);
        modal.add(this.add.text(cx - 150, bottomY, '⭐', { fontSize: '15px' }).setOrigin(0.5));
        
        // Center text
        const progBg = this.add.graphics();
        progBg.fillStyle(0x0f172a, 0.8);
        progBg.fillRoundedRect(cx - 100, bottomY - 15, 200, 30, 15);
        modal.add(progBg);
        
        const progText = this.add.text(cx, bottomY, `Tamamlanan: `, { font: '700 14px sans-serif', fill: '#94a3b8' }).setOrigin(1, 0.5);
        const progNums = this.add.text(cx, bottomY, `${completedCount} / 12`, { font: '700 15px sans-serif', fill: '#4ade80' }).setOrigin(0, 0.5);
        modal.add([progText, progNums]);
        
        // Right Star
        const starRight = this.add.circle(cx + 150, bottomY, 15, 0x1e293b, 1).setStrokeStyle(1.5, 0xfbbf24);
        modal.add(starRight);
        modal.add(this.add.text(cx + 150, bottomY, '⭐', { fontSize: '15px' }).setOrigin(0.5));


        // Close (X) button at Top Right
        const closeBtn = this.add.container(cx + bW / 2 - 35, cy - bH / 2 + 35);
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0x0e051c, 0.85);
        closeBg.lineStyle(1.8, 0x334155, 1);
        closeBg.fillRoundedRect(-14, -14, 28, 28, 6);
        closeBg.strokeRoundedRect(-14, -14, 28, 28, 6);
        
        const closeX = this.add.text(0, 0, "✕", { font: '700 15px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        closeBtn.add([closeBg, closeX]);
        modal.add(closeBtn);

        closeBtn.setSize(28, 28);
        closeBtn.setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, closeBtn);
        closeBtn.on('pointerover', () => { closeBg.clear().lineStyle(2, '#ef4444').fillRoundedRect(-14, -14, 28, 28, 6).strokeRoundedRect(-14, -14, 28, 28, 6); closeX.setFill('#ef4444'); });
        closeBtn.on('pointerout', () => { closeBg.clear().lineStyle(1.8, 0x334155, 1).fillStyle(0x0e051c, 0.85).fillRoundedRect(-14, -14, 28, 28, 6).strokeRoundedRect(-14, -14, 28, 28, 6); closeX.setFill('#94a3b8'); });
        closeBtn.on('pointerdown', () => { modal.destroy(); this.activeModal = null; });
    }

    // =====================================================================
    // LEADERBOARD MODAL (placeholder)
    // =====================================================================
    _openLeaderboardModal() {
        const modal = this.add.container(0, 0).setDepth(200);
        this.activeModal = modal;
        const overlay = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x02040a, 0.88).setInteractive();
        modal.add(overlay);

        const bW = 500, bH = 500;
        const cx = this.width / 2, cy = this.height / 2;

        const bg = this.add.graphics();
        bg.fillStyle(0x07111f, 0.97);
        bg.fillRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 16);
        bg.lineStyle(2, 0x38bdf8, 0.6);
        bg.strokeRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 16);
        modal.add(bg);

        const title = this.add.text(cx, cy - bH / 2 + 35, '📊 SKOR TABLOSU', {
            font: '700 25px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);
        title.setShadow(0, 0, '#38bdf8', 12, true, true);
        modal.add(title);

        const warning = this.add.text(cx, cy, window.Localization.translate('COMING_SOON') || 'ÇOK YAKINDA', {
            font: '700 30px sans-serif', fill: '#64748b', align: 'center'
        }).setOrigin(0.5);
        modal.add(warning);

        // Close
        const closeBtn = this.add.text(cx + bW / 2 - 25, cy - bH / 2 + 25, '✕', { font: '700 20px sans-serif', fill: '#64748b' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, closeBtn);
        modal.add(closeBtn);
        closeBtn.on('pointerover', () => closeBtn.setFill('#ef4444'));
        closeBtn.on('pointerout', () => closeBtn.setFill('#64748b'));
        closeBtn.on('pointerdown', () => { modal.destroy(); this.activeModal = null; });
    }

    // =====================================================================
    // SHOP / MAĞAZA MODAL - Premium store with video reward
    // =====================================================================
    _openShopModal() {
        if (this._shopOpen) return;
        this._shopOpen = true;

        const modal = this.add.container(0, 0).setDepth(200);
        this.activeModal = modal;
        const overlay = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x02040a, 0.9).setInteractive();
        modal.add(overlay);

        const bW = 680, bH = 540;
        const cx = this.width / 2, cy = this.height / 2;

        // ── Main box ──
        const bg = this.add.graphics();
        bg.fillStyle(0x07111f, 0.97);
        bg.fillRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 16);
        bg.lineStyle(2.5, 0xa855f7, 0.7);
        bg.strokeRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 16);
        // Inner glow line
        bg.lineStyle(1, 0xa855f7, 0.15);
        bg.strokeRoundedRect(cx - bW / 2 + 3, cy - bH / 2 + 3, bW - 6, bH - 6, 14);
        modal.add(bg);

        // ── Title ──
        const title = this.add.text(cx, cy - bH / 2 + 35, '🛒 MAĞAZA', {
            font: '700 29px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);
        title.setShadow(0, 0, '#a855f7', 20, true, true);
        modal.add(title);

        // ── Current EZ balance ──
        const ezBal = this.add.text(cx, cy - bH / 2 + 62, `💰 Bakiye: ${window.gameState.career.ez || 0} EZ`, {
            font: '700 13px sans-serif', fill: '#fbbf24'
        }).setOrigin(0.5);
        modal.add(ezBal);

        // ── Shop items grid ──
        const gridStartY = cy - bH / 2 + 95;
        const cardW = 195, cardH = 155, cardGap = 12;
        const cols = 3;
        const gridTotalW = cols * cardW + (cols - 1) * cardGap;
        const gridStartX = cx - gridTotalW / 2;

        const shopItems = [
            { name: 'EZ PAKET (S)', desc: '+500 EZ', icon: '💰', price: 'Ücretsiz Video', type: 'video', reward: 500, color: 0x22c55e },
            { name: 'EZ PAKET (M)', desc: '+1500 EZ', icon: '💎', price: 'Video İzle x2', type: 'video2', reward: 1500, color: 0x3b82f6 },
            { name: 'EZ PAKET (L)', desc: '+5000 EZ', icon: '🏆', price: 'Video İzle x3', type: 'video3', reward: 5000, color: 0xf59e0b },
            { name: 'HIZLI GELİŞİM', desc: 'XP x2 (5 Maç)', icon: '⚡', price: '2000 EZ', type: 'buy', cost: 2000, color: 0x06b6d4 },
            { name: 'ALTIN TOP', desc: 'Özel top skini', icon: '⚽', price: '3000 EZ', type: 'buy', cost: 3000, color: 0xeab308 },
            { name: 'MEGA PAKET', desc: 'Sürpriz ödüller', icon: '🎁', price: '4000 EZ', type: 'buy', cost: 4000, color: 0xdb2777 }
        ];

        shopItems.forEach((item, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const cardX = gridStartX + col * (cardW + cardGap);
            const cardY = gridStartY + row * (cardH + cardGap);

            // Card bg
            const cardBg = this.add.graphics();
            cardBg.fillStyle(0x0a0f24, 0.9);
            cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
            cardBg.lineStyle(1.5, item.color, 0.5);
            cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
            modal.add(cardBg);

            // Top accent stripe
            const stripe = this.add.graphics();
            stripe.fillStyle(item.color, 0.8);
            stripe.fillRoundedRect(cardX, cardY, cardW, 4, { tl: 10, tr: 10, bl: 0, br: 0 });
            modal.add(stripe);

            // Icon
            modal.add(this.add.text(cardX + cardW / 2, cardY + 35, item.icon, { fontSize: '29px' }).setOrigin(0.5));
            // Name
            modal.add(this.add.text(cardX + cardW / 2, cardY + 62, item.name, { font: '800 12px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
            // Desc
            modal.add(this.add.text(cardX + cardW / 2, cardY + 80, item.desc, { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));

            // Buy/Watch button
            const btnW = cardW - 24, btnH = 30;
            const btnX = cardX + 12, btnY = cardY + cardH - 42;

            const btnBg = this.add.graphics();
            if (item.type.startsWith('video')) {
                btnBg.fillGradientStyle(0x22c55e, 0x16a34a, 0x15803d, 0x166534, 1);
            } else {
                btnBg.fillGradientStyle(item.color, item.color, item.color, item.color, 0.85);
            }
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 6);
            modal.add(btnBg);

            const btnLabel = item.type.startsWith('video') ? `📺 ${item.price}` : `${item.price}`;
            const btnTxt = this.add.text(btnX + btnW / 2, btnY + btnH / 2, btnLabel, {
                font: '800 10px sans-serif', fill: '#ffffff'
            }).setOrigin(0.5);
            modal.add(btnTxt);

            const btnHit = this.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
            modal.add(btnHit);

            btnHit.on('pointerover', () => {
                btnTxt.setShadow(0, 0, '#ffffff', 6, true, true);
                cardBg.clear();
                cardBg.fillStyle(0x0a0f24, 0.9);
                cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
                cardBg.lineStyle(2, item.color, 1);
                cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
            });
            btnHit.on('pointerout', () => {
                btnTxt.setShadow(0, 0, '#000', 0, false, false);
                cardBg.clear();
                cardBg.fillStyle(0x0a0f24, 0.9);
                cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 10);
                cardBg.lineStyle(1.5, item.color, 0.5);
                cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 10);
            });

            btnHit.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                if (item.type.startsWith('video')) {
                    this._watchVideoForReward(item.reward, item.type, modal, ezBal);
                } else if (item.type === 'buy') {
                    this._purchaseShopItem(item, modal, ezBal);
                }
            });
        });

        // ── Close button ──
        const closeBtn = this.add.text(cx + bW / 2 - 25, cy - bH / 2 + 25, '✕', {
            font: '700 22px sans-serif', fill: '#64748b'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        modal.add(closeBtn);
        closeBtn.on('pointerover', () => closeBtn.setFill('#ef4444'));
        closeBtn.on('pointerout', () => closeBtn.setFill('#64748b'));
        closeBtn.on('pointerdown', () => { modal.destroy(); this._shopOpen = false; this.activeModal = null; });
    }

    async _watchVideoForReward(reward, type, shopModal, ezBalText) {
        // Check daily video limit
        const today = new Date().toDateString();
        if (window.gameState.career.lastAdDate !== today) {
            window.gameState.career.adsWatchedToday = 0;
            window.gameState.career.lastAdDate = today;
        }

        const maxAds = 5;
        if (window.gameState.career.adsWatchedToday >= maxAds) {
            this._showShopToast(shopModal, window.Localization.translate('AD_LIMIT_REACHED') || 'Bugünkü video limitine ulaştın!', '#ef4444');
            return;
        }

        // Determine number of videos to watch
        let videoCount = 1;
        if (type === 'video2') videoCount = 2;
        if (type === 'video3') videoCount = 3;
        
        let watched = 0;
        
        if (window.AdManager) {
            for (let i = 0; i < videoCount; i++) {
                const success = await window.AdManager.showRewardedAd();
                if (success) {
                    watched++;
                } else {
                    this._showShopToast(shopModal, window.Localization.translate('AD_NOT_READY') || 'Reklam yüklenemedi. Sonra tekrar dene.', '#f43f5e');
                    break;
                }
            }
            
            if (watched === videoCount) {
                // All videos watched — give reward
                window.gameState.career.ez = (window.gameState.career.ez || 0) + reward;
                window.gameState.career.adsWatchedToday = (window.gameState.career.adsWatchedToday || 0) + videoCount;
                if (window.SaveManager) window.SaveManager.save();

                this._showShopToast(shopModal, `+${reward} EZ KAZANILDI!`, '#4ade80');
                ezBalText.setText(`💰 Bakiye: ${window.gameState.career.ez} EZ`);
            }
        }
    }

    _purchaseShopItem(item, shopModal, ezBalText) {
        const currentEz = window.gameState.career.ez || 0;
        if (currentEz < item.cost) {
            this._showShopToast(shopModal, `⚠️ Yetersiz bakiye! ${item.cost} EZ gerekiyor.`, '#ef4444');
            return;
        }

        window.gameState.career.ez = Math.max(0, window.gameState.career.ez - item.cost);
        if (window.SaveManager) window.SaveManager.save();

        ezBalText.setText(`💰 Bakiye: ${window.gameState.career.ez} EZ`);
        this._showShopToast(shopModal, `✅ ${item.name} satın alındı!`, '#4ade80');
    }

    _showShopToast(container, message, color) {
        const toast = this.add.text(this.width / 2, this.height / 2 + 200, message, {
            font: '800 14px sans-serif', fill: color, stroke: '#07111f', strokeThickness: 4
        }).setOrigin(0.5).setDepth(260);
        container.add(toast);

        this.tweens.add({
            targets: toast, y: toast.y - 40, alpha: 0, duration: 2000, delay: 800,
            onComplete: () => toast.destroy()
        });
    }

    async watchAdReward() {
        const overlay = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x000000, 0.8).setDepth(300).setInteractive();
        const adText = this.add.text(this.width / 2, this.height / 2, window.Localization.translate("LOADING") || "YÜKLENİYOR...", {
            font: '700 25px sans-serif', fill: '#ffffff', align: 'center'
        }).setOrigin(0.5).setDepth(310);

        if (window.AdManager) {
            const success = await window.AdManager.showRewardedAd();
            
            overlay.destroy();
            adText.destroy();
            
            if (success) {
                window.gameState.career.ez += 100;
                if (window.SaveManager) window.SaveManager.save();

                const popup = this.add.text(this.width / 2, this.height / 2, "+100 EZ KAZANILDI!", {
                    font: '700 37px sans-serif', fill: '#4ade80', stroke: '#07111f', strokeThickness: 8
                }).setOrigin(0.5).setDepth(320);

                this.tweens.add({
                    targets: popup,
                    y: this.height / 2 - 50,
                    alpha: 0,
                    duration: 1500,
                    onComplete: () => {
                        popup.destroy();
                        this.scene.restart();
                    }
                });
            } else {
                const failPopup = this.add.text(this.width / 2, this.height / 2, "REKLAM HAZIR DEĞİL", {
                    font: '700 30px sans-serif', fill: '#f43f5e', stroke: '#07111f', strokeThickness: 8
                }).setOrigin(0.5).setDepth(320);
                this.time.delayedCall(1500, () => failPopup.destroy());
            }
        } else {
            overlay.destroy();
            adText.destroy();
            console.error("AdManager not initialized.");
        }
    }

    _openSpinModal() {
        const modal = this.add.container(0, 0).setDepth(200);
        this.activeModal = modal;

        // Dark dim backdrop
        const overlay = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x02040a, 0.85).setInteractive();
        modal.add(overlay);

        // Modal Box
        const boxWidth = 540;
        const boxHeight = 520;
        const boxX = this.width / 2;
        const boxY = this.height / 2;

        const boxBg = this.add.graphics();
        boxBg.fillStyle(0x07111f, 0.95);
        boxBg.fillRoundedRect(boxX - boxWidth / 2, boxY - boxHeight / 2, boxWidth, boxHeight, 16);
        boxBg.lineStyle(2.5, 0xdb2777, 1); // Glowing pink border
        boxBg.strokeRoundedRect(boxX - boxWidth / 2, boxY - boxHeight / 2, boxWidth, boxHeight, 16);

        const modalTitle = this.add.text(boxX, boxY - boxHeight / 2 + 35, "🎰 ŞANS OYUNU", { font: '700 29px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        modalTitle.setShadow(0, 0, '#db2777', 15, true, true);

        const modalSubtitle = this.add.text(boxX, boxY - boxHeight / 2 + 65, "3 AYNI SEMBOLÜ YAKALA, ÖDÜLÜ KAZAN!", { font: '700 11px sans-serif', fill: '#cbd5e1', letterSpacing: 1 }).setOrigin(0.5);

        modal.add([boxBg, modalTitle, modalSubtitle]);

        // Close (X) button at Top Right
        const closeBtn = this.add.container(boxX + boxWidth / 2 - 25, boxY - boxHeight / 2 + 25);
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0x0e051c, 0.85);
        closeBg.lineStyle(1.8, 0x334155, 1);
        closeBg.fillRoundedRect(-14, -14, 28, 28, 6);
        closeBg.strokeRoundedRect(-14, -14, 28, 28, 6);
        
        const closeX = this.add.text(0, 0, "✕", { font: '700 15px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        closeBtn.add([closeBg, closeX]);
        modal.add(closeBtn);

        closeBtn.setSize(28, 28);
        closeBtn.setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, closeBtn);
        closeBtn.on('pointerover', () => { closeBg.clear().lineStyle(2, '#ef4444').fillRoundedRect(-14, -14, 28, 28, 6).strokeRoundedRect(-14, -14, 28, 28, 6); closeX.setFill('#ef4444'); });
        closeBtn.on('pointerout', () => { closeBg.clear().lineStyle(1.8, 0x334155, 1).fillStyle(0x0e051c, 0.85).fillRoundedRect(-14, -14, 28, 28, 6).strokeRoundedRect(-14, -14, 28, 28, 6); closeX.setFill('#94a3b8'); });
        closeBtn.on('pointerdown', () => { modal.destroy(); this.activeModal = null; });

        // Reels setup
        const reelWidth = 90;
        const reelHeight = 190;
        const reelY = boxY - 30;
        const reelXCoords = [boxX - 110, boxX, boxX + 110];
        
        const reels = [];
        const symbolTypes = ['coin', 'item', 'empty'];

        // Helper to create visual symbol container
        const createSymbolUI = (type, x, y) => {
            const container = this.add.container(x, y);
            const graphics = this.add.graphics();
            
            if (type === 'coin') {
                graphics.fillStyle(0xfacc15, 1);
                graphics.fillCircle(0, 0, 22);
                graphics.lineStyle(2, 0xd97706, 1);
                graphics.strokeCircle(0, 0, 22);
                const txt = this.add.text(0, 0, "EZ", { font: '700 15px sans-serif', fill: '#78350f' }).setOrigin(0.5);
                container.add([graphics, txt]);
            } else if (type === 'item') {
                graphics.fillStyle(0x7c3aed, 1);
                graphics.fillRoundedRect(-22, -22, 44, 44, 8);
                graphics.lineStyle(2, 0xc084fc, 1);
                graphics.strokeRoundedRect(-22, -22, 44, 44, 8);
                const txt = this.add.text(0, 0, "👕", { fontSize: '23px' }).setOrigin(0.5);
                container.add([graphics, txt]);
            } else {
                graphics.fillStyle(0x334155, 1);
                graphics.fillCircle(0, 0, 22);
                graphics.lineStyle(2, 0x475569, 1);
                graphics.strokeCircle(0, 0, 22);
                const txt = this.add.text(0, 0, "✕", { font: '700 19px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
                container.add([graphics, txt]);
            }
            return container;
        };

        // Draw 3 Reels
        for (let r = 0; r < 3; r++) {
            const rx = reelXCoords[r];
            
            // Reel background box
            const reelBg = this.add.graphics();
            reelBg.fillStyle(0x0a0f24, 0.9);
            reelBg.fillRoundedRect(rx - reelWidth / 2, reelY - reelHeight / 2, reelWidth, reelHeight, 12);
            reelBg.lineStyle(2, 0x9333ea, 0.6); // Purple reel outline
            reelBg.strokeRoundedRect(rx - reelWidth / 2, reelY - reelHeight / 2, reelWidth, reelHeight, 12);
            modal.add(reelBg);

            // Container for this reel's symbols
            const reelContainer = this.add.container(rx, reelY);
            modal.add(reelContainer);

            // Initial symbol layout
            const symUIs = [
                createSymbolUI('coin', 0, -58),
                createSymbolUI('item', 0, 0),
                createSymbolUI('empty', 0, 58)
            ];
            symUIs.forEach(ui => reelContainer.add(ui));

            reels.push({
                container: reelContainer,
                symUIs: symUIs,
                currentTypes: ['coin', 'item', 'empty']
            });
        }

        // Draw payline markers (red/pink arrows on sides pointing to middle row)
        const paylineLeft = this.add.text(boxX - 180, reelY, "▶", { font: '700 25px sans-serif', fill: '#db2777' }).setOrigin(0.5);
        const paylineRight = this.add.text(boxX + 180, reelY, "◀", { font: '700 25px sans-serif', fill: '#db2777' }).setOrigin(0.5);
        modal.add([paylineLeft, paylineRight]);

        // Draw PAYTABLE (ÖDÜL TABLOSU)
        const paytableY = boxY + 110;
        const paytableBg = this.add.graphics();
        paytableBg.fillStyle(0x0f172a, 0.6);
        paytableBg.fillRoundedRect(boxX - 220, paytableY - 30, 440, 75, 10);
        paytableBg.lineStyle(1, 0x1e293b, 1);
        paytableBg.strokeRoundedRect(boxX - 220, paytableY - 30, 440, 75, 10);
        modal.add(paytableBg);

        const paytableTitle = this.add.text(boxX, paytableY - 42, "ÖDÜL TABLOSU", { font: '700 12px sans-serif', fill: '#94a3b8', letterSpacing: 1 }).setOrigin(0.5);
        modal.add(paytableTitle);

        // Paytable items
        const coinSymbolRow = this.add.container(boxX - 145, paytableY + 8);
        const coinIcon1 = createSymbolUI('coin', -30, 0).setScale(0.65);
        const coinIcon2 = createSymbolUI('coin', -12, 0).setScale(0.65);
        const coinIcon3 = createSymbolUI('coin', 6, 0).setScale(0.65);
        const coinDesc = this.add.text(-12, 22, `3 COIN =\nEZ ÖDÜLÜ`, { font: '800 9px sans-serif', fill: '#f59e0b', align: 'center' }).setOrigin(0.5);
        coinSymbolRow.add([coinIcon1, coinIcon2, coinIcon3, coinDesc]);

        const itemSymbolRow = this.add.container(boxX, paytableY + 8);
        const itemIcon1 = createSymbolUI('item', -24, 0).setScale(0.65);
        const itemIcon2 = createSymbolUI('item', -6, 0).setScale(0.65);
        const itemIcon3 = createSymbolUI('item', 12, 0).setScale(0.65);
        const itemDesc = this.add.text(-6, 22, `3 ITEM =\nKOZMETİK ÖDÜL`, { font: '800 9px sans-serif', fill: '#a78bfa', align: 'center' }).setOrigin(0.5);
        itemSymbolRow.add([itemIcon1, itemIcon2, itemIcon3, itemDesc]);

        const emptySymbolRow = this.add.container(boxX + 145, paytableY + 8);
        const emptyIcon1 = createSymbolUI('empty', -18, 0).setScale(0.65);
        const emptyIcon2 = createSymbolUI('empty', 0, 0).setScale(0.65);
        const emptyIcon3 = createSymbolUI('empty', 18, 0).setScale(0.65);
        const emptyDesc = this.add.text(0, 22, `3 BOŞ =\nÖDÜL YOK`, { font: '800 9px sans-serif', fill: '#94a3b8', align: 'center' }).setOrigin(0.5);
        emptySymbolRow.add([emptyIcon1, emptyIcon2, emptyIcon3, emptyDesc]);

        modal.add([coinSymbolRow, itemSymbolRow, emptySymbolRow]);

        // Spin Button Setup
        const btnY = boxY + boxHeight / 2 - 55;
        const spinBtn = this.add.graphics();
        spinBtn.fillGradientStyle(0xf472b6, 0x9333ea, 0xdb2777, 0x7e22ce, 1);
        spinBtn.fillRoundedRect(boxX - 90, btnY - 20, 180, 40, 10);
        spinBtn.lineStyle(1.5, 0xffffff, 0.6);
        spinBtn.strokeRoundedRect(boxX - 90, btnY - 20, 180, 40, 10);

        const spinBtnText = this.add.text(boxX, btnY, "ÇEVİR", { font: '700 16px sans-serif', fill: '#ffffff', letterSpacing: 1 }).setOrigin(0.5);
        modal.add([spinBtn, spinBtnText]);

        // Free limit & countdown
        const usageText = this.add.text(boxX, btnY + 30, "KULLANIM: 1/1", { font: '700 11px sans-serif', fill: '#4ade80' }).setOrigin(0.5);
        const countdownText = this.add.text(boxX, btnY + 45, "", { font: '700 10px sans-serif', fill: '#06b6d4' }).setOrigin(0.5);
        modal.add([usageText, countdownText]);

        const lastSpin = window.gameState.career.lastDailySpin || 0;
        const now = Date.now();
        const nextSpinTime = lastSpin + 24 * 60 * 60 * 1000;
        let canSpin = now > nextSpinTime;

        const btnHit = this.add.rectangle(boxX, btnY, 180, 40, 0x0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
        modal.add(btnHit);

        // Update usability states & countdown
        const updateCountdown = () => {
            const currentTime = Date.now();
            const timeDiff = nextSpinTime - currentTime;
            if (timeDiff > 0) {
                canSpin = false;
                spinBtn.clear();
                spinBtn.fillStyle(0x475569, 1);
                spinBtn.fillRoundedRect(boxX - 90, btnY - 20, 180, 40, 10);
                spinBtnText.setText("YARIN GEL!");
                spinBtnText.setFill('#94a3b8');
                btnHit.disableInteractive();
                
                usageText.setText("KULLANIM: 0/1").setFill('#ef4444');
                
                const hrs = Math.floor(timeDiff / (3600 * 1000)).toString().padStart(2, '0');
                const mins = Math.floor((timeDiff % (3600 * 1000)) / (60 * 1000)).toString().padStart(2, '0');
                const secs = Math.floor((timeDiff % (60 * 1000)) / 1000).toString().padStart(2, '0');
                countdownText.setText(`Yeni çevirme: ${hrs}:${mins}:${secs}`);
            } else {
                canSpin = true;
                spinBtn.clear();
                spinBtn.fillGradientStyle(0xf472b6, 0x9333ea, 0xdb2777, 0x7e22ce, 1);
                spinBtn.fillRoundedRect(boxX - 90, btnY - 20, 180, 40, 10);
                spinBtn.lineStyle(1.5, 0xffffff, 0.6);
                spinBtn.strokeRoundedRect(boxX - 90, btnY - 20, 180, 40, 10);
                spinBtnText.setText("ÇEVİR").setFill('#ffffff');
                btnHit.setInteractive({ useHandCursor: true });
                if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
                
                usageText.setText("KULLANIM: 1/1").setFill('#4ade80');
                countdownText.setText("ÇEVİRME HAZIR!");
            }
        };

        // Run countdown timer
        updateCountdown();
        const countdownTimer = this.time.addEvent({
            delay: 1000,
            callback: updateCountdown,
            loop: true
        });

        // Close Button
        const closeBtnX = boxX + boxWidth / 2 - 25;
        const closeY = boxY - boxHeight / 2 + 25;
        const closeIcon = this.add.text(closeBtnX, closeY, "✕", { font: '700 20px sans-serif', fill: '#64748b' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, closeIcon);
        modal.add(closeIcon);

        closeIcon.on('pointerover', () => closeIcon.setFill('#ef4444'));
        closeIcon.on('pointerout', () => closeIcon.setFill('#64748b'));
        closeIcon.on('pointerdown', () => {
            countdownTimer.destroy();
            modal.destroy();
            this.activeModal = null;
        });

        // Spin Logic
        let spinning = false;
        let spinSound = null;
        btnHit.on('pointerdown', () => {
            if (spinning || !canSpin) return;
            spinning = true;
            if (window.audioManager) spinSound = window.audioManager.playSFX('slot_spin_realistic_reels');
            btnHit.disableInteractive();
            closeIcon.disableInteractive();
            countdownTimer.destroy(); // Stop countdown during spin

            // Generate outcomes (payline: Middle symbols)
            // 55% Mixed, 25% Coins, 15% Items, 5% Empty
            const rand = Phaser.Math.Between(1, 100);
            let finalMiddleSymbols = [];
            
            if (rand <= 55) {
                // Mixed
                do {
                    finalMiddleSymbols = [
                        Phaser.Utils.Array.GetRandom(symbolTypes),
                        Phaser.Utils.Array.GetRandom(symbolTypes),
                        Phaser.Utils.Array.GetRandom(symbolTypes)
                    ];
                } while (finalMiddleSymbols[0] === finalMiddleSymbols[1] && finalMiddleSymbols[1] === finalMiddleSymbols[2]);
            } else if (rand <= 80) {
                // Coins
                finalMiddleSymbols = ['coin', 'coin', 'coin'];
            } else if (rand <= 95) {
                // Items
                finalMiddleSymbols = ['item', 'item', 'item'];
            } else {
                // Empty
                finalMiddleSymbols = ['empty', 'empty', 'empty'];
            }

            // Spin animation per reel
            reels.forEach((reel, rIdx) => {
                let shiftCount = 0;
                const maxShifts = 15 + (rIdx * 8); // stagger stop times

                const shiftTimer = this.time.addEvent({
                    delay: 80,
                    loop: true,
                    callback: () => {
                        shiftCount++;
                        
                        // Shift symbols array visually
                        reel.currentTypes.unshift(Phaser.Utils.Array.GetRandom(symbolTypes));
                        reel.currentTypes.pop();

                        // If reached max shifts, set the middle row to the final generated outcome
                        if (shiftCount >= maxShifts) {
                            shiftTimer.destroy();
                            reel.currentTypes[1] = finalMiddleSymbols[rIdx]; // Payline (middle)
                            // Randomize surrounding rows nicely
                            reel.currentTypes[0] = Phaser.Utils.Array.GetRandom(symbolTypes);
                            while (reel.currentTypes[0] === reel.currentTypes[1]) {
                                reel.currentTypes[0] = Phaser.Utils.Array.GetRandom(symbolTypes);
                            }
                            reel.currentTypes[2] = Phaser.Utils.Array.GetRandom(symbolTypes);
                            while (reel.currentTypes[2] === reel.currentTypes[1]) {
                                reel.currentTypes[2] = Phaser.Utils.Array.GetRandom(symbolTypes);
                            }
                        }

                        // Re-draw container children
                        reel.container.removeAll(true);
                        reel.container.add([
                            createSymbolUI(reel.currentTypes[0], 0, -58),
                            createSymbolUI(reel.currentTypes[1], 0, 0),
                            createSymbolUI(reel.currentTypes[2], 0, 58)
                        ]);

                        // Play stop effect once done
                        if (shiftCount >= maxShifts) {
                            if (window.audioManager) window.audioManager.playSFX('slot_reel_stop_clack');
                            this.tweens.add({
                                targets: reel.container,
                                scaleY: 1.1,
                                scaleX: 1.1,
                                duration: 100,
                                yoyo: true,
                                ease: 'Quad.easeOut'
                            });

                            // If this was the last reel, evaluate overall result
                            if (rIdx === 2) {
                                this.time.delayedCall(500, () => {
                                    evaluateOutcome(finalMiddleSymbols);
                                });
                            }
                        }
                    }
                });
            });

            // Evaluation
            const evaluateOutcome = (outcome) => {
                if (spinSound && spinSound.isPlaying) spinSound.stop();
                window.gameState.career.lastDailySpin = Date.now();
                
                let winType = 'none';
                let rewardDesc = '';

                if (outcome[0] === 'coin' && outcome[1] === 'coin' && outcome[2] === 'coin') {
                    winType = 'coin';
                    const ezWon = 150;
                    window.gameState.career.ez += ezWon;
                    rewardDesc = `+${ezWon} EZ`;
                    if (window.audioManager) window.audioManager.playSFX('slot_win_reward_jingle');
                } else if (outcome[0] === 'item' && outcome[1] === 'item' && outcome[2] === 'item') {
                    winType = 'item';
                    if (!window.gameState.career.unlockedAccessories.includes("headphones")) {
                        window.gameState.career.unlockedAccessories.push("headphones");
                        rewardDesc = "KULAKLIK KAZANILDI!";
                    } else {
                        // fallback if already unlocked
                        window.gameState.career.ez += 200;
                        rewardDesc = "KULAKLIK (ZATEN VAR) -> +200 EZ!";
                    }
                    if (window.audioManager) window.audioManager.playSFX('slot_win_reward_jingle');
                } else if (outcome[0] === 'empty' && outcome[1] === 'empty' && outcome[2] === 'empty') {
                    winType = 'empty';
                    rewardDesc = "BOŞ GELDİ! ÖDÜL YOK";
                    if (window.audioManager) window.audioManager.playSFX('slot_no_reward_soft');
                } else {
                    winType = 'mixed';
                    rewardDesc = "ŞANSLI DEĞİLSİN! ÖDÜL YOK";
                    if (window.audioManager) window.audioManager.playSFX('slot_no_reward_soft');
                }

                if (window.SaveManager) window.SaveManager.save();

                // Display outcome screen overlay text
                const isWin = winType === 'coin' || winType === 'item';
                const outcomeText = this.add.text(boxX, boxY, isWin ? "TEBRİKLER!" : "KAYBETTİN!", {
                    font: '700 37px sans-serif', 
                    fill: isWin ? '#4ade80' : '#ef4444', 
                    align: 'center', 
                    stroke: '#07111f', 
                    strokeThickness: 8
                }).setOrigin(0.5).setScale(0).setDepth(210);

                const rewardText = this.add.text(boxX, boxY + 40, rewardDesc, {
                    font: '700 20px sans-serif',
                    fill: '#ffffff',
                    align: 'center',
                    stroke: '#07111f',
                    strokeThickness: 6
                }).setOrigin(0.5).setAlpha(0).setDepth(210);

                modal.add([outcomeText, rewardText]);

                this.tweens.add({
                    targets: outcomeText,
                    scale: 1,
                    duration: 500,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: rewardText,
                            alpha: 1,
                            y: boxY + 50,
                            duration: 300
                        });

                        this.time.delayedCall(3000, () => {
                            modal.destroy();
                            this.activeModal = null;
                            this.scene.restart();
                        });
                    }
                });
            };
        });
    }
    updatePreviewVisual() {
        // Dummy implementation to avoid modal crash
    }

    
    openSettings(page = 0) {
        const modal = this.add.container(0, 0);
        modal.setDepth(100);

        // Dark cinematic overlay, but stadium is still very visible
        const bg = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x050510, 0.75).setInteractive();
        modal.add(bg);

        // Header
        const title = this.add.text(this.width / 2, this.height / 2 - 280, "KARAKTER ÖZELLEŞTİRME", { 
            font: '700 43px sans-serif', fill: '#ffffff', letterSpacing: 2
        }).setOrigin(0.5);
        const gradient = title.context.createLinearGradient(0, 0, 0, title.height);
        gradient.addColorStop(0, '#f9a8d4');
        gradient.addColorStop(1, '#db2777');
        title.setFill(gradient);
        title.setShadow(0, 0, "#9333ea", 20, true, true);
        
        const subtitle = this.add.text(this.width / 2, this.height / 2 - 230, "Aksesuarlar", { 
            font: '400 22px sans-serif', fill: '#cbd5e1' 
        }).setOrigin(0.5);

        modal.add([title, subtitle]);

        const accessories = [
            // Headwear
            { id: 'bandana', name: 'Bandana', price: 500, icon: '🎗️' },
            { id: 'headband', name: 'Kafa Bandı', price: 600, icon: '🎾' },
            { id: 'hat', name: 'Şapka', price: 1000, icon: '🧢' },
            { id: 'cap', name: 'Kasket', price: 1200, icon: '👲' },
            { id: 'helmet', name: 'Kask', price: 2000, icon: '🪖' },
            // Face
            { id: 'scarf', name: 'Atkı', price: 750, icon: '🧣' },
            { id: 'glasses', name: 'Gözlük', price: 600, icon: '👓' },
            { id: 'sunglasses', name: 'Güneş Gözlüğü', price: 1200, icon: '🕶️' },
            { id: 'mask', name: 'Maske', price: 1500, icon: '😷' },
            // Premium
            { id: 'headphones', name: 'Kulaklık', price: 2000, icon: '🎧' },
            { id: 'halo', name: 'Hale', price: 5000, icon: '😇' },
            { id: 'crown', name: 'Taç', price: 8000, icon: '👑' },
            // Jerseys
            { id: 'jersey_solid', name: 'Düz Forma', price: 1000, icon: '👕' },
            { id: 'jersey_halves', name: 'İki Renkli', price: 2000, icon: '👕' },
            { id: 'jersey_stripes', name: 'Çubuklu', price: 3000, icon: '👕' },
            { id: 'jersey_hoops', name: 'Enine Çizgi', price: 3000, icon: '👕' },
            { id: 'jersey_quarters', name: 'Parçalı', price: 4000, icon: '👕' },
            { id: 'jersey_sash', name: 'Çapraz Bant', price: 4000, icon: '👕' },
            { id: 'jersey_chestband', name: 'Göğüs Bant', price: 4000, icon: '👕' },
            { id: 'jersey_chevron', name: 'V Şerit', price: 5000, icon: '👕' },
            { id: 'jersey_checkered', name: 'Damalı', price: 6000, icon: '👕' }
        ];

        const itemsPerPage = 8;
        const totalPages = Math.ceil(accessories.length / itemsPerPage);
        const visibleItems = accessories.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

        visibleItems.forEach((acc, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            
            // X positioning for 2 columns, centered
            const xBase = this.width / 2 - 190 + (col * 380);
            const y = this.height / 2 - 140 + (row * 75);

            // Container for item to easily apply hover effects
            const itemContainer = this.add.container(xBase, y);

            // Dark Panel with Purple Glow Border
            const rowBg = this.add.rectangle(0, 0, 360, 60, 0x1e1b4b, 0.6).setStrokeStyle(2, 0xa855f7);
            // postFX glow on shop row removed for performance
            
            const icon = this.add.text(-140, 0, acc.icon, { fontSize: '29px' }).setOrigin(0.5);
            const name = this.add.text(-110, 0, acc.name, { font: '20px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);

            const isUnlocked = window.gameState.career.unlockedAccessories.includes(acc.id);
            const isEquipped = window.gameState.career.selectedAccessory === acc.id;

            let btnTextStr = isUnlocked ? (isEquipped ? "TAKILI" : "KUŞAN") : `${acc.price} EZ`;
            
            // Button colors based on state/price
            let baseColor = 0x06b6d4; // Cyan
            if(isUnlocked) baseColor = isEquipped ? 0x22c55e : 0x3b82f6; // Green / Blue
            else if(acc.price >= 2000) baseColor = 0xfacc15; // Yellow for premium

            // Hollow Glowing Button
            const btnOutline = this.add.rectangle(110, 0, 100, 40, 0x000000, 0).setStrokeStyle(3, baseColor);
            // postFX glow on buy button removed for performance

            const btnText = this.add.text(110, 0, btnTextStr, { font: '800 16px sans-serif', fill: isUnlocked ? '#ffffff' : `#${baseColor.toString(16)}` }).setOrigin(0.5);
            if(isUnlocked) btnText.setShadow(0, 0, '#ffffff', 5, true, true);

            const hitArea = this.add.rectangle(0, 0, 360, 60, 0xff0000, 0).setInteractive({ useHandCursor: true });
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);
            
            hitArea.on('pointerdown', () => {
                if (isUnlocked) {
                    window.gameState.career.selectedAccessory = isEquipped ? null : acc.id;
                } else {
                    if (window.gameState.career.ez >= acc.price) {
                        window.gameState.career.ez = Math.max(0, window.gameState.career.ez - acc.price);
                        window.gameState.career.unlockedAccessories.push(acc.id);
                        window.gameState.career.selectedAccessory = acc.id;
                    } else {
                        // Flash red if not enough money
                        this.tweens.add({
                            targets: btnOutline,
                            strokeColor: 0xef4444,
                            duration: 100,
                            yoyo: true,
                            repeat: 3,
                            onComplete: () => btnOutline.setStrokeStyle(3, baseColor)
                        });
                        return;
                    }
                }
                if (window.SaveManager) window.SaveManager.save();
                modal.destroy();
                this.openSettings(page);
                this.updatePreviewVisual();
            });

            hitArea.on('pointerover', () => {
                this.tweens.add({ targets: itemContainer, scaleX: 1.03, scaleY: 1.03, duration: 150 });
                rowBg.setStrokeStyle(3, 0xd8b4fe);
            });
            hitArea.on('pointerout', () => {
                this.tweens.add({ targets: itemContainer, scaleX: 1, scaleY: 1, duration: 150 });
                rowBg.setStrokeStyle(2, 0xa855f7);
            });

            itemContainer.add([rowBg, icon, name, btnOutline, btnText, hitArea]);
            modal.add(itemContainer);
        });

        // Pagination
        if (page > 0) {
            const prev = this.add.text(this.width/2 - 150, this.height/2 + 200, "◀ Önceki Sayfa", {font: '700 22px sans-serif', fill: '#d8b4fe'}).setOrigin(0.5).setInteractive({useHandCursor: true});
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, prev);
            prev.setShadow(0, 0, '#c084fc', 10, true, true);
            prev.on('pointerdown', () => { modal.destroy(); this.openSettings(page - 1); });
            modal.add(prev);
        }
        if (page < totalPages - 1) {
            const next = this.add.text(this.width/2 + 150, this.height/2 + 200, "Sonraki Sayfa ▶", {font: '700 22px sans-serif', fill: '#d8b4fe'}).setOrigin(0.5).setInteractive({useHandCursor: true});
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, next);
            next.setShadow(0, 0, '#c084fc', 10, true, true);
            next.on('pointerdown', () => { modal.destroy(); this.openSettings(page + 1); });
            modal.add(next);
        }

        // CLOSE BUTTON
        const closeBtn = this.add.text(this.width / 2, this.height / 2 + 280, "KAPAT", {
            font: '700 27px sans-serif', fill: '#ef4444'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.setShadow(0, 0, '#ef4444', 15, true, true);

        closeBtn.on('pointerdown', () => {
            modal.destroy();
        });
        
        closeBtn.on('pointerover', () => closeBtn.setScale(1.1));
        closeBtn.on('pointerout', () => closeBtn.setScale(1));

        modal.add(closeBtn);
        
        // Modal entrance animation
        modal.setAlpha(0);
        modal.y += 50;
        this.tweens.add({
            targets: modal,
            alpha: 1,
            y: 0,
            duration: 400,
            ease: 'Cubic.out'
        });
    }

    openGameSettings() {
        // First ensure any previous settings overlay is removed
        const existing = document.getElementById('cyber-settings-overlay');
        if (existing) existing.remove();

        // Inject CSS Stylesheet
        const styleId = 'cyberpunk-settings-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .settings-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(2, 4, 12, 0.65);
                    backdrop-filter: blur(8px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    font-family: 'sans-serif', sans-serif;
                    user-select: none;
                    -webkit-user-select: none;
                }

                .settings-container {
                    width: 95%;
                    max-width: 860px;
                    height: 90%;
                    max-height: 500px;
                    background: rgba(10, 11, 22, 0.95);
                    border-radius: 20px;
                    position: relative;
                    margin-top: 15px;
                    padding: 16px 20px;
                    padding-left: calc(20px + var(--sal, env(safe-area-inset-left, 25px)));
                    padding-right: calc(20px + var(--sar, env(safe-area-inset-right, 25px)));
                    box-shadow: 0 0 40px rgba(219, 39, 119, 0.3), inset 0 0 25px rgba(6, 182, 212, 0.1);
                    box-sizing: border-box;
                    display: flex;
                    flex-direction: column;
                }

                /* Rounded gradient border */
                .settings-container::before {
                    content: '';
                    position: absolute;
                    top: -2px; bottom: -2px; left: -2px; right: -2px;
                    z-index: -1;
                    border-radius: inherit;
                    background: linear-gradient(135deg, #db2777, #7c3aed, #06b6d4);
                }

                /* Header Trapezoid Title */
                .settings-header {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    margin-bottom: 12px;
                    height: 45px;
                }
                .settings-title-container {
                    background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%);
                    border: 2px solid #db2777;
                    border-top: none;
                    padding: 6px 40px;
                    border-radius: 0 0 16px 16px;
                    box-shadow: 0 4px 15px rgba(219, 39, 119, 0.4);
                    position: absolute;
                    top: -26px;
                }
                .settings-title {
                    font-size: 24px;
                    font-weight: 900;
                    color: #fff;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    text-shadow: 0 0 10px #06b6d4, 0 0 20px #db2777;
                }

                /* Close Button (Top Right) */
                .settings-close-btn {
                    position: absolute;
                    top: -10px;
                    right: 0px;
                    width: 32px;
                    height: 32px;
                    background: #0f172a;
                    border: 2px solid #db2777;
                    border-radius: 8px;
                    color: #db2777;
                    font-weight: 900;
                    font-size: 16px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(219, 39, 119, 0.4);
                    transition: all 0.2s ease;
                }
                .settings-close-btn:hover {
                    background: #db2777;
                    color: #fff;
                    box-shadow: 0 0 15px #db2777;
                }

                /* Cards Grid */
                .settings-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 12px;
                    flex-grow: 1;
                    overflow-y: auto;
                    padding-right: 4px;
                }

                /* Scrollbar styling for grid */
                .settings-grid::-webkit-scrollbar {
                    width: 6px;
                }
                .settings-grid::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 3px;
                }
                .settings-grid::-webkit-scrollbar-thumb {
                    background: #7c3aed;
                    border-radius: 3px;
                }

                /* Individual Card (Glass panel) */
                .settings-card {
                    background: rgba(20, 25, 45, 0.6);
                    border: 1px solid rgba(124, 58, 237, 0.3);
                    border-radius: 12px;
                    padding: 10px 14px;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    box-shadow: inset 0 0 10px rgba(6, 182, 212, 0.05);
                }

                .card-title-row {
                    display: flex;
                    align-items: center;
                    margin-bottom: 10px;
                    border-bottom: 1px solid rgba(6, 182, 212, 0.2);
                    padding-bottom: 4px;
                }
                .card-icon {
                    font-size: 16px;
                    margin-right: 8px;
                    text-shadow: 0 0 8px #06b6d4;
                }
                .card-title-text {
                    font-size: 14px;
                    font-weight: 700;
                    color: #06b6d4;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    text-shadow: 0 0 5px rgba(6, 182, 212, 0.5);
                }

                /* Row elements inside cards */
                .settings-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .settings-row:last-child {
                    margin-bottom: 0;
                }
                .settings-label {
                    font-size: 13px;
                    color: #cbd5e1;
                    font-weight: 500;
                }

                /* Sliders */
                .slider-container {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 60%;
                }
                .cyber-slider {
                    -webkit-appearance: none;
                    width: 100%;
                    height: 6px;
                    background: rgba(15, 23, 42, 0.8);
                    border-radius: 3px;
                    outline: none;
                    border: 1px solid rgba(219, 39, 119, 0.3);
                    position: relative;
                }
                .cyber-slider::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 6px;
                    border-radius: 3px;
                }
                .cyber-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #06b6d4;
                    cursor: pointer;
                    box-shadow: 0 0 10px #06b6d4, 0 0 20px #06b6d4;
                    border: 2px solid #fff;
                    margin-top: -4px;
                    transition: transform 0.1s ease;
                }
                .cyber-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }

                /* Value display bubble */
                .slider-value {
                    font-size: 12px;
                    font-weight: 700;
                    color: #06b6d4;
                    width: 35px;
                    text-align: right;
                    text-shadow: 0 0 5px rgba(6, 182, 212, 0.5);
                }

                /* Option Button Groups */
                .btn-group {
                    display: flex;
                    gap: 6px;
                }
                .cyber-btn-option {
                    background: rgba(15, 23, 42, 0.6);
                    border: 1px solid rgba(124, 58, 237, 0.4);
                    color: #94a3b8;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    text-transform: uppercase;
                }
                .cyber-btn-option:hover {
                    border-color: #06b6d4;
                    color: #fff;
                }
                .cyber-btn-option.active {
                    background: rgba(6, 182, 212, 0.15);
                    border-color: #06b6d4;
                    color: #fff;
                    box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
                    text-shadow: 0 0 5px #fff;
                }

                /* Toggles (Switch) */
                .cyber-switch {
                    position: relative;
                    display: inline-block;
                    width: 44px;
                    height: 22px;
                }
                .cyber-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .cyber-switch-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-color: rgba(15, 23, 42, 0.8);
                    border: 1px solid rgba(124, 58, 237, 0.4);
                    border-radius: 22px;
                    transition: .3s;
                }
                .cyber-switch-slider:before {
                    position: absolute;
                    content: "";
                    height: 14px;
                    width: 14px;
                    left: 3px;
                    bottom: 3px;
                    background-color: #94a3b8;
                    border-radius: 50%;
                    transition: .3s;
                }
                input:checked + .cyber-switch-slider {
                    background-color: rgba(219, 39, 119, 0.2);
                    border-color: #db2777;
                    box-shadow: 0 0 10px rgba(219, 39, 119, 0.3);
                }
                input:checked + .cyber-switch-slider:before {
                    transform: translateX(22px);
                    background-color: #db2777;
                    box-shadow: 0 0 8px #db2777;
                }

                /* ACCOUNT CARD Details */
                .account-info-container {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 12px;
                }
                .avatar-wrapper {
                    position: relative;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 0 12px rgba(219, 39, 119, 0.4);
                    cursor: pointer;
                }
                .avatar-wrapper::after {
                    content: '';
                    position: absolute;
                    top: -2px; bottom: -2px; left: -2px; right: -2px;
                    border-radius: 50%;
                    border: 2px solid #db2777;
                }
                .avatar-img {
                    font-size: 24px;
                    background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .account-details {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                }
                .account-name-row {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .account-name {
                    font-size: 15px;
                    font-weight: 700;
                    color: #fff;
                    cursor: pointer;
                }
                .account-name:hover {
                    color: #06b6d4;
                    text-shadow: 0 0 5px #06b6d4;
                }
                .account-edit-icon {
                    font-size: 11px;
                    color: #db2777;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                }
                .account-edit-icon:hover {
                    transform: scale(1.2);
                }
                .account-meta {
                    font-size: 11px;
                    color: #fbbf24;
                    margin-top: 2px;
                }

                /* Link Account Button */
                .btn-link-account {
                    background: transparent;
                    border: 1.5px solid #db2777;
                    color: #db2777;
                    border-radius: 8px;
                    padding: 6px 12px;
                    font-size: 11px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 0 8px rgba(219, 39, 119, 0.2);
                    transition: all 0.2s ease;
                }
                .btn-link-account:hover {
                    background: #db2777;
                    color: #fff;
                    box-shadow: 0 0 15px #db2777;
                }
                .btn-link-account.linked {
                    border-color: #22c55e;
                    color: #22c55e;
                    box-shadow: 0 0 8px rgba(34, 197, 94, 0.2);
                }
                .btn-link-account.linked:hover {
                    background: #22c55e;
                    color: #fff;
                    box-shadow: 0 0 15px #22c55e;
                }

                /* Cloud sync row */
                .cloud-sync-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px dashed rgba(124, 58, 237, 0.2);
                    padding-top: 8px;
                    margin-top: 6px;
                }
                .cloud-status {
                    display: flex;
                    align-items: center;
                    font-size: 11px;
                    color: #22c55e;
                    gap: 4px;
                }
                .sync-btn {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 11px;
                    color: #06b6d4;
                    cursor: pointer;
                }
                .sync-btn:hover {
                    text-shadow: 0 0 8px #06b6d4;
                }

                /* Links with arrows (Privacy, Terms, Help) */
                .clickable-row {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .clickable-row:hover .settings-label {
                    color: #06b6d4;
                    padding-left: 4px;
                }
                .clickable-row-arrow {
                    color: #7c3aed;
                    font-weight: bold;
                    font-size: 14px;
                    transition: transform 0.2s ease;
                }
                .clickable-row:hover .clickable-row-arrow {
                    color: #06b6d4;
                    transform: translateX(3px);
                }

                /* Bottom elements */
                .settings-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 12px;
                }
                .version-text {
                    font-size: 11px;
                    color: #64748b;
                }

                /* Kapat button */
                .btn-kapat-container {
                    width: 200px;
                    height: 40px;
                    background: linear-gradient(90deg, #7c3aed 0%, #db2777 100%);
                    border-radius: 8px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    box-shadow: 0 0 20px rgba(219, 39, 119, 0.4);
                    transition: all 0.2s ease;
                    margin: 0 auto 6px auto;
                }
                .btn-kapat-container:hover {
                    transform: scale(1.05);
                    box-shadow: 0 0 30px rgba(219, 39, 119, 0.6);
                }
                .btn-kapat-text {
                    font-size: 16px;
                    font-weight: 900;
                    color: #fff;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                }

                /* Username inline edit input */
                .username-edit-input {
                    background: #0f172a;
                    border: 1px solid #06b6d4;
                    color: #fff;
                    font-family: 'sans-serif', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    width: 120px;
                    outline: none;
                    box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
                }

                @media (max-height: 500px) {
                    .settings-container {
                        height: 96%;
                        padding: 8px 12px;
                        border-radius: 12px;
                        margin-top: 5px;
                    }
                    .settings-header {
                        height: 26px;
                        margin-bottom: 4px;
                    }
                    .settings-title-container {
                        top: -14px;
                        padding: 2px 20px;
                    }
                    .settings-title {
                        font-size: 16px;
                    }
                    .settings-close-btn {
                        top: -5px;
                        right: 0px;
                        width: 28px;
                        height: 28px;
                        font-size: 14px;
                    }
                    .settings-grid {
                        grid-template-columns: repeat(3, 1fr); /* 3 columns on landscape mobile */
                        gap: 6px;
                        overflow-y: hidden;
                    }
                    .settings-card {
                        padding: 6px 10px;
                    }
                    .card-title-row {
                        margin-bottom: 4px;
                        padding-bottom: 2px;
                    }
                    .card-title-text {
                        font-size: 11px;
                    }
                    .settings-row {
                        margin-bottom: 4px;
                    }
                    .settings-label {
                        font-size: 10px;
                    }
                    .cyber-btn-option {
                        padding: 2px 6px;
                        font-size: 9px;
                    }
                    .btn-kapat-container {
                        height: 28px;
                        width: 140px;
                        margin-top: 2px;
                        margin-bottom: 0px;
                    }
                    .btn-kapat-text {
                        font-size: 12px;
                    }
                }
                @media (max-width: 680px) and (max-height: 500px) {
                    .settings-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Initialize missing settings variables
        const settings = window.gameState.settings;
        if (settings.graphicsQuality === undefined) settings.graphicsQuality = 'HIGH';
        if (settings.fpsLimit === undefined) settings.fpsLimit = 60;
        if (settings.controlScheme === undefined) settings.controlScheme = 'RIGHT';
        if (settings.joystickSize === undefined) settings.joystickSize = 'MEDIUM';
        if (settings.buttonSize === undefined) settings.buttonSize = 'MEDIUM';
        if (settings.sensitivity === undefined) settings.sensitivity = 75;
        if (settings.masterVolume === undefined) settings.masterVolume = 80;
        if (settings.sfxVolume === undefined) settings.sfxVolume = 40;
        if (settings.musicVolume === undefined) settings.musicVolume = 25;
        if (settings.crowdVolume === undefined) settings.crowdVolume = 22;
        if (settings.notificationsOn === undefined) settings.notificationsOn = true;

        const profile = window.gameState.player;
        const career = window.gameState.career;

        // Create overlay element
        const overlay = document.createElement('div');
        overlay.id = 'cyber-settings-overlay';
        overlay.className = 'settings-overlay';

        // Render function for dynamic updates
        const render = () => {
            const isTr = (settings.language === 'tr');
            
            // Translations
            const t = {
                title: isTr ? 'OYUN AYARLARI' : 'GAME SETTINGS',
                account: isTr ? 'HESAP' : 'ACCOUNT',
                audio: isTr ? 'SES' : 'AUDIO',
                display: isTr ? 'GÖRÜNTÜ' : 'DISPLAY',
                gameplay: isTr ? 'OYUN' : 'GAMEPLAY',
                language: isTr ? 'DİL' : 'LANGUAGE',
                other: isTr ? 'DİĞER' : 'OTHER',
                linkAcc: isTr ? 'HESAP BAĞLA' : 'LINK ACCOUNT',
                linked: isTr ? 'BAĞLANDI' : 'LINKED',
                cloudSave: isTr ? 'Bulut Kaydı' : 'Cloud Save',
                sync: isTr ? 'Senkronize' : 'Sync',
                masterVol: isTr ? 'Ana Ses' : 'Master Vol',
                sfx: isTr ? 'Ses Efektleri' : 'Sound Effects',
                music: isTr ? 'Müzik' : 'Music',
                crowdVol: isTr ? 'Taraftar Sesi' : 'Crowd Vol',
                brightness: isTr ? 'Parlaklık' : 'Brightness',
                graphics: isTr ? 'Grafik Kalitesi' : 'Graphics Quality',
                vibration: isTr ? 'Titreşim' : 'Vibration',
                sensitivity: isTr ? 'Kontrol Hassasiyeti' : 'Sensitivity',
                scheme: isTr ? 'Kontrol Şeması' : 'Control Scheme',
                joystick: isTr ? 'Joystick Boyutu' : 'Joystick Size',
                buttonSize: isTr ? 'Buton Boyutu' : 'Button Size',
                notifications: isTr ? 'Bildirimler' : 'Notifications',
                help: isTr ? 'Yardım' : 'Help',
                privacy: isTr ? 'Gizlilik' : 'Privacy',
                terms: isTr ? 'Kullanım Koşulları' : 'Terms of Use',
                close: isTr ? 'KAPAT' : 'CLOSE',
                low: isTr ? 'DÜŞÜK' : 'LOW',
                medium: isTr ? 'ORTA' : 'MEDIUM',
                high: isTr ? 'YÜKSEK' : 'HIGH',
                left: isTr ? 'SOL EL' : 'LEFT HAND',
                right: isTr ? 'SAĞ EL' : 'RIGHT HAND',
                small: isTr ? 'KÜÇÜK' : 'SMALL',
                large: isTr ? 'BÜYÜK' : 'LARGE',
                level: isTr ? 'Seviye' : 'Level',
                ver: isTr ? 'Sürüm 1.0.0 (100)' : 'Version 1.0.0 (100)',
                resetCareer: isTr ? 'KARİYERİ SİL' : 'DELETE CAREER SAVE'
            };

            const expressionMap = { 'neutral': '😐', 'angry': '😠', 'sad': '😢', 'crying': '😭' };
            const currentEmoji = expressionMap[profile.expression] || '😐';

            const linkText = settings.accountLinked ? t.linked : t.linkAcc;
            const linkClass = settings.accountLinked ? 'btn-link-account linked' : 'btn-link-account';

            overlay.innerHTML = `
                <div class="settings-container">
                    <div class="settings-header">
                        <div class="settings-title-container">
                            <span class="settings-title">${t.title}</span>
                        </div>
                        <div class="settings-close-btn" id="cyber-close-x">✕</div>
                    </div>
                    
                    <div class="settings-grid">
                        <!-- 1. ACCOUNT -->
                        <div class="settings-card">
                            <div class="card-title-row">
                                <span class="card-icon">👤</span>
                                <span class="card-title-text">${t.account}</span>
                            </div>
                            <div class="account-info-container">
                                <div class="avatar-wrapper" id="cyber-avatar-btn">
                                    <div class="avatar-img">${currentEmoji}</div>
                                </div>
                                <div class="account-details">
                                    <div class="account-name-row">
                                        <span class="account-name" id="cyber-username-display">${profile.username || profile.name}</span>
                                        <span class="account-edit-icon" id="cyber-username-edit-btn">✏️</span>
                                    </div>
                                    <span class="account-meta">${t.level} ${profile.level} | <span style="color:#fbbf24; font-weight:bold">${career.ez} EZ</span></span>
                                </div>
                                <button class="${linkClass}" id="cyber-link-account-btn">${linkText}</button>
                            </div>
                            <div class="cloud-sync-row">
                                <div class="cloud-status">
                                    <span style="font-size:12px">🟢</span> ${t.cloudSave}
                                </div>
                                <div class="sync-btn" id="cyber-sync-btn">
                                    <span>☁️</span> ${t.sync}
                                </div>
                            </div>
                            <div class="settings-row" style="margin-top: 10px; justify-content: center;">
                                <button class="btn-link-account" id="cyber-reset-career-btn" style="background: #ef4444; border-color: #dc2626;">${t.resetCareer}</button>
                            </div>
                        </div>

                        <!-- 2. AUDIO -->
                        <div class="settings-card">
                            <div class="card-title-row">
                                <span class="card-icon">🔊</span>
                                <span class="card-title-text">${t.audio}</span>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.masterVol}</span>
                                <div class="slider-container">
                                    <input type="range" min="0" max="100" step="5" value="${settings.masterVolume}" class="cyber-slider" id="slider-master-volume">
                                    <span class="slider-value" id="val-master-volume">${settings.masterVolume}%</span>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.sfx}</span>
                                <div class="slider-container">
                                    <input type="range" min="0" max="100" step="5" value="${settings.sfxVolume}" class="cyber-slider" id="slider-sfx-volume">
                                    <span class="slider-value" id="val-sfx-volume">${settings.sfxVolume}%</span>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.music}</span>
                                <div class="slider-container">
                                    <input type="range" min="0" max="100" step="5" value="${settings.musicVolume}" class="cyber-slider" id="slider-music-volume">
                                    <span class="slider-value" id="val-music-volume">${settings.musicVolume}%</span>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.crowdVol}</span>
                                <div class="slider-container">
                                    <input type="range" min="0" max="100" step="5" value="${settings.crowdVolume}" class="cyber-slider" id="slider-crowd-volume">
                                    <span class="slider-value" id="val-crowd-volume">${settings.crowdVolume}%</span>
                                </div>
                            </div>
                        </div>

                        <!-- 3. DISPLAY -->
                        <div class="settings-card">
                            <div class="card-title-row">
                                <span class="card-icon">📺</span>
                                <span class="card-title-text">${t.display}</span>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.brightness}</span>
                                <div class="slider-container">
                                    <input type="range" min="50" max="150" step="5" value="${settings.brightness}" class="cyber-slider" id="slider-brightness">
                                    <span class="slider-value" id="val-brightness">${settings.brightness}%</span>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.graphics}</span>
                                <div class="btn-group">
                                    <button class="cyber-btn-option ${settings.graphicsQuality === 'LOW' ? 'active' : ''}" data-quality="LOW">${t.low}</button>
                                    <button class="cyber-btn-option ${settings.graphicsQuality === 'MEDIUM' ? 'active' : ''}" data-quality="MEDIUM">${t.medium}</button>
                                    <button class="cyber-btn-option ${settings.graphicsQuality === 'HIGH' ? 'active' : ''}" data-quality="HIGH">${t.high}</button>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">FPS</span>
                                <div class="btn-group">
                                    <button class="cyber-btn-option ${settings.fpsLimit === 30 ? 'active' : ''}" data-fps="30">30 FPS</button>
                                    <button class="cyber-btn-option ${settings.fpsLimit === 60 ? 'active' : ''}" data-fps="60">60 FPS</button>
                                </div>
                            </div>
                        </div>

                        <!-- 4. GAMEPLAY -->
                        <div class="settings-card">
                            <div class="card-title-row">
                                <span class="card-icon">🎮</span>
                                <span class="card-title-text">${t.gameplay}</span>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.vibration}</span>
                                <label class="cyber-switch">
                                    <input type="checkbox" id="toggle-vibration" ${settings.vibrationOn ? 'checked' : ''}>
                                    <span class="cyber-switch-slider"></span>
                                </label>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.sensitivity}</span>
                                <div class="slider-container">
                                    <input type="range" min="20" max="150" step="5" value="${settings.sensitivity}" class="cyber-slider" id="slider-sensitivity">
                                    <span class="slider-value" id="val-sensitivity">${settings.sensitivity}%</span>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.scheme}</span>
                                <div class="btn-group">
                                    <button class="cyber-btn-option ${settings.controlScheme === 'LEFT' ? 'active' : ''}" data-scheme="LEFT">${t.left}</button>
                                    <button class="cyber-btn-option ${settings.controlScheme === 'RIGHT' ? 'active' : ''}" data-scheme="RIGHT">${t.right}</button>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.joystick}</span>
                                <div class="btn-group">
                                    <button class="cyber-btn-option ${settings.joystickSize === 'SMALL' ? 'active' : ''}" data-joystick="SMALL">${t.small}</button>
                                    <button class="cyber-btn-option ${settings.joystickSize === 'MEDIUM' ? 'active' : ''}" data-joystick="MEDIUM">${t.medium}</button>
                                    <button class="cyber-btn-option ${settings.joystickSize === 'LARGE' ? 'active' : ''}" data-joystick="LARGE">${t.large}</button>
                                </div>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.buttonSize}</span>
                                <div class="btn-group">
                                    <button class="cyber-btn-option ${settings.buttonSize === 'SMALL' ? 'active' : ''}" data-buttonsize="SMALL">${t.small}</button>
                                    <button class="cyber-btn-option ${settings.buttonSize === 'MEDIUM' ? 'active' : ''}" data-buttonsize="MEDIUM">${t.medium}</button>
                                    <button class="cyber-btn-option ${settings.buttonSize === 'LARGE' ? 'active' : ''}" data-buttonsize="LARGE">${t.large}</button>
                                </div>
                            </div>
                        </div>

                        <!-- 5. LANGUAGE -->
                        <div class="settings-card">
                            <div class="card-title-row">
                                <span class="card-icon">🌐</span>
                                <span class="card-title-text">${t.language}</span>
                            </div>
                            <div class="btn-group" style="margin-top:auto; margin-bottom:auto">
                                <button class="cyber-btn-option ${settings.language === 'tr' ? 'active' : ''}" id="lang-tr-btn">TR</button>
                                <button class="cyber-btn-option ${settings.language === 'en' ? 'active' : ''}" id="lang-en-btn">EN</button>
                            </div>
                        </div>

                        <!-- 6. OTHER -->
                        <div class="settings-card">
                            <div class="card-title-row">
                                <span class="card-icon">🛸</span>
                                <span class="card-title-text">${t.other}</span>
                            </div>
                            <div class="settings-row">
                                <span class="settings-label">${t.notifications}</span>
                                <label class="cyber-switch">
                                    <input type="checkbox" id="toggle-notifications" ${settings.notificationsOn ? 'checked' : ''}>
                                    <span class="cyber-switch-slider"></span>
                                </label>
                            </div>
                            <div class="settings-row clickable-row" id="row-help">
                                <span class="settings-label">${t.help}</span>
                                <span class="clickable-row-arrow">❯</span>
                            </div>
                            <div class="settings-row clickable-row" id="row-privacy">
                                <span class="settings-label">${t.privacy}</span>
                                <span class="clickable-row-arrow">❯</span>
                            </div>
                            <div class="settings-row clickable-row" id="row-terms">
                                <span class="settings-label">${t.terms}</span>
                                <span class="clickable-row-arrow">❯</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-footer">
                        <span class="version-text">${t.ver}</span>
                        <div class="btn-kapat-container" id="cyber-close-btn">
                            <span class="btn-kapat-text">${t.close}</span>
                        </div>
                        <div style="width: 80px"></div>
                    </div>
                </div>
            `;

            attachEvents();
        };

        const updateSave = () => {
            if (window.SaveManager) window.SaveManager.save();
            this.sound.mute = !settings.sfxOn;
            document.body.style.filter = `brightness(${settings.brightness}%)`;
        };

        const attachEvents = () => {
            const closeX = overlay.querySelector('#cyber-close-x');
            if (closeX) {
                const doClose = () => overlay.remove();
                closeX.onclick = doClose;
                closeX.ontouchend = (e) => { e.preventDefault(); doClose(); };
            }

            const closeBtn = overlay.querySelector('#cyber-close-btn');
            if (closeBtn) {
                const doClose = () => overlay.remove();
                closeBtn.onclick = doClose;
                closeBtn.ontouchend = (e) => { e.preventDefault(); doClose(); };
            }

            const setupSlider = (sliderId, valueId, key) => {
                const slider = overlay.querySelector('#' + sliderId);
                const valueText = overlay.querySelector('#' + valueId);
                if (slider && valueText) {
                    slider.oninput = (e) => {
                        const val = parseInt(e.target.value);
                        settings[key] = val;
                        valueText.innerText = `${val}%`;

                        if (key === 'sfxVolume') {
                            settings.sfxOn = val > 0;
                        } else if (key === 'musicVolume') {
                            settings.musicOn = val > 0;
                        }
                        updateSave();
                        if (window.audioManager) window.audioManager.loadSettings();
                    };
                }
            };

            setupSlider('slider-master-volume', 'val-master-volume', 'masterVolume');
            setupSlider('slider-sfx-volume', 'val-sfx-volume', 'sfxVolume');
            setupSlider('slider-music-volume', 'val-music-volume', 'musicVolume');
            setupSlider('slider-crowd-volume', 'val-crowd-volume', 'crowdVolume');
            setupSlider('slider-brightness', 'val-brightness', 'brightness');
            setupSlider('slider-sensitivity', 'val-sensitivity', 'sensitivity');

            const qBtns = overlay.querySelectorAll('[data-quality]');
            qBtns.forEach(btn => {
                btn.onclick = (e) => {
                    settings.graphicsQuality = e.target.getAttribute('data-quality');
                    updateSave();
                    render();
                };
            });

            const fpsBtns = overlay.querySelectorAll('[data-fps]');
            fpsBtns.forEach(btn => {
                btn.onclick = (e) => {
                    settings.fpsLimit = parseInt(e.target.getAttribute('data-fps'));
                    updateSave();
                    render();
                };
            });

            const toggleVib = overlay.querySelector('#toggle-vibration');
            if (toggleVib) {
                toggleVib.onchange = (e) => {
                    settings.vibrationOn = e.target.checked;
                    updateSave();
                };
            }

            const schemeBtns = overlay.querySelectorAll('[data-scheme]');
            schemeBtns.forEach(btn => {
                btn.onclick = (e) => {
                    settings.controlScheme = e.target.getAttribute('data-scheme');
                    updateSave();
                    render();
                };
            });

            const jsBtns = overlay.querySelectorAll('[data-joystick]');
            jsBtns.forEach(btn => {
                btn.onclick = (e) => {
                    settings.joystickSize = e.target.getAttribute('data-joystick');
                    updateSave();
                    render();
                };
            });

            const bSizeBtns = overlay.querySelectorAll('[data-buttonsize]');
            bSizeBtns.forEach(btn => {
                btn.onclick = (e) => {
                    settings.buttonSize = e.target.getAttribute('data-buttonsize');
                    updateSave();
                    render();
                };
            });

            const resetCareerBtn = overlay.querySelector('#cyber-reset-career-btn');
            if (resetCareerBtn) {
                resetCareerBtn.onclick = () => {
                    const isTr = (settings.language === 'tr');
                    if (confirm(isTr ? "Kariyerini ve profilini silmek istediğine emin misin? Bu işlem geri alınamaz." : "Are you sure you want to delete your career and profile? This cannot be undone.")) {
                        localStorage.removeItem('headSoccerSave');
                        localStorage.removeItem('headSoccerSave_backup');
                        if (window.audioManager) {
                            window.audioManager.playSFX('button_click');
                        }
                        alert(isTr ? "Oyun sıfırlandı. Yeniden başlatılıyor." : "Game reset. Restarting.");
                        overlay.remove();
                        window.location.reload();
                    }
                };
            }

            const avatarBtn = overlay.querySelector('#cyber-avatar-btn');
            if (avatarBtn) {
                avatarBtn.onclick = () => {
                    const picker = document.createElement('div');
                    picker.id = 'cyber-avatar-picker';
                    picker.style.position = 'absolute';
                    picker.style.top = '50%';
                    picker.style.left = '50%';
                    picker.style.transform = 'translate(-50%, -50%)';
                    picker.style.background = '#0b1120';
                    picker.style.border = '2px solid #db2777';
                    picker.style.borderRadius = '12px';
                    picker.style.padding = '20px';
                    picker.style.zIndex = '20000';
                    picker.style.boxShadow = '0 0 30px rgba(219, 39, 119, 0.5)';
                    picker.style.textAlign = 'center';
                    
                    picker.innerHTML = `
                        <div style="font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 15px; font-family: sans-serif;">AVATAR SEÇ</div>
                        <div style="display: flex; gap: 15px; justify-content: center; margin-bottom: 20px;">
                            <span class="avatar-option" data-exp="neutral" style="font-size: 40px; cursor: pointer; border: 2px solid transparent; border-radius: 8px; padding: 5px;">😐</span>
                            <span class="avatar-option" data-exp="angry" style="font-size: 40px; cursor: pointer; border: 2px solid transparent; border-radius: 8px; padding: 5px;">😠</span>
                            <span class="avatar-option" data-exp="sad" style="font-size: 40px; cursor: pointer; border: 2px solid transparent; border-radius: 8px; padding: 5px;">😢</span>
                            <span class="avatar-option" data-exp="crying" style="font-size: 40px; cursor: pointer; border: 2px solid transparent; border-radius: 8px; padding: 5px;">😭</span>
                        </div>
                        <button class="btn-link-account" id="cyber-avatar-close-btn" style="background: #334155; border-color: #475569; width: 100px; color: #fff; font-weight: bold; padding: 6px 12px; cursor: pointer; border-radius: 6px;">KAPAT</button>
                    `;
                    
                    overlay.appendChild(picker);
                    
                    picker.querySelectorAll('.avatar-option').forEach(opt => {
                        const exp = opt.getAttribute('data-exp');
                        if (profile.expression === exp) {
                            opt.style.borderColor = '#db2777';
                            opt.style.background = '#1e1b4b';
                        }
                        opt.onclick = () => {
                            profile.expression = exp;
                            updateSave();
                            picker.remove();
                            render(); // Re-render settings screen to show new avatar face
                        };
                    });
                    
                    picker.querySelector('#cyber-avatar-close-btn').onclick = () => {
                        picker.remove();
                    };
                };
            }

            const trBtn = overlay.querySelector('#lang-tr-btn');
            if (trBtn) {
                trBtn.onclick = () => {
                    settings.language = 'tr';
                    if (window.Localization && typeof window.Localization.setLanguage === 'function') {
                        window.Localization.setLanguage('tr');
                    }
                    updateSave();
                    render();
                };
            }
            const enBtn = overlay.querySelector('#lang-en-btn');
            if (enBtn) {
                enBtn.onclick = () => {
                    settings.language = 'en';
                    if (window.Localization && typeof window.Localization.setLanguage === 'function') {
                        window.Localization.setLanguage('en');
                    }
                    updateSave();
                    render();
                };
            }

            const toggleNot = overlay.querySelector('#toggle-notifications');
            if (toggleNot) {
                toggleNot.onchange = (e) => {
                    settings.notificationsOn = e.target.checked;
                    updateSave();
                };
            }

            const linkBtn = overlay.querySelector('#cyber-link-account-btn');
            if (linkBtn) {
                linkBtn.onclick = () => {
                    settings.accountLinked = !settings.accountLinked;
                    updateSave();
                    render();
                };
            }

            const syncBtn = overlay.querySelector('#cyber-sync-btn');
            if (syncBtn) {
                syncBtn.onclick = () => {
                    const icon = syncBtn.querySelector('span');
                    if (icon) {
                        icon.style.display = 'inline-block';
                        icon.style.transition = 'transform 1s linear';
                        icon.style.transform = 'rotate(360deg)';
                        setTimeout(() => {
                            icon.style.transform = 'rotate(0deg)';
                            icon.style.transition = 'none';
                        }, 1000);
                    }
                };
            }

            const editBtn = overlay.querySelector('#cyber-username-edit-btn');
            const display = overlay.querySelector('#cyber-username-display');
            if (editBtn && display) {
                const startEdit = () => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'username-edit-input';
                    input.value = profile.username || profile.name;
                    input.maxLength = 12;
                    display.parentNode.replaceChild(input, display);
                    editBtn.style.display = 'none';
                    input.focus();

                    const finishEdit = () => {
                        const val = input.value.trim().substring(0, 12);
                        if (val.length > 0) {
                            profile.username = val;
                            profile.name = val; // Also update name for fallback
                            updateSave();
                            if (this.nameText) this.nameText.setText(val + " ✏️");
                            if (this.navNameText) this.navNameText.setText(val);
                        }
                        render();
                    };

                    input.onkeydown = (e) => {
                        if (e.key === 'Enter') finishEdit();
                        if (e.key === 'Escape') render();
                    };
                    input.onblur = finishEdit;
                };

                editBtn.onclick = startEdit;
                display.onclick = startEdit;
            }

            const attachLink = (id, url) => {
                const el = overlay.querySelector('#' + id);
                if (el) {
                    el.onclick = () => {
                        window.open(url, '_blank');
                    };
                }
            };
            attachLink('row-help', 'https://google.com');
            attachLink('row-privacy', 'https://google.com');
            attachLink('row-terms', 'https://google.com');
        };

        render();
        document.body.appendChild(overlay);
    }

    createHeader() {
        const profile = window.gameState.player;
        this.headerContainer = this.add.container(20, 20);

        const bg = this.add.rectangle(0, 0, 350, 130, 0x000000, 0.6).setOrigin(0);

        this.nameText = this.add.text(10, 10, profile.name + " ✏️", {
            font: '700 24px sans-serif', fill: '#fff'
        }).setInteractive({ useHandCursor: true });
        this.nameText.on('pointerdown', () => { this.openNameEditModal(); });

        const stats = this.add.text(10, 40, `Level ${profile.level} | ${window.gameState.career.ez} EZ`, {
            font: '16px sans-serif', fill: '#fbbf24'
        });

        // Add Ad Button (Rewarded Ads)
        const adBtn = this.add.rectangle(10, 70, 200, 45, 0x16a34a).setOrigin(0).setInteractive({useHandCursor: true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, adBtn);
        const adText = this.add.text(110, 92, "📺 REKLAM İZLE (+100 EZ)", {font: '700 14px sans-serif', fill: '#ffffff'}).setOrigin(0.5);
        this.headerContainer.add([bg, this.nameText, stats, adBtn, adText]);

        adBtn.on('pointerdown', () => { this.showRewardedAd(adBtn, adText, stats); });

        // Initial daily check
        const today = new Date().toDateString();
        if (window.gameState.career.lastAdDate !== today) {
            window.gameState.career.adsWatchedToday = 0;
            window.gameState.career.lastAdDate = today;
            if (window.SaveManager) window.SaveManager.save();
        }
        if (window.gameState.career.adsWatchedToday >= 5) {
            adText.setText("BİTTİ (YARIN GEL)");
            adBtn.setFillStyle(0x475569);
        }
    }

    showRewardedAd(btn, text, statsText) {
        if (window.gameState.career.adsWatchedToday >= 5) return;

        const overlay = this.add.rectangle(this.width/2, this.height/2, this.width, this.height, 0x000000, 0.95).setInteractive().setDepth(300);
        const txt = this.add.text(this.width/2, this.height/2, "Reklam İzleniyor...\nLütfen Bekleyin", {font: '700 37px sans-serif', fill: '#fff', align: 'center'}).setOrigin(0.5).setDepth(300);

        this.time.delayedCall(3000, () => {
            overlay.destroy();
            txt.destroy();
            
            window.gameState.career.ez += 100; // Halved to balance economy
            window.gameState.career.adsWatchedToday++;
            if (window.SaveManager) window.SaveManager.save();
            
            statsText.setText(`Level ${window.gameState.player.level} | ${window.gameState.career.ez} EZ`);
            
            if (window.gameState.career.adsWatchedToday >= 5) {
                text.setText("BİTTİ (YARIN GEL)");
                btn.setFillStyle(0x475569);
            }
        });
    }

    openNameEditModal() {
        // 1. Phaser Background Dim
        const bg = this.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x000000, 0.7)
            .setInteractive(); // Block clicks below

        this.activeModal = {
            destroy: () => saveAndClose()
        };

        const title = this.add.text(this.width / 2, this.height / 2 - 80, "İSMİNİ YAZ", {
            font: '700 33px sans-serif', fill: '#fff'
        }).setOrigin(0.5);

        // 2. HTML Input Overlay
        const input = document.createElement('input');
        input.type = 'text';
        input.value = window.gameState.player.name;
        input.maxLength = 12;
        input.style.position = 'absolute';
        input.style.top = '50%';
        input.style.left = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.padding = '10px 20px';
        input.style.fontSize = '24px';
        input.style.fontFamily = 'sans-serif, sans-serif';
        input.style.fontWeight = 'bold';
        input.style.color = '#fff';
        input.style.background = '#1e293b';
        input.style.border = '2px solid #38bdf8';
        input.style.borderRadius = '8px';
        input.style.textAlign = 'center';
        input.style.width = '300px';
        input.style.zIndex = '1000';

        document.body.appendChild(input);

        // Focus instantly
        setTimeout(() => input.focus(), 10);

        // Hint text declared BEFORE saveAndClose so it's in scope inside the closure
        const hint = this.add.text(this.width / 2, this.height / 2 + 60, "Kaydetmek için ENTER'a bas", {
            font: '16px sans-serif', fill: '#94a3b8'
        }).setOrigin(0.5);

        // Save Function
        const saveAndClose = () => {
            const val = input.value.trim().substring(0, 12);
            if (val.length > 0) {
                window.gameState.player.name = val;
                if (window.SaveManager) window.SaveManager.save();
                if (this.nameText) this.nameText.setText(val + " ✏️");
                if (this.navNameText) this.navNameText.setText(val);
            }
            // Cleanup
            document.body.removeChild(input);
            bg.destroy();
            title.destroy();
            hint.destroy();
            this.activeModal = null;
        };

        // Events
        input.onkeydown = (e) => {
            if (e.key === 'Enter') saveAndClose();
        };

        // Click outside (on bg) to close/save
        bg.on('pointerdown', () => saveAndClose());
    }

    openCareerOrOnboarding() {
        if (!window.gameState || !window.gameState.career || !window.gameState.career.started) {
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => this.scene.start('OnboardingScene'));
        } else {
            this.cameras.main.fadeOut(500);
            this.time.delayedCall(500, () => this.scene.start('CareerWorldScene'));
        }
    }

    showExitConfirmation() {
        if (this.activeModal) return;

        const overlay = this.add.rectangle(0, 0, this.width, this.height, 0x000000, 0.8)
            .setOrigin(0).setInteractive().setDepth(5000);
        
        const modal = this.add.container(this.width / 2, this.height / 2).setDepth(5001);
        const bg = this.add.graphics();
        bg.fillStyle(0x0f172a, 1);
        bg.lineStyle(2, 0xff00ff, 1);
        bg.fillRoundedRect(-200, -100, 400, 200, 16);
        bg.strokeRoundedRect(-200, -100, 400, 200, 16);
        
        const text = this.add.text(0, -30, 'Oyundan çıkmak istiyor musunuz?', {
            font: '700 20px sans-serif', fill: '#ffffff', align: 'center', wordWrap: { width: 360 }
        }).setOrigin(0.5);

        const btnYes = this.createButton(-100, 40, 150, 45, 'EVET', 0xef4444, () => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.exitApp();
            }
        });

        const btnNo = this.createButton(100, 40, 150, 45, 'HAYIR', 0x3b82f6, () => {
            modal.destroy();
            overlay.destroy();
            this.activeModal = null;
        });

        modal.add([bg, text, btnYes, btnNo]);
        this.activeModal = modal;
    }

    startCareer() {
        if (!this.hasCareer) {
            // New career initialization
            if (!window.gameState) window.gameState = {};
            window.gameState.career = { started: false };
            if (window.SaveManager) window.SaveManager.save();
        }
        this.cameras.main.fadeOut(500);
        this.time.delayedCall(500, () => this.scene.start('CareerWorldScene'));
    }

    getMascot(league) { return '🏆'; } // Stub
}
