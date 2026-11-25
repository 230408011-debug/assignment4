class SplashScene extends Phaser.Scene {
    constructor() {
        super('SplashScene');
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        // 6. Scene Entry - Camera
        this.cameras.main.fadeIn(800, 0, 0, 0);
        // Extra Polish: Very slow camera zoom-in
        this.cameras.main.setZoom(1);
        this.tweens.add({
            targets: this.cameras.main,
            zoom: 1.05,
            duration: 15000,
            ease: 'Sine.easeOut'
        });

        // 3. Background: Subtle gradient shifting (dark purple ↔ blue)
        this.bgRect = this.add.graphics();
        this.drawBackground(0); // initial hue shift
        this.bgTweenObj = { shift: 0 };
        this.tweens.add({
            targets: this.bgTweenObj,
            shift: 1,
            duration: 4000,
            yoyo: true,
            repeat: -1,
            onUpdate: () => this.drawBackground(this.bgTweenObj.shift)
        });

        // 3. Background: Light streaks moving diagonally
        this.createLightStreaks();

        // 3. Background: Moving particles (slow floating)
        this.createParticles();

        // 2. Football under the logo with glow
        this.createFootball();

        // 1. Central Football Club Logo
        this.createLogo();

        // 5. Start Button
        this.createStartButton();
    }

    drawBackground(shift) {
        this.bgRect.clear();
        // Shift between a dark purple (0x1a0b2e) and a deep blue (0x0f172a)
        const topColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            {r: 10, g: 5, b: 21}, // dark background
            {r: 5, g: 15, b: 35}, 
            1, shift
        );
        const bottomColor = Phaser.Display.Color.Interpolate.ColorWithColor(
            {r: 88, g: 28, b: 135}, // 0x581c87
            {r: 30, g: 58, b: 138}, // 0x1e3a8a
            1, shift
        );
        
        const topC = Phaser.Display.Color.GetColor(topColor.r, topColor.g, topColor.b);
        const botC = Phaser.Display.Color.GetColor(bottomColor.r, bottomColor.g, bottomColor.b);

        this.bgRect.fillGradientStyle(topC, topC, botC, botC, 1);
        this.bgRect.fillRect(0, 0, this.width, this.height);
    }

    createLightStreaks() {
        const streakGraphics = this.add.graphics();
        
        for (let i = 0; i < 5; i++) {
            const streak = this.add.rectangle(
                Phaser.Math.Between(0, this.width),
                Phaser.Math.Between(-200, this.height),
                this.width * 1.5,
                Phaser.Math.Between(2, 10),
                0xffffff,
                Phaser.Math.FloatBetween(0.02, 0.1)
            );
            streak.setAngle(-45);
            streak.setBlendMode(Phaser.BlendModes.ADD);
            
            this.tweens.add({
                targets: streak,
                x: streak.x + 800,
                y: streak.y + 800,
                duration: Phaser.Math.Between(4000, 8000),
                repeat: -1,
                ease: 'Linear',
                onRepeat: () => {
                    streak.x = Phaser.Math.Between(-500, this.width);
                    streak.y = Phaser.Math.Between(-500, 0);
                }
            });
        }
    }

    createParticles() {
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, this.width);
            const y = Phaser.Math.Between(0, this.height);
            const radius = Phaser.Math.FloatBetween(1, 4);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.5);
            
            const p = this.add.circle(x, y, radius, 0xd8b4fe, alpha);
            p.setBlendMode(Phaser.BlendModes.ADD);
            p.setAlpha(0);

            // Entry fade in
            this.tweens.add({
                targets: p,
                alpha: alpha,
                duration: 2000,
                delay: Phaser.Math.Between(0, 1000)
            });

            // Float animation
            this.tweens.add({
                targets: p,
                y: y - Phaser.Math.Between(50, 150),
                x: x + Phaser.Math.Between(-30, 30),
                duration: Phaser.Math.Between(5000, 10000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            
            // Neon flicker
            if (Math.random() > 0.5) {
                this.tweens.add({
                    targets: p,
                    alpha: alpha * 0.2,
                    duration: Phaser.Math.Between(100, 400),
                    yoyo: true,
                    repeat: -1,
                    ease: 'Bounce.easeInOut'
                });
            }
        }
    }

    createFootball() {
        const cx = this.width / 2;
        const cy = this.height / 2 + 120;

        // Soft glow from below
        const ballGlow = this.add.graphics();
        ballGlow.fillGradientStyle(0xd946ef, 0xd946ef, 0x000000, 0x000000, 0.4, 0.4, 0, 0);
        ballGlow.fillEllipse(cx, cy + 40, 180, 40);
        ballGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Football
        // We'll use the procedural ball_basic generated in PreloadScene or the 3d ball
        const ball = this.add.image(cx, cy, 'ball_3d');
        if (!ball.texture || ball.texture.key === '__MISSING') {
            // Fallback if ball_3d isn't loaded
            ball.setTexture('ball_basic');
        }
        ball.setScale(2.5);

        // Small bounce loop
        this.tweens.add({
            targets: ball,
            y: cy - 15,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Continuous slow rotation
        this.tweens.add({
            targets: ball,
            angle: 360,
            duration: 20000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // Ball glow pulse
        this.tweens.add({
            targets: ballGlow,
            alpha: 0.1,
            scaleX: 0.8,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createLogo() {
        const cx = this.width / 2;
        const cy = this.height / 2 - 80;

        this.logoContainer = this.add.container(cx, cy);

        // Logo Glow
        const logoGlow = this.add.graphics();
        logoGlow.fillStyle(0x3b82f6, 0.3); // Blue glow
        logoGlow.fillCircle(0, 0, 150);
        logoGlow.setBlendMode(Phaser.BlendModes.ADD);

        // Shield / Base shape (metallic look)
        const shield = this.add.graphics();
        shield.lineStyle(10, 0xfacc15, 1); // Gold rim
        shield.fillStyle(0x0f172a, 1); // Dark blue center
        
        // Custom shield polygon
        shield.beginPath();
        shield.moveTo(0, -120);
        shield.lineTo(100, -80);
        shield.lineTo(90, 60);
        shield.lineTo(0, 140);
        shield.lineTo(-90, 60);
        shield.lineTo(-100, -80);
        shield.closePath();
        shield.fillPath();
        shield.strokePath();

        // Stripes on shield
        const stripes = this.add.graphics();
        stripes.fillStyle(0x581c87, 0.6); // Purple stripes
        for(let i = -70; i < 80; i+= 30) {
            stripes.fillRect(i, -60, 15, 160);
        }
        
        // Mask stripes to shield shape
        const shieldMaskShape = this.make.graphics();
        shieldMaskShape.beginPath();
        shieldMaskShape.moveTo(cx, cy - 120);
        shieldMaskShape.lineTo(cx + 100, cy - 80);
        shieldMaskShape.lineTo(cx + 90, cy + 60);
        shieldMaskShape.lineTo(cx, cy + 140);
        shieldMaskShape.lineTo(cx - 90, cy + 60);
        shieldMaskShape.lineTo(cx - 100, cy - 80);
        shieldMaskShape.closePath();
        shieldMaskShape.fillPath();
        const mask = shieldMaskShape.createGeometryMask();
        stripes.setMask(mask);

        // Text / Insignia
        const textFC = this.add.text(0, -20, "FURIO\nFC", {
            font: '700 49px sans-serif', fill: '#facc15', align: 'center',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        // 4. Lighting: Reflection streak
        this.reflection = this.add.rectangle(-150, 0, 30, 300, 0xffffff, 0.4);
        this.reflection.setAngle(30);
        this.reflection.setBlendMode(Phaser.BlendModes.ADD);
        this.reflection.setMask(mask);

        this.tweens.add({
            targets: this.reflection,
            x: 150,
            duration: 2500,
            repeat: -1,
            repeatDelay: 3000,
            ease: 'Power1'
        });

        this.logoContainer.add([logoGlow, shield, stripes, textFC]);

        // Entry animation
        this.logoContainer.setScale(0);
        this.logoContainer.setAlpha(0);
        
        this.tweens.add({
            targets: this.logoContainer,
            scale: 1,
            alpha: 1,
            duration: 1000,
            ease: 'Back.easeOut',
            delay: 300,
            onComplete: () => {
                // Floating and Breathing after entry
                this.tweens.add({
                    targets: this.logoContainer,
                    y: cy - 20,
                    duration: 3000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                this.tweens.add({
                    targets: this.logoContainer,
                    scale: 1.05,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Light glow pulsing
                this.tweens.add({
                    targets: logoGlow,
                    alpha: 0.6,
                    scale: 1.1,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    createStartButton() {
        const cx = this.width / 2;
        const cy = this.height - 100;

        this.btnContainer = this.add.container(cx, cy);

        // Button Glow
        const btnGlow = this.add.rectangle(0, 0, 260, 70, 0xd946ef, 0.15);
        btnGlow.setBlendMode(Phaser.BlendModes.ADD);
        
        // Button Box
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x000000, 0.6);
        btnBg.fillRoundedRect(-120, -30, 240, 60, 30);
        btnBg.lineStyle(3, 0xd946ef, 1);
        btnBg.strokeRoundedRect(-120, -30, 240, 60, 30);

        // Text
        const btnText = this.add.text(0, 0, "» START «", {
            font: '700 29px sans-serif', fill: '#ffffff', letterSpacing: 4
        }).setOrigin(0.5);

        // Interaction Hit Area
        const hitArea = this.add.rectangle(0, 0, 240, 60, 0xff0000, 0).setInteractive({useHandCursor: true});
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hitArea);

        this.btnContainer.add([btnGlow, btnBg, btnText, hitArea]);

        // Idle Pulse
        const idlePulse = this.tweens.add({
            targets: this.btnContainer,
            scale: 1.05,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const idleGlow = this.tweens.add({
            targets: btnGlow,
            alpha: 0.8,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.btnContainer.setAlpha(0);
        this.btnContainer.y = cy + 50;
        this.tweens.add({
            targets: this.btnContainer,
            alpha: 1,
            y: cy,
            duration: 800,
            ease: 'Power3',
            delay: 1000
        });

        // Hover & Click Events
        hitArea.on('pointerover', () => {
            idlePulse.pause();
            idleGlow.pause();
            
            this.tweens.add({
                targets: this.btnContainer,
                scale: 1.15,
                duration: 200,
                ease: 'Back.easeOut'
            });
            
            this.tweens.add({
                targets: btnGlow,
                alpha: 1,
                scaleX: 1.2,
                scaleY: 1.5,
                duration: 200
            });
            
            btnText.setFill('#fbcfe8'); // Lighter pink
        });

        hitArea.on('pointerout', () => {
            this.tweens.add({
                targets: this.btnContainer,
                scale: 1.05,
                duration: 200,
                ease: 'Power2',
                onComplete: () => idlePulse.resume()
            });
            
            this.tweens.add({
                targets: btnGlow,
                alpha: 0.4,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                onComplete: () => idleGlow.resume()
            });

            btnText.setFill('#ffffff');
        });

        hitArea.on('pointerdown', () => {
            // Quick feedback animation
            this.tweens.add({
                targets: this.btnContainer,
                scale: 0.95,
                duration: 100,
                yoyo: true
            });

            // Subtle screen shake
            this.cameras.main.shake(200, 0.005);
            
            // Transition out
            this.time.delayedCall(200, () => {
                this.cameras.main.fadeOut(500, 0, 0, 0);
                this.cameras.main.once('camerafadeoutcomplete', () => {
                    if (window.gameState && window.gameState.player && window.gameState.player.onboardingComplete) {
                        this.scene.start('MenuScene');
                    } else {
                        this.scene.start('OnboardingScene');
                    }
                });
            });
        });
    }
}
