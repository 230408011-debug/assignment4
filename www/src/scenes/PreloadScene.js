class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        // Cinematic Background from BootScene
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const bg = this.add.image(width / 2, height / 2, 'bg_stadium');
        const scale = Math.max(width / bg.width, height / bg.height);
        bg.setScale(scale * 1.05);

        this.createLoadingBar();

        // Instead of loading images, we procedurally generate round balls to ensure perfect transparency
        // We will generate them below with the other procedural graphics.

        this.load.image('field', 'assets/field.png');
        this.load.image('goal', 'assets/goal.png');
        this.load.image('scoreboard', 'assets/scoreboard.png');
        
        // High Quality Assets
        this.load.image('bg_stadium', 'assets/bg_stadium.png');
        this.load.image('ball_3d', 'assets/ball_3d.png');

        // Audio System Assets (Missing ones commented out for stability)
        this.load.audio('coin_reward_ez_collect', 'assets/audio/coin_reward_ez_collect.mp3');
        this.load.audio('crowd_ambience_loop', 'assets/audio/furio_fc_taraftar_gameplay_loop.mp3');
        this.load.audio('goal_celebration', 'assets/audio/goal_celebration.mp3');
        this.load.audio('kick', 'assets/audio/kick.mp3');
        this.load.audio('level_up', 'assets/audio/level_up.mp3');
        this.load.audio('slot_no_reward_soft', 'assets/audio/slot_no_reward_soft.mp3');
        this.load.audio('slot_reel_stop_clack', 'assets/audio/slot_reel_stop_clack.mp3');
        this.load.audio('slot_spin_realistic_reels', 'assets/audio/slot_spin_realistic_reels.mp3');
        this.load.audio('slot_win_reward_jingle', 'assets/audio/slot_win_reward_jingle.mp3');
        this.load.audio('button_click', 'assets/audio/button_click.mp3');
        this.load.audio('achievement_unlock_sfx', 'assets/audio/achievement_unlock_sfx.mp3');
        this.load.audio('powerup', 'assets/audio/powerup.mp3');

        const p1Graphics = this.make.graphics({ x: 0, y: 0, add: false });
        p1Graphics.fillStyle(0xff0000, 1);
        p1Graphics.fillCircle(30, 30, 30);
        p1Graphics.generateTexture('player1', 60, 60);

        const p2Graphics = this.make.graphics({ x: 0, y: 0, add: false });
        p2Graphics.fillStyle(0x0000ff, 1);
        p2Graphics.fillCircle(30, 30, 30);
        p2Graphics.generateTexture('player2', 60, 60);

        const groundGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        groundGraphics.fillStyle(0x4ade80, 1);
        groundGraphics.fillRect(0, 0, 32, 32);
        groundGraphics.generateTexture('ground', 32, 32);

        const goalGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        goalGraphics.fillStyle(0xe2e8f0, 1); // Lighter color for visibility
        goalGraphics.fillRect(0, 0, 20, 300); // Thicker and taller
        goalGraphics.lineStyle(4, 0x94a3b8);
        goalGraphics.strokeRect(0, 0, 20, 300);
        goalGraphics.generateTexture('goal_fallback', 20, 300);

        const particle = this.make.graphics({ x: 0, y: 0, add: false });
        particle.fillStyle(0xffffff, 1);
        particle.fillRect(0, 0, 4, 4);
        particle.generateTexture('particle', 4, 4);

        // --- PROCEDURAL BALL PROGRESSION TIERS ---
        
        // 1. BASIC BALL (Level 1)
        const bf = this.make.graphics({ x: 0, y: 0, add: false });
        bf.fillStyle(0xffffff, 1);
        bf.fillCircle(18, 18, 18);
        bf.lineStyle(2, 0x000000, 1);
        bf.strokeCircle(18, 18, 18);
        bf.fillStyle(0x000000, 1);
        bf.fillCircle(18, 18, 6);
        bf.fillCircle(6, 10, 4);
        bf.fillCircle(30, 10, 4);
        bf.fillCircle(10, 28, 4);
        bf.fillCircle(26, 28, 4);
        bf.generateTexture('ball_basic', 36, 36);

        // 2. STREET BALL (Level 2)
        const bs = this.make.graphics({ x: 0, y: 0, add: false });
        bs.fillStyle(0x4b5563, 1); // Darker gray
        bs.fillCircle(18, 18, 18);
        bs.lineStyle(2, 0x111827, 1);
        bs.strokeCircle(18, 18, 18);
        bs.fillStyle(0xf3f4f6, 0.3); // Worn texture
        for(let i=0; i<8; i++) {
            bs.fillCircle(Math.random()*36, Math.random()*36, 2);
        }
        bs.generateTexture('ball_street', 36, 36);

        // 3. NEON BALL (Level 3)
        const bn = this.make.graphics({ x: 0, y: 0, add: false });
        bn.fillStyle(0x000000, 1);
        bn.fillCircle(18, 18, 18);
        bn.lineStyle(3, 0x22d3ee, 1); // Cyan neon
        bn.strokeCircle(18, 18, 17);
        bn.fillStyle(0x22d3ee, 0.4);
        bn.fillCircle(18, 18, 10);
        bn.fillStyle(0xffffff, 0.8);
        bn.fillCircle(18, 18, 4);
        bn.generateTexture('ball_neon', 36, 36);

        // 4. FIRE BALL (Level 4)
        const bfire = this.make.graphics({ x: 0, y: 0, add: false });
        bfire.fillStyle(0xe11d48, 1); // Crimson
        bfire.fillCircle(18, 18, 18);
        bfire.fillStyle(0xfb923c, 1); // Orange
        bfire.fillCircle(18, 18, 12);
        bfire.fillStyle(0xfacc15, 1); // Yellow
        bfire.fillCircle(18, 18, 6);
        bfire.lineStyle(2, 0xffffff, 0.5);
        bfire.strokeCircle(18, 18, 18);
        bfire.generateTexture('ball_fire', 36, 36);

        // 5. LEGENDARY BALL (Level 5)
        const bl = this.make.graphics({ x: 0, y: 0, add: false });
        bl.fillStyle(0x1e1b4b, 1); // Deep indigo
        bl.fillCircle(18, 18, 18);
        bl.lineStyle(3, 0xfacc15, 1); // Gold rim
        bl.strokeCircle(18, 18, 17);
        // Star pattern
        bl.fillStyle(0xfacc15, 1);
        const points = [];
        for(let i=0; i<10; i++) {
            const r = i % 2 === 0 ? 12 : 5;
            const a = (i * Math.PI) / 5 - Math.PI/2;
            points.push(18 + Math.cos(a) * r, 18 + Math.sin(a) * r);
        }
        bl.fillPoints(points, true);
        bl.generateTexture('ball_legendary', 36, 36);

        // --- LEGACY BALLS (Keep for compatibility if needed) ---
        // Generatng these just in case any level code still references them
        bf.generateTexture('ball_football', 36, 36);
        bfire.generateTexture('ball_basketball', 36, 36);
        bn.generateTexture('ball_tennis', 36, 36);
        bf.generateTexture('ball_beach', 36, 36);

        // Procedural generation is fast, so we don't need fake loading time.
        // If we want a delay for effect, we can use a timer in create()
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // --- TOP LEFT: INITIALIZING SYSTEM ---
        this.add.text(40, 30, "INITIALIZING SYSTEM", {
            font: '600 12px sans-serif',
            fill: '#c084fc', // Purple
            letterSpacing: 2
        });

        const barWidth = 200;
        const barHeight = 4;
        const bgBar = this.add.rectangle(40, 55, barWidth, barHeight, 0x1e1b4b).setOrigin(0, 0.5);
        const progressBar = this.add.rectangle(40, 55, 0, barHeight, 0xc084fc).setOrigin(0, 0.5);
        
        const percentText = this.add.text(40 + barWidth + 15, 55, "0%", {
            font: '400 12px sans-serif',
            fill: '#ffffff'
        }).setOrigin(0, 0.5);

        // --- TOP RIGHT: CONNECTING TO SERVERS ---
        const connectText = this.add.text(width - 40, 30, "CONNECTING TO SERVERS   ", {
            font: '600 12px sans-serif',
            fill: '#94a3b8',
            letterSpacing: 2
        }).setOrigin(1, 0);

        // Dots animation
        let dotCount = 0;
        const dotTimer = this.time.addEvent({
            delay: 400,
            loop: true,
            callback: () => {
                dotCount = (dotCount + 1) % 4;
                connectText.setText("CONNECTING TO SERVERS" + ".".repeat(dotCount));
            }
        });

        // --- BOTTOM LEFT: VERSION ---
        this.add.text(40, height - 30, "VERSION 1.0.0", {
            font: '400 10px sans-serif',
            fill: '#475569',
            letterSpacing: 2
        }).setOrigin(0, 1);

        // --- BOTTOM RIGHT: COPYRIGHT ---
        this.add.text(width - 40, height - 30, "© 2024 FURIO FOOTBALL CLUB", {
            font: '400 10px sans-serif',
            fill: '#475569',
            letterSpacing: 2
        }).setOrigin(1, 1);

        this.load.on('progress', (value) => {
            progressBar.width = barWidth * value;
            percentText.setText(Math.floor(value * 100) + "%");
        });

        this.load.on('complete', () => {
            dotTimer.remove();
            connectText.setText("CONNECTED");
            percentText.setText("100%");
            progressBar.width = barWidth;
        });
    }

    create() {
        // Generate a simple white circle texture for particles
        const gfx = this.make.graphics({x: 0, y: 0, add: false});
        gfx.fillStyle(0xffffff, 1);
        gfx.fillCircle(8, 8, 8);
        gfx.generateTexture('particle', 16, 16);

        // Simulate a fake loading time to let the user enjoy the premium cinematic loading screen
        const fakeLoadTime = 3000;
        
        let progress = 0;
        const progressTimer = this.time.addEvent({
            delay: 30,
            repeat: 100,
            callback: () => {
                progress += 0.01;
                this.load.emit('progress', Math.min(progress, 1));
            }
        });

        this.time.delayedCall(fakeLoadTime, () => {
            this.load.emit('complete');
            this.time.delayedCall(500, () => {
                if (!window.gameState.player.username) {
                    this.scene.start('OnboardingScene');
                } else {
                    this.scene.start('MenuScene');
                }
            });
        });
    }
}
