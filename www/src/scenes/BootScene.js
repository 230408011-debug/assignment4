class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        this.load.image('bg_stadium', 'assets/bg_stadium.png');
    }

    create() {
        try {
            // Ensure new root objects exist with safe defaults
            const defaults = {
                player: { name: 'Acemi Oyuncu', username: '', level: 1, xp: 0, overall: 50, attributes: { speed: 50, shooting: 50, passing: 50, physical: 50, dribbling: 50, stamina: 50 }, stats: {} },
                career: { ez: 1000, goals: 0, assists: 0, rating: 100, currentClubId: null, contract: null },
                customization: { equipped: { kit: 0, accessory: null, ball: 'ball_basic', goalAnimation: 'default_goal', expression: 'neutral' }, unlockedAccessories: [], unlockedBalls: ['ball_basic'], unlockedGoalAnimations: ['default_goal'], unlockedPowers: ['fireball'], colors: [{ primary: 0xe11d48, secondary: 0xffffff, accent: 0x000000 }, { primary: 0x2563eb, secondary: 0xffffff, accent: 0x000000 }] },
                playerDevelopment: {},
                socialMedia: { followers: 0, posts: [] },
                achievements: { unlockedLeagues: ['Amateur'], cupsWon: 0 },
                settings: { musicOn: true, sfxOn: true, brightness: 100, language: 'tr', accountLinked: false }
            };

            Object.keys(defaults).forEach(key => {
                if (!window.gameState[key]) {
                    window.gameState[key] = defaults[key];
                }
            });

            // Ensure nested defaults exist safely
            if (!window.gameState.player.attributes) {
                window.gameState.player.attributes = defaults.player.attributes;
            }
            if (!window.gameState.customization.equipped) {
                window.gameState.customization.equipped = defaults.customization.equipped;
            }

            // Clamp attribute values to 50-100 range
            const attrs = window.gameState.player.attributes;
            ['speed', 'shooting', 'passing', 'physical', 'dribbling', 'stamina'].forEach(k => {
                if (typeof attrs[k] !== 'number' || attrs[k] < 50) attrs[k] = 50;
                if (attrs[k] > 100) attrs[k] = 100;
            });

            // Recalculate overall from attributes
            window.gameState.player.overall = Math.round(
                (attrs.speed + attrs.shooting + attrs.passing + attrs.physical + attrs.dribbling + attrs.stamina) / 6
            );

            // Apply brightness setting
            document.body.style.filter = `brightness(${window.gameState.settings.brightness || 100}%)`;
        } catch (e) {
            console.error('BootScene: State initialization error', e);
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const cx = width / 2;
        const cy = height / 2;
        
        // Add multi-touch support for mobile controls (up to 4 simultaneous touches)
        if (this.input.manager.pointers.length < 4) {
            this.input.addPointer(2);
        }

        // --- ULTRA-STABLE CINEMATIC INTRO ---
        
        // 1. Cinematic Background
        const bg = this.add.image(cx, cy, 'bg_stadium');
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale * 1.05); 
        bg.setTint(0x333333); // Start dim
        bg.setOrigin(0.5);

        // Initialize Audio Manager globally
        if (typeof AudioManager !== 'undefined') {
            window.audioManager = new AudioManager(this);
        }

        // Elegant Slow Camera Sway
        this.tweens.add({
            targets: bg,
            x: cx + 15,
            y: cy + 5,
            duration: 12000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Cinematic Fade-in
        this.tweens.addCounter({
            from: 51,
            to: 255,
            duration: 2000,
            ease: 'Power2',
            onUpdate: (tween) => {
                const v = Math.floor(tween.getValue());
                bg.setTint(Phaser.Display.Color.GetColor(v, v, v));
            }
        });
        
        // 2. PREMIUM "TAP TO START" PANEL (Lightweight)
        const panelY = height - 100;
        
        const uiContainer = this.add.container(cx, panelY);
        uiContainer.setAlpha(0);

        // Holographic Background
        const bgRect = this.add.graphics();
        bgRect.fillStyle(0x0a0515, 0.8); 
        bgRect.fillRoundedRect(-160, -30, 320, 60, 15);
        
        // Neon Border
        const borderRect = this.add.graphics();
        borderRect.lineStyle(2, 0xc084fc, 0.8);
        borderRect.strokeRoundedRect(-160, -30, 320, 60, 15);
        
        // Text
        const btnText = this.add.text(0, 0, window.Localization ? window.Localization.translate('TAP_TO_START') : "TAP TO START", {
            font: '600 20px sans-serif',
            fill: '#ffffff',
            letterSpacing: 6
        }).setOrigin(0.5);

        uiContainer.add([bgRect, borderRect, btnText]);

        // Intro animation
        this.time.delayedCall(1000, () => {
            this.tweens.add({
                targets: uiContainer,
                alpha: 1,
                y: panelY - 10,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => {
                    // Floating animation
                    this.tweens.add({
                        targets: uiContainer,
                        y: panelY - 15,
                        duration: 2000,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });

                    // Border pulse
                    this.tweens.add({
                        targets: borderRect,
                        alpha: 0.4,
                        duration: 1200,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            });
        });

        // Interactive hit area
        const hitArea = this.add.zone(cx, cy, width, height).setInteractive();

        // 5. STABLE Interaction Transition
        let isTransitioning = false;

        hitArea.on('pointerdown', () => {
            if(isTransitioning) return;
            isTransitioning = true;

            // Simple, beautiful transition without heavy particles or shaders
            
            // Fade out UI
            this.tweens.add({ targets: uiContainer, scale: 1.2, alpha: 0, duration: 400, ease: 'Power2' });
            
            // Brighten background dynamically
            this.tweens.addCounter({
                from: 255, to: 100, duration: 1500, ease: 'Power2',
                onUpdate: (tween) => {
                    const v = Math.floor(tween.getValue());
                    bg.setTint(Phaser.Display.Color.GetColor(v, v, v));
                }
            });

            // Smooth Zoom Into Scene
            this.cameras.main.zoomTo(2.5, 2000, 'Sine.easeInOut');
            
            // White Screen Fade Overlay
            const flash = this.add.rectangle(cx, cy, width*3, height*3, 0xffffff).setAlpha(0).setDepth(1000);
            
            this.time.delayedCall(1000, () => {
                this.tweens.add({
                    targets: flash,
                    alpha: 1,
                    duration: 1000,
                    ease: 'Power2',
                    onComplete: () => {
                        this.cameras.main.zoom = 1; // Reset camera
                        this.scene.start('PreloadScene');
                    }
                });
            });
        });
    }
}
