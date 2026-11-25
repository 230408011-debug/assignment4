class PowerManager {
    constructor(scene) {
        this.scene = scene;
    }

    activatePower(player, type) {
        if (type === 'fireball') {
            this.triggerFireball(player);
        } else if (type === 'freeze') {
            this.triggerFreeze(player);
        }
    }

    triggerFireball(player) {
        const ball = this.scene.ball;

        // 1. FREEZE BALL TEMPORARILY
        ball.setVelocity(0, 0);
        ball.setAngularVelocity(0);
        ball.body.setAllowGravity(false); // Hover
        ball.setTint(0xff4400);

        // 2. TELEGRAPH TRAJECTORY (Visual Warning)
        const targetX = player.isLeftTeam ? this.scene.width : 0;
        // Aim slightly down to ensure it hits goal area
        const angle = Phaser.Math.Angle.Between(ball.x, ball.y, targetX, this.scene.height - 50);

        const warningLine = this.scene.add.graphics();
        warningLine.lineStyle(4, 0xff4400, 0.5);
        warningLine.lineBetween(ball.x, ball.y, ball.x + Math.cos(angle) * 1000, ball.y + Math.sin(angle) * 1000);

        // Warning Text
        const warnText = this.scene.add.text(ball.x, ball.y - 40, "!", {
            font: '900 32px sans-serif', fill: '#ff4400'
        }).setOrigin(0.5);

        // Shake for buildup
        this.scene.cameras.main.shake(400, 0.005);

        // 3. LAUNCH AFTER DELAY (REPLACED WITH TIMING BAR)
        this.startTimingBar(player, ball, angle, warningLine, warnText);
    }

    startTimingBar(player, ball, angle, warningLine, warnText) {
        const barWidth = 200;
        const barHeight = 20;
        const x = player.x;
        const y = player.y - 80;

        // Background
        const bg = this.scene.add.rectangle(x, y, barWidth, barHeight, 0x1e293b).setStrokeStyle(2, 0xffffff).setDepth(150);
        
        // Perfect Zone (Center)
        const perfectZoneWidth = 40;
        const perfectZone = this.scene.add.rectangle(x, y, perfectZoneWidth, barHeight, 0x22c55e).setDepth(150);

        // Needle
        const needle = this.scene.add.rectangle(x - barWidth/2, y, 4, barHeight + 10, 0xff0000).setDepth(150);

        // Needle Tween
        const tween = this.scene.tweens.add({
            targets: needle,
            x: x + barWidth/2,
            duration: 600, // Speed of timing bar
            yoyo: true,
            repeat: -1
        });

        const stopText = this.scene.add.text(x, y - 30, "VUR! (BOŞLUK / EKRAN)", {
            font: '16px sans-serif', fill: '#facc15', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(150);

        let stopped = false;
        
        const finishTiming = () => {
            if(stopped) return;
            stopped = true;
            tween.stop();

            const distFromCenter = Math.abs(needle.x - x);
            let multiplier = 0;

            if (distFromCenter <= perfectZoneWidth / 2) {
                // Perfect hit!
                multiplier = 1.5;
                this.scene.cameras.main.flash(200, 255, 255, 0);
                stopText.setText("MÜKEMMEL!");
                stopText.setColor('#22c55e');
            } else if (distFromCenter <= barWidth / 4) {
                // Good hit
                multiplier = 1.0;
                stopText.setText("İYİ!");
                stopText.setColor('#60a5fa');
            } else {
                // Weak hit
                multiplier = 0.5;
                stopText.setText("ZAYIF!");
                stopText.setColor('#ef4444');
            }

            this.scene.time.delayedCall(500, () => {
                bg.destroy();
                perfectZone.destroy();
                needle.destroy();
                stopText.destroy();
                this.launchFireball(player, ball, angle, multiplier, warningLine, warnText);
            });
        };

        // Keyboard Input
        const space = this.scene.input.keyboard.addKey('SPACE');
        space.once('down', finishTiming);

        // Touch / Click Input
        this.scene.input.once('pointerdown', finishTiming);

        // Fallback max time
        this.scene.time.delayedCall(3000, finishTiming);
    }

    launchFireball(player, ball, angle, multiplier, warningLine, warnText) {
        if (!ball.scene) return; // Safety check if scene changed

        ball.body.setAllowGravity(true);
        ball.clearTint();
        warningLine.destroy();
        warnText.destroy();

        // Launch! Speed based on timing accuracy
        const speed = 900 * multiplier;
        this.scene.physics.velocityFromRotation(angle, speed, ball.body.velocity);

        // Add spin
        ball.setAngularVelocity(player.isLeftTeam ? 800 : -800);

        // Trail Effect
        const particles = this.scene.add.particles(ball.x, ball.y, 'particle', {
            speed: 100,
            scale: { start: multiplier > 1 ? 1.5 : 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            tint: multiplier > 1 ? 0xfacc15 : 0xff4400,
            quantity: 20
        });
        particles.explode(20, ball.x, ball.y);

        this.scene.time.delayedCall(1000, () => particles.destroy());
    }

    triggerFreeze(player) {
        // Freeze opponent
        const opponent = player.isLeftTeam ? this.scene.enemy1 : this.scene.player;

        if (opponent) {
            opponent.speed = 0;
            opponent.sprite.setTint(0x00ffff);

            // Ice block visual
            const ice = this.scene.add.rectangle(opponent.x, opponent.y, 70, 70, 0x00ffff, 0.5);

            this.scene.time.delayedCall(2000, () => {
                opponent.speed = 300; // Restore speed
                opponent.sprite.clearTint();
                ice.destroy();
            });
        }
    }
}
