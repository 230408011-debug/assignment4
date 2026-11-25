class CustomizationScene extends Phaser.Scene {
    constructor() {
        super('CustomizationScene');
    }

    init(data) {
        this.parentScene = (data && data.parentScene) ? data.parentScene : 'MenuScene';
        
        if (!window.gameState) window.gameState = {};
        if (!window.gameState.player) window.gameState.player = { name: 'ADOK', level: 11, xp: 2300, maxXp: 3500 };
        if (!window.gameState.career) window.gameState.career = { ez: 6480 };
        
        if (!window.gameState.customization) window.gameState.customization = {};
        if (!window.gameState.customization.ownedItems) window.gameState.customization.ownedItems = ["default_run", "default_shot", "default_goal", "default_trail"];
        if (!window.gameState.customization.equipped) window.gameState.customization.equipped = { runAnimation: "default_run", shotEffect: "default_shot", goalAnimation: "default_goal", ballTrail: "default_trail" };
        if (!window.gameState.customization.unlockedGoalAnimations) window.gameState.customization.unlockedGoalAnimations = ["default_goal"];

        this.preview = { ...window.gameState.customization.equipped };
        this.equippedAtStart = { ...window.gameState.customization.equipped };
        this.coins = window.gameState.career.ez || 0;
        this.activeCategory = 'runAnimation';

        this.items = [
            { id: "default_run", category: "runAnimation", name: "Varsayılan", price: 0, previewType: "run_default", icon: "🏃" },
            { id: "hiz_run", category: "runAnimation", name: "Hız Çizgileri", price: 500, previewType: "run_wind", icon: "⚡" },
            { id: "neon_run", category: "runAnimation", name: "Neon Adım", price: 750, previewType: "run_neon", icon: "👣" },
            
            { id: "default_shot", category: "shotEffect", name: "Varsayılan", price: 0, previewType: "shot_default", icon: "⚽" },
            { id: "purple_flame_shot", category: "shotEffect", name: "Mor Alev", price: 500, previewType: "shot_purple", icon: "🔥" },
            { id: "electric_shot", category: "shotEffect", name: "Elektrik Adım", price: 750, previewType: "shot_electric", icon: "⚡" },
            { id: "ice_shot", category: "shotEffect", name: "Buz", price: 750, previewType: "shot_ice", icon: "❄️" },
            { id: "cyan_energy_shot", category: "shotEffect", name: "Cyan Enerji", price: 900, previewType: "shot_cyan", icon: "🌀" },
            { id: "gold_power_shot", category: "shotEffect", name: "Altın Güç", price: 1200, previewType: "shot_gold", icon: "✨" },

            { id: "default_goal", category: "goalAnimation", name: "Varsayılan", price: 0, previewType: "anim_default", icon: "✨" },
            { id: "fire_burst", category: "goalAnimation", name: "Ateş Patlaması", price: 500, previewType: "anim_fire", icon: "🔥" },
            { id: "electric_wave", category: "goalAnimation", name: "Şimşek Dalgası", price: 750, previewType: "anim_electric", icon: "⚡" },
            { id: "ice_break", category: "goalAnimation", name: "Buz Kırılması", price: 800, previewType: "anim_ice", icon: "❄️" },
            { id: "neon_ring", category: "goalAnimation", name: "Neon Halka", price: 900, previewType: "anim_neon", icon: "🟣" },
            { id: "energy_explosion", category: "goalAnimation", name: "Enerji Patlaması", price: 1200, previewType: "anim_energy", icon: "💥" },

            { id: "default_trail", category: "ballTrail", name: "Varsayılan", price: 0, previewType: "trail_default", icon: "💫" },
            { id: "purple_trail", category: "ballTrail", name: "Mor İz", price: 500, previewType: "trail_purple", icon: "🟣" },
            { id: "cyan_trail", category: "ballTrail", name: "Cyan İz", price: 750, previewType: "trail_cyan", icon: "🔵" }
        ];

        this.categories = [
            { id: "runAnimation", title: "KOŞU ANİMASYONU", icon: "🏃" },
            { id: "shotEffect", title: "ŞUT EFEKTİ", icon: "🔥" },
            { id: "goalAnimation", title: "GOL EFEKTİ", icon: "✨" },
            { id: "ballTrail", title: "TOP İZİ", icon: "⚽" }
        ];

        this.previewActive = false;
        this.particleSystems = [];
    }

    create() {
        this.width = this.scale.width;
        this.height = this.scale.height;

        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        // 1. Cyberpunk background
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020010, 0x020010, 0x07021c, 0x0c0326, 1);
        bg.fillRect(0, 0, this.width, this.height);
        
        const grid = this.add.graphics().setAlpha(0.04);
        grid.lineStyle(1, 0xd946ef);
        for (let x = 0; x < this.width; x += 60) grid.lineBetween(x, 0, x, this.height);
        for (let y = 0; y < this.height; y += 60) grid.lineBetween(0, y, this.width, y);
        
        const stadiumBg = this.add.image(this.width / 2, this.height / 2, 'bg_stadium');
        if (stadiumBg.texture.key !== '__MISSING') {
            stadiumBg.setAlpha(0.15).setTint(0xd946ef);
            const scale = Math.max(this.width / stadiumBg.width, this.height / stadiumBg.height);
            stadiumBg.setScale(scale);
        }

        // 2. Sections
        this.createHeader();
        this.createPlayerProfile();
        this.createInstructionPanel();
        this.createMascotPreview();
        this.createBottomSection();

        this.cameras.main.fadeIn(400);
    }

    createHeader() {
        // Back Button
        const backX = 60, backY = 40;
        const backBg = this.add.graphics();
        backBg.fillStyle(0x0a0518, 0.8);
        backBg.lineStyle(1.5, 0xd946ef, 0.15);
        backBg.fillRoundedRect(backX - 35, backY - 18, 70, 36, 6);
        backBg.strokeRoundedRect(backX - 35, backY - 18, 70, 36, 6);
        
        const backTxt = this.add.text(backX, backY, "❮ GERİ", { font: '700 14px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        const backHit = this.add.rectangle(backX, backY, 70, 36, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, backHit);
        backHit.on('pointerdown', () => this.exitScene(false));
        this.add.container(0, 0, [backBg, backTxt, backHit]).setDepth(200);

        // Header Title
        const titleX = this.width / 2;
        const titleText = this.add.text(titleX, 30, "KARAKTER ÖZELLEŞTİRME", { font: '700 33px sans-serif', fill: '#ffffff', letterSpacing: 2 }).setOrigin(0.5);
        if (titleText.postFX) titleText.postFX.addGlow(0xd946ef, 4, 0, false, 0.1, 10);
        this.add.text(titleX, 60, "→ Tarzını Belirle, Sahada İz Bırak! ←", { font: '800 12px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

        // EZ Money Badge
        const badgeX = this.width - 150, badgeY = 40;
        this.ezBadgeContainer = this.add.container(badgeX, badgeY);
        
        const ezBg = this.add.graphics();
        ezBg.fillStyle(0x0a0518, 0.85);
        ezBg.lineStyle(1.5, 0xfacc15, 0.15);
        ezBg.fillRoundedRect(-60, -18, 120, 36, 6);
        ezBg.strokeRoundedRect(-60, -18, 120, 36, 6);
        this.ezBadgeContainer.add(ezBg);
        
        const coin = this.add.circle(-40, 0, 8, 0xfacc15);
        const coinTxt = this.add.text(-40, 0, "EZ", { font: '700 10px sans-serif', fill: '#000000' }).setOrigin(0.5);
        this.ezTextObj = this.add.text(10, 0, `${this.coins} EZ`, { font: '700 15px sans-serif', fill: '#facc15' }).setOrigin(0.5);
        
        const plusBg = this.add.graphics();
        plusBg.fillStyle(0x0a0518, 0.85);
        plusBg.lineStyle(1.5, 0xd946ef, 0.15);
        plusBg.fillRoundedRect(75, -18, 36, 36, 6);
        plusBg.strokeRoundedRect(75, -18, 36, 36, 6);
        const plusTxt = this.add.text(93, 0, "+", { font: '700 19px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        this.ezBadgeContainer.add([coin, coinTxt, this.ezTextObj, plusBg, plusTxt]);
    }

    createPlayerProfile() {
        if (this.profileContainer) this.profileContainer.destroy();
        this.profileContainer = this.add.container(40, 90);
        
        const w = 260, h = 260;
        const bg = this.add.graphics();
        bg.fillStyle(0x0a041f, 0.85);
        bg.lineStyle(2, 0xd946ef, 0.15);
        bg.fillRoundedRect(0, 0, w, h, 12);
        bg.strokeRoundedRect(0, 0, w, h, 12);
        this.profileContainer.add(bg);

        // Player Head
        const headBg = this.add.graphics();
        headBg.fillStyle(0xfacc15, 1);
        headBg.lineStyle(2, 0xffffff, 1);
        headBg.fillCircle(45, 45, 25);
        headBg.strokeCircle(45, 45, 25);
        headBg.fillStyle(0x000000, 1);
        headBg.fillCircle(38, 42, 3);
        headBg.fillCircle(52, 42, 3);
        headBg.beginPath();
        headBg.arc(45, 48, 8, 0, Math.PI, false);
        headBg.strokePath();
        this.profileContainer.add(headBg);

        const pLevel = window.gameState.player.level || 11;
        const pName = window.gameState.player.name || "ADOK";
        this.profileContainer.add(this.add.text(85, 25, pName, { font: '700 21px sans-serif', fill: '#ffffff' }));
        this.profileContainer.add(this.add.text(85, 50, `SEVİYE ${pLevel}`, { font: '800 12px sans-serif', fill: '#cbd5e1' }));

        const editBtn = this.add.graphics();
        editBtn.fillStyle(0xd946ef, 0.2);
        editBtn.fillRoundedRect(215, 25, 25, 25, 4);
        editBtn.lineStyle(1, 0xd946ef, 1);
        editBtn.strokeRoundedRect(215, 25, 25, 25, 4);
        this.profileContainer.add(editBtn);
        this.profileContainer.add(this.add.text(227, 37, "✎", { font: '14px sans-serif', fill: '#d946ef' }).setOrigin(0.5));

        // XP Bar
        const xpBarW = 220;
        this.profileContainer.add(this.add.text(20, 85, "2300 / 3500 XP", { font: '8px sans-serif', fill: '#94a3b8' }));
        const xpBg = this.add.graphics().fillStyle(0x1e293b, 1).fillRoundedRect(20, 100, xpBarW, 6, 3);
        const xpFill = this.add.graphics().fillStyle(0x00ffff, 1).fillRoundedRect(20, 100, xpBarW * 0.65, 6, 3);
        this.profileContainer.add([xpBg, xpFill]);
        
        // Equipped List
        this.profileContainer.add(this.add.text(w/2, 130, "SEÇİLİ TARZ", { font: '800 12px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
        
        const eqRun = this.items.find(i => i.id === this.preview.runAnimation);
        const eqShot = this.items.find(i => i.id === this.preview.shotEffect);
        const eqGoal = this.items.find(i => i.id === this.preview.goalAnimation);
        const eqTrail = this.items.find(i => i.id === this.preview.ballTrail);

        const yStart = 150;
        const rows = [
            { icon: "🏃", label: "Koşu Animasyonu", val: eqRun ? eqRun.name : "-" },
            { icon: "🔥", label: "Şut Efekti", val: eqShot ? eqShot.name : "-" },
            { icon: "✨", label: "Gol Efekti", val: eqGoal ? eqGoal.name : "-" },
            { icon: "💫", label: "Top İzi", val: eqTrail ? eqTrail.name : "-" }
        ];

        rows.forEach((r, i) => {
            this.profileContainer.add(this.add.text(20, yStart + i*20, `${r.icon}  ${r.label}`, { font: '11px sans-serif', fill: '#cbd5e1' }));
            this.profileContainer.add(this.add.text(240, yStart + i*20, r.val, { font: '11px sans-serif', fill: '#ffffff', align: 'right' }).setOrigin(1, 0));
        });

        // Reset Button
        const resetHit = this.add.rectangle(w/2, 240, 180, 24, 0, 0).setInteractive({useHandCursor: true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, resetHit);
        const resetTxt = this.add.text(w/2, 240, "⟳ ÖNİZLEMEYİ SIFIRLA", { font: '700 12px sans-serif', fill: '#00ffff' }).setOrigin(0.5);
        this.profileContainer.add([resetTxt, resetHit]);
        resetHit.on('pointerdown', () => {
            this.preview = { ...window.gameState.customization.equipped };
            this.createBottomSection();
            this.createPlayerProfile();
        });
    }

    createInstructionPanel() {
        const w = 240, h = 260;
        const px = this.width - w - 40;
        const py = 90;
        const c = this.add.container(px, py);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x0a041f, 0.85);
        bg.lineStyle(2, 0xd946ef, 0.15);
        bg.fillRoundedRect(0, 0, w, h, 12);
        bg.strokeRoundedRect(0, 0, w, h, 12);
        c.add(bg);

        c.add(this.add.text(20, 20, "NASIL ÇALIŞIR?", { font: '700 15px sans-serif', fill: '#ffffff' }));

        const instructions = [
            { icon: "📄", text: "Alt kısımdan bir kategori seç." },
            { icon: "🛒", text: "Efektleri incele ve beğendiğini\nsatın al." },
            { icon: "✓", text: "Satın aldığın veya sahip olduğun\nefekti uygula." },
            { icon: "⭐", text: "Sahada tarzını göster!" }
        ];

        instructions.forEach((ins, i) => {
            c.add(this.add.text(20, 60 + i*45, ins.icon, { font: '16px sans-serif' }));
            c.add(this.add.text(50, 60 + i*45 + 8, ins.text, { font: '11px sans-serif', fill: '#cbd5e1', lineSpacing: 4 }).setOrigin(0, 0.5));
        });
    }

    createMascotPreview() {
        const cx = this.width / 2;
        const cy = 200; // Big center mascot

        const plat = this.add.graphics();
        plat.lineStyle(4, 0xd946ef, 1);
        plat.strokeEllipse(cx, cy + 120, 240, 50);
        plat.lineStyle(2, 0x00ffff, 1);
        plat.strokeEllipse(cx, cy + 120, 200, 40);
        plat.fillStyle(0x0a0522, 0.95);
        plat.fillEllipse(cx, cy + 120, 180, 36);

        this.mascotContainer = this.add.container(cx, cy);

        // Legs
        const legL = this.add.line(-35, 75, 0, 0, 0, 30, 0xffffff).setLineWidth(5);
        const legR = this.add.line(35, 75, 0, 0, 0, 30, 0xffffff).setLineWidth(5);
        this.legLeft = legL;
        this.legRight = legR;

        // Shoes
        const shoeL = this.add.circle(-35, 105, 12, 0xd946ef).setStrokeStyle(2.5, 0xffffff);
        const shoeR = this.add.circle(35, 105, 12, 0xd946ef).setStrokeStyle(2.5, 0xffffff);

        // Body
        this.mascotBody = this.add.circle(0, 15, 80, 0xfacc15).setStrokeStyle(4, 0xffffff);
        
        // Eyes
        const eyeL = this.add.circle(-25, -10, 15, 0xffffff);
        const eyeR = this.add.circle(25, -10, 15, 0xffffff);
        const pupilL = this.add.circle(-22, -6, 7, 0x000000);
        const pupilR = this.add.circle(28, -6, 7, 0x000000);

        // Mouth
        const mouth = this.add.graphics();
        mouth.lineStyle(4, 0x000000, 1);
        mouth.beginPath();
        mouth.arc(0, 20, 18, 0, Math.PI, false);
        mouth.strokePath();

        this.mascotContainer.add([legL, legR, shoeL, shoeR, this.mascotBody, eyeL, eyeR, pupilL, pupilR, mouth]);

        this.tweens.add({
            targets: this.mascotContainer,
            y: cy - 12,
            duration: 1600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add ball
        this.ballContainer = this.add.container(cx + 150, cy + 90);
        const ballG = this.add.graphics();
        ballG.fillStyle(0xffffff, 1);
        ballG.fillCircle(0, 0, 25);
        ballG.lineStyle(2, 0x000000, 1);
        ballG.strokeCircle(0, 0, 25);
        ballG.fillStyle(0x000000, 1);
        ballG.fillCircle(0, 0, 8);
        for (let i = 0; i < 5; i++) {
            const angle = (i * 72 * Math.PI) / 180;
            const px = Math.cos(angle) * 16;
            const py = Math.sin(angle) * 16;
            ballG.fillCircle(px, py, 5);
        }
        this.ballContainer.add(ballG);

        // Preview button
        const pBtn = this.add.graphics();
        pBtn.fillStyle(0xd946ef, 0.2);
        pBtn.fillRoundedRect(cx - 50, cy + 140, 100, 26, 13);
        pBtn.lineStyle(1.5, 0xd946ef, 1);
        pBtn.strokeRoundedRect(cx - 50, cy + 140, 100, 26, 13);
        this.add.text(cx, cy + 153, "👁 ÖNİZLEME", { font: '700 12px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
    }

    createBottomSection() {
        if (this.bottomContainer) this.bottomContainer.destroy();
        this.bottomContainer = this.add.container(0, 390);

        // Backdrop for bottom area
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x060212, 0.95);
        panelBg.lineStyle(2, 0x334155, 0.8);
        panelBg.fillRoundedRect(20, 0, this.width - 40, this.height - 400, 16);
        panelBg.strokeRoundedRect(20, 0, this.width - 40, this.height - 400, 16);
        this.bottomContainer.add(panelBg);

        // Tabs
        const tabW = Math.floor((this.width - 80) / 4);
        let currentX = 40;
        this.categories.forEach(cat => {
            const isActive = this.activeCategory === cat.id;
            const bg = this.add.graphics();
            bg.fillStyle(isActive ? 0x0a041f : 0x060212, 1);
            bg.lineStyle(2, isActive ? 0xd946ef : 0x1e293b, 1);
            bg.fillRoundedRect(currentX, 10, tabW, 40, 8);
            bg.strokeRoundedRect(currentX, 10, tabW, 40, 8);
            
            const txt = this.add.text(currentX + tabW/2, 30, `${cat.icon} ${cat.title}`, { font: '700 14px sans-serif', fill: isActive ? '#ffffff' : '#64748b' }).setOrigin(0.5);
            
            const hit = this.add.rectangle(currentX + tabW/2, 30, tabW, 40, 0, 0).setInteractive({useHandCursor: true});
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
            hit.on('pointerdown', () => {
                this.activeCategory = cat.id;
                this.preview[cat.id] = window.gameState.customization.equipped[cat.id];
                this.createBottomSection();
            });

            this.bottomContainer.add([bg, txt, hit]);
            currentX += tabW + 10;
        });

        // Carousel + Details Panel Area
        this.createCarouselAndDetails(this.bottomContainer, 30, 60);

        // Global Action Buttons (Uygula / Kapat)
        this.createGlobalActionButtons(this.bottomContainer, this.width / 2, this.height - 400 - 30);
    }

    createCarouselAndDetails(container, startX, startY) {
        const items = this.items.filter(item => item.category === this.activeCategory);
        const cardW = 150, cardH = 200;
        const spacing = 15;
        
        // Render Cards (Left ~70%)
        items.forEach((item, index) => {
            const isOwned = window.gameState.customization.ownedItems.includes(item.id) || (item.category === 'goalAnimation' && window.gameState.customization.unlockedGoalAnimations.includes(item.id));
            const isEquipped = window.gameState.customization.equipped[this.activeCategory] === item.id;
            const isPreviewed = this.preview[this.activeCategory] === item.id;

            const cx = startX + index * (cardW + spacing);
            const cy = startY;
            
            const bg = this.add.graphics();
            if (isPreviewed) {
                bg.fillStyle(0x3b0764, 0.95);
                bg.lineStyle(3, 0xd946ef, 1);
            } else if (isOwned) {
                bg.fillStyle(0x1e293b, 0.9);
                bg.lineStyle(2, 0x64748b, 0.9);
            } else {
                bg.fillStyle(0x0f172a, 0.7);
                bg.lineStyle(2, 0x334155, 0.6);
            }
            bg.fillRoundedRect(cx, cy, cardW, cardH, 12);
            bg.strokeRoundedRect(cx, cy, cardW, cardH, 12);
            container.add(bg);

            container.add(this.add.text(cx + cardW/2, cy + 40, item.icon, { fontSize: '49px' }).setOrigin(0.5));
            container.add(this.add.text(cx + cardW/2, cy + 90, item.name.toUpperCase(), { font: '700 14px sans-serif', fill: isPreviewed ? '#ffffff' : (isOwned ? '#cbd5e1' : '#64748b') }).setOrigin(0.5));

            if (!isOwned && item.price > 0) {
                container.add(this.add.text(cx + cardW - 20, cy + 20, "🔒", { fontSize: '15px' }).setOrigin(0.5));
                
                const pill = this.add.graphics();
                pill.fillStyle(0x02000a, 0.8);
                pill.lineStyle(1, 0xfacc15, 0.15);
                pill.fillRoundedRect(cx + 25, cy + cardH - 45, 100, 24, 12);
                pill.strokeRoundedRect(cx + 25, cy + cardH - 45, 100, 24, 12);
                container.add(pill);
                container.add(this.add.text(cx + cardW/2, cy + cardH - 33, `EZ ${item.price}`, { font: '800 11px sans-serif', fill: '#facc15' }).setOrigin(0.5));
            } else if (isEquipped) {
                container.add(this.add.text(cx + cardW - 20, cy + 20, "✓", { fontSize: '17px', fill: '#22c55e' }).setOrigin(0.5));
                const eqPill = this.add.graphics().fillStyle(0x22c55e, 0.2).fillRoundedRect(cx + 25, cy + cardH - 45, 100, 24, 12).lineStyle(1, 0x22c55e, 1).strokeRoundedRect(cx + 25, cy + cardH - 45, 100, 24, 12);
                container.add(eqPill);
                container.add(this.add.text(cx + cardW/2, cy + cardH - 33, `✓ UYGULANIYOR`, { font: '700 11px sans-serif', fill: '#22c55e' }).setOrigin(0.5));
            } else if (isOwned) {
                const eqPill = this.add.graphics().fillStyle(0x1e293b, 0.8).fillRoundedRect(cx + 25, cy + cardH - 45, 100, 24, 12).lineStyle(1, 0x64748b, 1).strokeRoundedRect(cx + 25, cy + cardH - 45, 100, 24, 12);
                container.add(eqPill);
                container.add(this.add.text(cx + cardW/2, cy + cardH - 33, `✓ SEÇİLİ`, { font: '700 11px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
            }

            const hit = this.add.rectangle(cx + cardW/2, cy + cardH/2, cardW, cardH, 0, 0).setInteractive({useHandCursor: true});
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
            hit.on('pointerdown', () => this.triggerPreview(item));
            container.add(hit);
        });

        // Detail Panel (Right ~30%)
        const dX = this.width - 320;
        const dY = startY;
        const dW = 280, dH = 200;
        
        const previewedId = this.preview[this.activeCategory];
        const selectedItem = this.items.find(item => item.id === previewedId) || items[0];
        const isSelectedOwned = window.gameState.customization.ownedItems.includes(selectedItem.id) || (selectedItem.category === 'goalAnimation' && window.gameState.customization.unlockedGoalAnimations.includes(selectedItem.id));
        const isSelectedEquipped = window.gameState.customization.equipped[this.activeCategory] === selectedItem.id;

        const dbg = this.add.graphics();
        dbg.fillStyle(0x0a041f, 1);
        dbg.lineStyle(2, 0xd946ef, 0.15);
        dbg.fillRoundedRect(dX, dY, dW, dH, 12);
        dbg.strokeRoundedRect(dX, dY, dW, dH, 12);
        container.add(dbg);

        container.add(this.add.text(dX + 20, dY + 25, selectedItem.name.toUpperCase(), { font: '700 21px sans-serif', fill: '#ffffff' }));
        
        const rarityBg = this.add.graphics().fillStyle(0xd946ef, 0.2).fillRoundedRect(dX + dW - 80, dY + 22, 60, 20, 4);
        container.add(rarityBg);
        container.add(this.add.text(dX + dW - 50, dY + 32, "DESTANSI", { font: '800 9px sans-serif', fill: '#d946ef' }).setOrigin(0.5));

        const desc = `Bu özel efekt ile sahada fark yarat. ${selectedItem.name} animasyonu tarzınızı herkese gösterir.`;
        container.add(this.add.text(dX + 20, dY + 60, desc, { font: '13px sans-serif', fill: '#94a3b8', wordWrap: { width: dW - 40 } }));

        if (!isSelectedOwned) {
            container.add(this.add.text(dX + 20, dY + dH - 70, `Fiyat`, { font: '13px sans-serif', fill: '#cbd5e1' }));
            container.add(this.add.text(dX + dW - 20, dY + dH - 70, `${selectedItem.price} EZ 🟡`, { font: '700 17px sans-serif', fill: '#facc15' }).setOrigin(1, 0));
        }

        // Action Button in Details
        const actBtnY = dY + dH - 40;
        const actBtn = this.add.graphics();
        const actTxtColor = '#ffffff';
        let actColor = 0x16a34a;
        let actLabel = "✓ UYGULA";
        
        if (!isSelectedOwned) {
            actColor = 0xb91c1c; // Or yellow for buy? Mockup has Green Uygula but actually it's a purchase button. Let's make it green for action.
            actLabel = "🛒 SATIN AL";
        } else if (isSelectedEquipped) {
            actColor = 0x475569;
            actLabel = "UYGULANIYOR";
        }

        actBtn.fillStyle(actColor, 1);
        actBtn.fillRoundedRect(dX + 20, actBtnY, dW - 40, 34, 8);
        container.add(actBtn);
        container.add(this.add.text(dX + dW/2, actBtnY + 17, actLabel, { font: '700 14px sans-serif', fill: actTxtColor }).setOrigin(0.5));

        if (!isSelectedEquipped) {
            const hit = this.add.rectangle(dX + dW/2, actBtnY + 17, dW - 40, 34, 0, 0).setInteractive({useHandCursor: true});
            if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);
            hit.on('pointerdown', () => {
                if (!isSelectedOwned) {
                    this.confirmPurchase(selectedItem);
                } else {
                    this.equipItem(this.activeCategory, selectedItem.id);
                }
            });
            container.add(hit);
        }
    }

    createGlobalActionButtons(container, cx, cy) {
        // Global Uygula and Kapat
        const w = 240, h = 48;
        
        // Uygula (Green)
        const okBg = this.add.graphics();
        okBg.fillStyle(0x16a34a, 1);
        okBg.lineStyle(2, 0xffffff, 1);
        okBg.fillRoundedRect(cx - w - 10, cy - h/2, w, h, 8);
        okBg.strokeRoundedRect(cx - w - 10, cy - h/2, w, h, 8);
        container.add(okBg);
        container.add(this.add.text(cx - w/2 - 5, cy, "✓ UYGULA", { font: '700 16px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        const okHit = this.add.rectangle(cx - w/2 - 5, cy, w, h, 0, 0).setInteractive({useHandCursor: true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, okHit);
        okHit.on('pointerdown', () => this.exitScene(true));
        container.add(okHit);

        // Kapat (Red)
        const closeBg = this.add.graphics();
        closeBg.fillStyle(0xb91c1c, 1);
        closeBg.lineStyle(2, 0xffffff, 1);
        closeBg.fillRoundedRect(cx + 10, cy - h/2, w, h, 8);
        closeBg.strokeRoundedRect(cx + 10, cy - h/2, w, h, 8);
        container.add(closeBg);
        container.add(this.add.text(cx + w/2 + 5, cy, "✕ KAPAT", { font: '700 16px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        const closeHit = this.add.rectangle(cx + w/2 + 5, cy, w, h, 0, 0).setInteractive({useHandCursor: true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, closeHit);
        closeHit.on('pointerdown', () => this.exitScene(false));
        container.add(closeHit);
    }

    triggerPreview(item) {
        if (this.previewActive) {
            if (item.category !== 'shotEffect' && item.category !== 'ballTrail') return;
        }
        this.clearPreviewEffects();
        this.previewActive = false;
        this.preview[item.category] = item.id;
        this.createBottomSection();
        this.previewActive = true;
        
        if (item.category === 'runAnimation') this.runPreviewAnim(item.previewType);
        else if (item.category === 'shotEffect') this.runShotPreview(item.previewType);
        else if (item.category === 'goalAnimation') this.runAnimationPreview(item.previewType);
        else if (item.category === 'ballTrail') this.runTrailPreview(item.previewType);
    }

    runPreviewAnim(type) {
        const startX = this.mascotContainer.x;
        this.tweens.add({
            targets: this.mascotContainer, x: startX + 6, duration: 150, yoyo: true, repeat: 4, ease: 'Sine.easeInOut',
            onUpdate: () => { this.legLeft.y = Math.sin(this.time.now / 40) * 5; this.legRight.y = -Math.sin(this.time.now / 40) * 5; },
            onComplete: () => { this.mascotContainer.x = startX; this.legLeft.y = 0; this.legRight.y = 0; this.previewActive = false; }
        });
        if (type !== 'run_default') {
            const tint = type === 'run_neon' ? 0xd946ef : 0x00ffff;
            const p = this.add.particles(this.mascotContainer.x, this.mascotContainer.y + 40, 'ball_basic', {
                speedX: { min: -150, max: -80 }, speedY: { min: -10, max: 10 }, scale: { start: 0.1, end: 0 },
                alpha: { start: 0.8, end: 0 }, lifespan: 400, quantity: 1, duration: 500, particleTint: tint
            });
            this.particleSystems.push(p);
        }
    }

    clearPreviewEffects() {
        if (this.particleSystems) { this.particleSystems.forEach(p => { if (p) p.destroy(); }); this.particleSystems = []; }
        if (this.ballContainer) { this.tweens.killTweensOf(this.ballContainer); this.ballContainer.setScale(1); }
    }

    runShotPreview(type) {
        this.clearPreviewEffects();
        if (type === 'shot_default') {
            this.tweens.add({ targets: this.ballContainer, scale: 1.1, duration: 150, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.previewActive = false; }});
            return;
        }
        const bx = this.ballContainer.x;
        const by = this.ballContainer.y;
        let config = {};
        if (type === 'shot_purple') config = { speed: { min: 40, max: 120 }, angle: { min: -110, max: -70 }, scale: { start: 0.3, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 600, quantity: 40, duration: 500, particleTint: 0xd946ef, blendMode: 'ADD', gravityY: -200 };
        else if (type === 'shot_electric') config = { speed: { min: 100, max: 300 }, angle: { min: 0, max: 360 }, scaleX: { start: 0.5, end: 0 }, scaleY: { start: 0.05, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 200, frequency: 20, duration: 400, particleTint: 0xfde047, blendMode: 'ADD' };
        else if (type === 'shot_ice') config = { speed: { min: 150, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 0.2, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: { min: 300, max: 700 }, quantity: 25, duration: 100, particleTint: 0xa5f3fc, blendMode: 'NORMAL', gravityY: 300 };
        else if (type === 'shot_cyan') config = { speed: 0, scale: { start: 0.1, end: 0.8 }, alpha: { start: 0.6, end: 0 }, lifespan: 500, frequency: 150, duration: 600, particleTint: 0x00ffff, blendMode: 'ADD' };
        else if (type === 'shot_gold') {
            config = { speed: { min: 50, max: 150 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 800, quantity: 50, duration: 400, particleTint: 0xfbbf24, blendMode: 'ADD' };
            this.tweens.add({ targets: this.ballContainer, scale: 1.2, duration: 250, yoyo: true, ease: 'Sine.easeInOut' });
        }
        const p = this.add.particles(bx, by, 'ball_basic', config);
        this.particleSystems.push(p);
        if (type !== 'shot_gold') this.tweens.add({ targets: this.ballContainer, scale: 1.1, duration: 150, yoyo: true, ease: 'Quad.easeOut' });
        this.cameras.main.shake(100, 0.003); // Reduced shake
        this.time.delayedCall(600, () => { this.previewActive = false; });
    }

    runAnimationPreview(type) {
        const cx = this.mascotContainer.x;
        const cy = this.mascotContainer.y;
        if (type === 'anim_default') {
            const p = this.add.particles(cx, cy, 'ball_basic', { speed: { min: 100, max: 200 }, angle: { min: 0, max: 360 }, scale: { start: 0.3, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 800, quantity: 20, duration: 200, blendMode: 'ADD' });
            this.particleSystems.push(p);
            this.time.delayedCall(800, () => { this.previewActive = false; });
        } else if (type === 'anim_fire') {
            const p = this.add.particles(cx, cy, 'ball_basic', { speed: { min: 150, max: 350 }, angle: { min: -135, max: -45 }, scale: { start: 0.5, end: 0.1 }, alpha: { start: 1, end: 0 }, lifespan: 600, quantity: 40, duration: 300, blendMode: 'ADD', tint: [0xff0000, 0xffa500, 0xffff00] });
            this.particleSystems.push(p);
            this.time.delayedCall(800, () => { this.previewActive = false; });
        } else if (type === 'anim_electric') {
            const p = this.add.particles(cx, cy, 'ball_basic', { speed: { min: 200, max: 500 }, angle: { min: 0, max: 360 }, scale: { start: 0.1, end: 0.6 }, alpha: { start: 1, end: 0 }, lifespan: 400, quantity: 30, duration: 300, blendMode: 'ADD', tint: [0x00ffff, 0x0000ff] });
            this.particleSystems.push(p);
            const ring = this.add.circle(cx, cy, 10, 0x00ffff).setStrokeStyle(2, 0xffffff);
            this.tweens.add({ targets: ring, radius: 150, alpha: 0, duration: 400, onComplete: () => { ring.destroy(); this.previewActive = false; }});
        } else if (type === 'anim_ice') {
            const p = this.add.particles(cx, cy, 'ball_basic', { speed: { min: 50, max: 200 }, angle: { min: 0, max: 360 }, scale: { start: 0.4, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 1200, quantity: 50, duration: 400, blendMode: 'ADD', tint: [0xadd8e6, 0xffffff] });
            this.particleSystems.push(p);
            this.time.delayedCall(1200, () => { this.previewActive = false; });
        } else if (type === 'anim_neon') {
            const ring1 = this.add.circle(cx, cy, 20).setStrokeStyle(4, 0xd946ef);
            const ring2 = this.add.circle(cx, cy, 20).setStrokeStyle(2, 0x00ffff);
            this.tweens.add({ targets: ring1, radius: 200, alpha: 0, duration: 800, ease: 'Quad.easeOut' });
            this.tweens.add({ targets: ring2, radius: 250, alpha: 0, duration: 1000, ease: 'Quad.easeOut', onComplete: () => { ring1.destroy(); ring2.destroy(); this.previewActive = false; }});
        } else if (type === 'anim_energy') {
            const flash = this.add.circle(cx, cy, 50, 0xffffff, 1);
            this.tweens.add({ targets: flash, scale: 5, alpha: 0, duration: 600, ease: 'Expo.easeOut', onComplete: () => flash.destroy() });
            const p = this.add.particles(cx, cy, 'ball_basic', { speed: { min: 300, max: 600 }, angle: { min: 0, max: 360 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 800, quantity: 60, duration: 200, blendMode: 'ADD', tint: [0x10b981, 0x059669] });
            this.particleSystems.push(p);
            this.time.delayedCall(1000, () => { this.previewActive = false; });
        } else {
            this.previewActive = false;
        }
    }

    runTrailPreview(type) {
        const startX = this.ballContainer.x;
        let p = null;
        if (type !== 'trail_default') {
            const tint = type === 'trail_purple' ? 0xd946ef : 0x00ffff;
            p = this.add.particles(this.ballContainer.x, this.ballContainer.y, 'ball_basic', { scale: { start: 0.22, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 300, frequency: 15, particleTint: tint, blendMode: 'ADD' });
            this.particleSystems.push(p);
        }
        this.tweens.add({
            targets: this.ballContainer, x: startX + 90, angle: 180, duration: 350, yoyo: true, ease: 'Quad.easeInOut',
            onUpdate: () => { if (p) { p.setPosition(this.ballContainer.x, this.ballContainer.y); } },
            onComplete: () => { this.ballContainer.x = startX; this.ballContainer.angle = 0; if (p) p.stop(); this.previewActive = false; }
        });
    }

    confirmPurchase(item) {
        if (this.confirmPopup) return;
        this.confirmPopup = this.add.container(0, 0).setDepth(200);
        const overlay = this.add.graphics().fillStyle(0x000000, 0.8).fillRect(0, 0, this.width, this.height);
        overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.width, this.height), Phaser.Geom.Rectangle.Contains);
        this.confirmPopup.add(overlay);

        const w = 400, h = 210, px = (this.width - w) / 2, py = (this.height - h) / 2;
        const panel = this.add.graphics().fillStyle(0x0a0522, 0.95).lineStyle(2, 0xd946ef, 1).fillRoundedRect(px, py, w, h, 12).strokeRoundedRect(px, py, w, h, 12);
        this.confirmPopup.add(panel);

        this.confirmPopup.add(this.add.text(this.width / 2, py + 30, "ÖĞE SATIN ALMA", { font: '700 17px sans-serif', fill: '#ffffff', letterSpacing: 1 }).setOrigin(0.5));
        this.confirmPopup.add(this.add.text(this.width / 2, py + 80, `Bu öğeyi ${item.price} EZ karşılığında\nsatın almak istiyor musun?`, { font: '700 14px sans-serif', fill: '#cbd5e1', align: 'center', lineSpacing: 4 }).setOrigin(0.5));
        
        const btnW = 120, btnH = 34, cancelX = px + 50, cancelY = py + 140, confirmX = px + w - 50 - btnW, confirmY = py + 140;
        
        const cancelBg = this.add.graphics().fillStyle(0x1e293b, 1).fillRoundedRect(cancelX, cancelY, btnW, btnH, 6);
        this.confirmPopup.add(cancelBg);
        this.confirmPopup.add(this.add.text(cancelX + btnW / 2, cancelY + btnH / 2, "VAZGEÇ", { font: '700 12px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5));
        const cancelHit = this.add.rectangle(cancelX + btnW / 2, cancelY + btnH / 2, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, cancelHit);
        this.confirmPopup.add(cancelHit);
        cancelHit.on('pointerdown', () => { this.confirmPopup.destroy(); this.confirmPopup = null; });

        const purBg = this.add.graphics().fillStyle(0xfacc15, 1).fillRoundedRect(confirmX, confirmY, btnW, btnH, 6);
        this.confirmPopup.add(purBg);
        this.confirmPopup.add(this.add.text(confirmX + btnW / 2, confirmY + btnH / 2, "SATIN AL", { font: '700 12px sans-serif', fill: '#000000' }).setOrigin(0.5));
        const purHit = this.add.rectangle(confirmX + btnW / 2, confirmY + btnH / 2, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, purHit);
        this.confirmPopup.add(purHit);
        purHit.on('pointerdown', () => { this.confirmPopup.destroy(); this.confirmPopup = null; this.executePurchase(item); });
    }

    executePurchase(item) {
        if (this.coins >= item.price) {
            this.coins -= item.price;
            window.gameState.career.ez = this.coins;
            this.ezTextObj.setText(`${this.coins} EZ`);
            if (item.category === 'goalAnimation') window.gameState.customization.unlockedGoalAnimations.push(item.id);
            else window.gameState.customization.ownedItems.push(item.id);
            
            if (window.SaveManager) window.SaveManager.save();
            if (window.audioManager) window.audioManager.playSFX('achievement_unlock_sfx');
            this.createBottomSection();
            this.showToast(`✨ ${item.name.toUpperCase()} Satın Alındı!`);
        } else {
            this.showToast("❌ Yetersiz EZ bakiyesi!");
        }
    }

    equipItem(category, itemId) {
        window.gameState.customization.equipped[category] = itemId;
        this.preview[category] = itemId;
        this.createBottomSection();
        this.createPlayerProfile();
        this.showToast("👕 Öğe Kuşanıldı!");
    }

    exitScene(saveChanges) {
        if (!saveChanges) {
            window.gameState.customization.equipped = { ...this.equippedAtStart };
        } else {
            if (window.SaveManager) window.SaveManager.save();
        }
        this.particleSystems.forEach(sys => sys.destroy());
        this.particleSystems = [];
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => { this.scene.start(this.parentScene); });
    }

    showToast(message) {
        const toast = this.add.container(this.width / 2, 90).setDepth(300);
        const bg = this.add.graphics().fillStyle(0x02000a, 0.95).lineStyle(1.5, 0xd946ef, 1).fillRoundedRect(-150, -18, 300, 36, 6).strokeRoundedRect(-150, -18, 300, 36, 6);
        toast.add(bg);
        toast.add(this.add.text(0, 0, message, { font: '700 13px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        this.tweens.add({ targets: toast, y: 75, alpha: 0, duration: 1500, delay: 800, onComplete: () => toast.destroy() });
    }
}
