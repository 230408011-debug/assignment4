class EndOfSeasonScene extends Phaser.Scene {
    constructor() {
        super('EndOfSeasonScene');
    }

    init(data) {
        this.cw = data.cw || (window.GameStateManager && window.GameStateManager.getCareerData());
        this.seasonStats = this.cw.seasonStats || { goals: 0, assists: 0, matchesPlayed: 0, avgRating: 0, cleanSheets: 0 };
        this.clubId = this.cw.currentClubId || this.cw.currentClub;
        this.club = window.TeamDatabase.getClub(this.clubId);
        this.league = window.TeamDatabase.getLeague(this.club.leagueId || this.club.league);
        this.seasonNumber = this.cw.currentSeason ? this.cw.currentSeason.number : (this.cw.currentSeason || 1);
        this.seasonText = `${2024 + this.seasonNumber - 1} / ${2024 + this.seasonNumber} SEZONU`;

        // Determine which screens to show
        this.screensQueue = [];
        this.wonCups = [];

        // Telemetry Event
        if (window.AnalyticsService) {
            window.AnalyticsService.track('season_completed', {
                season_number: this.seasonNumber
            });
        }
        
        // 1. League Champ
        if (this.cw.currentSeason && this.cw.currentSeason.standings) {
            const table = window.CareerManager ? window.CareerManager.getSortedTable(this.club.leagueId) : [];
            const myPos = table.findIndex(t => t.clubId === this.clubId) + 1;
            if (myPos === 1) {
                this.screensQueue.push('LEAGUE_CHAMP');
                this.wonCups.push('LEAGUE');
            }
        }

        // Helper to check cup winners
        const checkCupWinner = (cupKey) => {
            if (this.cw.cups && this.cw.cups[cupKey]) {
                const cup = this.cw.cups[cupKey];
                const finalRound = cup.rounds[cup.rounds.length - 1];
                if (finalRound && finalRound.matches && finalRound.matches.length > 0) {
                    const final = finalRound.matches[0];
                    if (final.completed) {
                        const winnerId = final.result === 'home' || final.result === 'home_pen' ? final.home : final.away;
                        if (winnerId === this.clubId) {
                            return final;
                        }
                    }
                }
            }
            return null;
        };

        // 2. Europe Cup
        const europaFinal = checkCupWinner('europa_cup');
        if (europaFinal) {
            this.screensQueue.push('EUROPE_CUP');
            this.europaFinal = europaFinal;
            this.wonCups.push('EUROPE_CUP');
        }

        // 3. Conference Cup
        const conferenceFinal = checkCupWinner('conference_cup');
        if (conferenceFinal) {
            this.screensQueue.push('CONFERENCE_CUP');
            this.conferenceFinal = conferenceFinal;
            this.wonCups.push('CONFERENCE_CUP');
        }

        // 4. Champions Cup
        const championsFinal = checkCupWinner('champions_cup');
        if (championsFinal) {
            this.screensQueue.push('CHAMPIONS_CUP');
            this.championsFinal = championsFinal;
            this.wonCups.push('CHAMPIONS_CUP');
        }

        // 5. Summary
        this.screensQueue.push('SUMMARY');
        
        // 6. New Season (Action)
        this.screensQueue.push('NEW_SEASON');
    }

    create() {
        this.cameras.main.fadeIn(300);
        this.W = this.cameras.main.width;
        this.H = this.cameras.main.height;
        this.cx = this.W / 2;
        this.cy = this.H / 2;

        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        this.createBackground();
        this.nextScreen();
    }

    createBackground() {
        const g = this.add.graphics();
        g.fillGradientStyle(0x020010, 0x020010, 0x08021a, 0x0a0325, 1);
        g.fillRect(0, 0, this.W, this.H);

        // Ambient particles
        if (this.textures.exists('particle')) {
            this.add.particles(0, 0, 'particle', {
                x: { min: 0, max: this.W },
                y: { min: 0, max: this.H },
                lifespan: { min: 2000, max: 4000 },
                speedY: { min: -10, max: 10 },
                speedX: { min: -10, max: 10 },
                scale: { start: 0.2, end: 0 },
                alpha: { start: 0.3, end: 0 },
                tint: [0xd946ef, 0x38bdf8, 0xfbbf24],
                blendMode: 'ADD',
                frequency: 100
            });
        }
        
        this.container = this.add.container(0, 0);
    }

    nextScreen() {
        if (this.screensQueue.length === 0) {
            this.finishEndOfSeason();
            return;
        }

        this.container.removeAll(true);
        const screenId = this.screensQueue.shift();

        // Slide in animation
        this.container.y = 50;
        this.container.alpha = 0;
        this.tweens.add({
            targets: this.container,
            y: 0,
            alpha: 1,
            duration: 400,
            ease: 'Power2'
        });

        switch (screenId) {
            case 'LEAGUE_CHAMP': this.buildLeagueChamp(); break;
            case 'EUROPE_CUP': this.buildCupChamp('europa_cup', this.europaFinal); break;
            case 'CONFERENCE_CUP': this.buildCupChamp('conference_cup', this.conferenceFinal); break;
            case 'CHAMPIONS_CUP': this.buildCupChamp('champions_cup', this.championsFinal); break;
            case 'SUMMARY': this.buildSummary(); break;
            case 'NEW_SEASON': this.buildNewSeason(); break;
        }
    }

    // ==========================================
    // UI BUILDER HELPERS
    // ==========================================
    createGlassPanel(x, y, w, h, borderColor = 0x1e293b, glowColor = null) {
        const bg = this.add.graphics();
        bg.fillStyle(0x050210, 0.85);
        bg.fillRoundedRect(x, y, w, h, 12);
        bg.lineStyle(2, borderColor, 0.8);
        bg.strokeRoundedRect(x, y, w, h, 12);
        
        if (glowColor) {
            const glow = this.add.graphics();
            glow.fillStyle(glowColor, 0.1);
            glow.fillRoundedRect(x, y, w, h, 12);
            this.container.add(glow);
        }
        
        this.container.add(bg);
        return bg;
    }

    addClubBadge(x, y, scale, clubInfo) {
        const color1 = clubInfo.primaryColor;
        const color2 = clubInfo.secondaryColor;
        this.container.add(this.add.circle(x, y, 40 * scale, color1).setStrokeStyle(4 * scale, color2));
        this.container.add(this.add.text(x, y, (clubInfo.name || 'C').charAt(0), { font: `900 ${36 * scale}px sans-serif`, fill: '#ffffff' }).setOrigin(0.5));
    }

    createContinueBtn(x, y, text) {
        const btnW = 240, btnH = 50;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xd946ef, 1);
        btnBg.fillRoundedRect(x - btnW/2, y - btnH/2, btnW, btnH, 25);
        
        const btnHit = this.add.rectangle(x, y, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, btnHit);
        
        const txt = this.add.text(x, y, text, { font: '700 17px sans-serif', fill: '#ffffff', letterSpacing: 1 }).setOrigin(0.5);
        
        this.container.add([btnBg, txt, btnHit]);

        btnHit.on('pointerover', () => { btnBg.clear(); btnBg.fillStyle(0xe879f9, 1); btnBg.fillRoundedRect(x - btnW/2, y - btnH/2, btnW, btnH, 25); });
        btnHit.on('pointerout', () => { btnBg.clear(); btnBg.fillStyle(0xd946ef, 1); btnBg.fillRoundedRect(x - btnW/2, y - btnH/2, btnW, btnH, 25); });
        btnHit.on('pointerdown', () => this.nextScreen());
    }

    renderTrophy(x, y, type) {
        let color = 0xfbbf24; // Default league gold
        if (type === 'champions_cup') color = 0x8b5cf6;
        else if (type === 'europa_cup') color = 0xf59e0b;
        else if (type === 'conference_cup') color = 0x22c55e;
        else if (type === 'cup') color = 0xfbbf24;
        this.container.add(this.add.circle(x, y, 90, color, 0.2));
        this.container.add(this.add.circle(x, y, 70, color, 0.4));
        this.container.add(this.add.circle(x, y, 50, color, 0.8));
        this.container.add(this.add.text(x, y, '🏆', { fontSize: '71px' }).setOrigin(0.5));
        
        if (this.textures.exists('particle')) {
            const em = this.add.particles(x, y + 50, 'particle', {
                speed: { min: 50, max: 150 },
                angle: { min: 200, max: 340 },
                scale: { start: 0.5, end: 0 },
                tint: color,
                blendMode: 'ADD',
                lifespan: 1500,
                frequency: 50
            });
            this.container.add(em);
        }
    }

    // ==========================================
    // 1. LEAGUE CHAMPION
    // ==========================================
    buildLeagueChamp() {
        this.container.add(this.add.text(this.cx, 50, 'LİG ŞAMPİYONLUĞU', { font: '700 16px sans-serif', fill: '#d946ef', letterSpacing: 2 }).setOrigin(0.5));
        const title = this.add.text(this.cx, 90, 'ŞAMPİYON OLDUN!', { font: '700 49px sans-serif', fill: '#fbbf24' }).setOrigin(0.5);
        title.setShadow(0, 0, '#fbbf24', 20, true, true);
        this.container.add(title);
        this.container.add(this.add.text(this.cx, 130, 'BİR SEZONLUK EFSANE. BİR ÖMÜRLÜK ZAFER.', { font: '600 12px sans-serif', fill: '#cbd5e1', letterSpacing: 1 }).setOrigin(0.5));

        // Center Trophy
        this.renderTrophy(this.cx, this.cy - 20, 'league');

        // Left Panel (Club Info)
        const lpX = this.cx - 400;
        const lpY = this.cy - 120;
        this.createGlassPanel(lpX, lpY, 280, 120, 0x38bdf8);
        this.addClubBadge(lpX + 60, lpY + 60, 1, this.club);
        this.container.add(this.add.text(lpX + 120, lpY + 40, this.club.name.toUpperCase(), { font: '700 23px sans-serif', fill: '#ffffff' }));
        this.container.add(this.add.text(lpX + 120, lpY + 70, `KULÜP KURULUŞU\n1889`, { font: '600 10px sans-serif', fill: '#94a3b8' }));

        this.createGlassPanel(lpX, lpY + 135, 280, 80, 0x1e293b);
        this.container.add(this.add.text(lpX + 20, lpY + 155, 'LİG BİLGİSİ', { font: '700 10px sans-serif', fill: '#d946ef' }));
        this.container.add(this.add.text(lpX + 20, lpY + 175, this.league.name.toUpperCase(), { font: '700 17px sans-serif', fill: '#ffffff' }));
        this.container.add(this.add.text(lpX + 20, lpY + 195, this.seasonText, { font: '600 12px sans-serif', fill: '#94a3b8' }));

        // Right Panel (Final Standings)
        const rpX = this.cx + 120;
        const rpY = this.cy - 120;
        this.createGlassPanel(rpX, rpY, 280, 220, 0x1e293b);
        this.container.add(this.add.text(rpX + 20, rpY + 20, 'FİNAL PUAN DURUMU', { font: '700 10px sans-serif', fill: '#d946ef' }));
        
        const table = window.CareerManager ? window.CareerManager.getSortedTable(this.club.leagueId) : [];
        const topTeams = table.slice(0, 5);
        
        topTeams.forEach((row, i) => {
            const yOff = rpY + 50 + i * 30;
            const isPlayer = row.clubId === this.clubId;
            
            if (isPlayer) {
                const hG = this.add.graphics();
                hG.fillStyle(0xfbbf24, 0.15);
                hG.fillRoundedRect(rpX + 10, yOff - 5, 260, 24, 4);
                this.container.add(hG);
            }
            
            const clubObj = window.TeamDatabase.getClub(row.clubId);
            this.container.add(this.add.text(rpX + 20, yOff, `${i + 1}`, { font: '700 13px sans-serif', fill: isPlayer ? '#ffffff' : '#94a3b8' }));
            this.container.add(this.add.text(rpX + 45, yOff, (clubObj ? clubObj.name : 'Club').toUpperCase(), { font: '800 12px sans-serif', fill: isPlayer ? '#fbbf24' : '#ffffff' }));
            
            this.container.add(this.add.text(rpX + 210, yOff, row.played, { font: '600 12px sans-serif', fill: '#cbd5e1' }).setOrigin(1, 0));
            this.container.add(this.add.text(rpX + 250, yOff, row.points, { font: '700 13px sans-serif', fill: '#ffffff' }).setOrigin(1, 0));
        });

        // Bottom Rewards
        const by = this.cy + 160;
        this.createGlassPanel(this.cx - 400, by, 250, 70, 0xfbbf24);
        this.container.add(this.add.text(this.cx - 380, by + 15, 'EZ ÖDÜLÜ', { font: '700 10px sans-serif', fill: '#fbbf24' }));
        this.container.add(this.add.text(this.cx - 380, by + 35, '+2.500 EZ', { font: '700 19px sans-serif', fill: '#fbbf24' }));
        
        this.createGlassPanel(this.cx - 130, by, 250, 70, 0xd946ef);
        this.container.add(this.add.text(this.cx - 110, by + 15, 'BONUS PUAN', { font: '700 10px sans-serif', fill: '#d946ef' }));
        this.container.add(this.add.text(this.cx - 110, by + 35, '+200 Puan', { font: '700 19px sans-serif', fill: '#d946ef' }));

        this.createGlassPanel(this.cx + 140, by, 250, 70, 0x38bdf8);
        this.container.add(this.add.text(this.cx + 160, by + 15, 'TARAFTAR DESTEĞİ', { font: '700 10px sans-serif', fill: '#38bdf8' }));
        this.container.add(this.add.text(this.cx + 160, by + 35, '+25%', { font: '700 19px sans-serif', fill: '#38bdf8' }));

        // Give Rewards
        if (!this.cw.currentSeason.rewardsClaimed) this.cw.currentSeason.rewardsClaimed = {};
        if (!this.cw.currentSeason.rewardsClaimed.leagueChamp) {
            this.cw.currentSeason.rewardsClaimed.leagueChamp = true;
            window.gameState.career.ez = (window.gameState.career.ez || this.cw.ez || 0) + 2500;
            this.cw.ez = window.gameState.career.ez;
            window.gameState.player.stats.reputation = Math.min(100, (window.gameState.player.stats.reputation || 50) + 10); // Reputation boost
        }

        this.createContinueBtn(this.cx, this.H - 50, 'DEVAM ET >');
    }

    // ==========================================
    // CUP CHAMPIONS
    // ==========================================
    buildCupChamp(cupKey, finalMatch) {
        if (!finalMatch) return;
        
        let color, titleText, cupName, ezReward, ptsReward, claimKey;
        
        if (cupKey === 'champions_cup') {
            color = 0x8b5cf6; // Deep purple/blue
            titleText = 'ŞAMPİYONU!';
            cupName = 'FURIO CHAMPIONS CUP';
            ezReward = 5000;
            ptsReward = 500;
            claimKey = 'championsCup';
        } else if (cupKey === 'europa_cup') {
            color = 0xf59e0b; // Gold/Silver
            titleText = 'ŞAMPİYONU!';
            cupName = 'FURIO EUROPE CUP';
            ezReward = 2500;
            ptsReward = 250;
            claimKey = 'europaCup';
        } else if (cupKey === 'conference_cup') {
            color = 0x22c55e; // Green
            titleText = 'ŞAMPİYONU!';
            cupName = 'FURIO CONFERENCE CUP';
            ezReward = 1500;
            ptsReward = 150;
            claimKey = 'conferenceCup';
        } else {
            color = 0xfbbf24;
            titleText = 'KUPA SENİN!';
            cupName = 'DOMESTIC CUP';
            ezReward = 1000;
            ptsReward = 100;
            claimKey = 'domCup';
        }
        
        this.container.add(this.add.text(this.cx, 50, cupName, { font: '700 16px sans-serif', fill: '#d946ef', letterSpacing: 2 }).setOrigin(0.5));
        const title = this.add.text(this.cx, 90, titleText, { font: '700 49px sans-serif', fill: `#${color.toString(16).padStart(6, '0')}` }).setOrigin(0.5);
        title.setShadow(0, 0, `#${color.toString(16).padStart(6, '0')}`, 20, true, true);
        this.container.add(title);
        
        this.renderTrophy(this.cx, this.cy - 20, cupKey);

        // Left Panel
        const lpX = this.cx - 400;
        const lpY = this.cy - 120;
        this.createGlassPanel(lpX, lpY, 280, 120, color);
        this.addClubBadge(lpX + 60, lpY + 60, 1, this.club);
        this.container.add(this.add.text(lpX + 120, lpY + 40, this.club.name.toUpperCase(), { font: '700 23px sans-serif', fill: '#ffffff' }));
        this.container.add(this.add.text(lpX + 120, lpY + 70, `${cupName}\n${this.seasonText}`, { font: '600 10px sans-serif', fill: '#94a3b8' }));

        // Right Panel (Match Result)
        const rpX = this.cx + 120;
        const rpY = this.cy - 120;
        this.createGlassPanel(rpX, rpY, 280, 150, 0x1e293b);
        this.container.add(this.add.text(rpX + 140, rpY + 20, `FİNAL SONUCU`, { font: '700 10px sans-serif', fill: '#d946ef' }).setOrigin(0.5));
        
        const oppId = finalMatch.home === this.clubId ? finalMatch.away : finalMatch.home;
        const oppClub = window.TeamDatabase.getClub(oppId);
        
        this.addClubBadge(rpX + 40, rpY + 60, 0.6, this.club);
        this.addClubBadge(rpX + 240, rpY + 60, 0.6, oppClub);
        
        const myScore = finalMatch.home === this.clubId ? finalMatch.homeScore : finalMatch.awayScore;
        const oppScore = finalMatch.home === this.clubId ? finalMatch.awayScore : finalMatch.homeScore;
        
        this.container.add(this.add.text(rpX + 140, rpY + 60, `${myScore} - ${oppScore}`, { font: '700 37px sans-serif', fill: '#ffffff' }).setOrigin(0.5));

        // Rewards
        const by = this.cy + 160;

        this.createGlassPanel(this.cx - 400, by, 250, 70, color);
        this.container.add(this.add.text(this.cx - 380, by + 15, 'EZ ÖDÜLÜ', { font: '700 10px sans-serif', fill: `#${color.toString(16).padStart(6, '0')}` }));
        this.container.add(this.add.text(this.cx - 380, by + 35, `+${ezReward} EZ`, { font: '700 19px sans-serif', fill: `#${color.toString(16).padStart(6, '0')}` }));
        
        this.createGlassPanel(this.cx - 130, by, 250, 70, 0xd946ef);
        this.container.add(this.add.text(this.cx - 110, by + 15, 'BONUS PUAN', { font: '700 10px sans-serif', fill: '#d946ef' }));
        this.container.add(this.add.text(this.cx - 110, by + 35, `+${ptsReward} Puan`, { font: '700 19px sans-serif', fill: '#d946ef' }));

        if (!this.cw.currentSeason.rewardsClaimed) this.cw.currentSeason.rewardsClaimed = {};
        if (!this.cw.currentSeason.rewardsClaimed[claimKey]) {
            this.cw.currentSeason.rewardsClaimed[claimKey] = true;
            window.gameState.career.ez = (window.gameState.career.ez || this.cw.ez || 0) + ezReward;
            this.cw.ez = window.gameState.career.ez;
            window.gameState.player.stats.reputation = Math.min(100, (window.gameState.player.stats.reputation || 50) + (isInternational ? 8 : 4));
        }

        this.createContinueBtn(this.cx, this.H - 50, 'DEVAM ET >');
    }

    // ==========================================
    // 4. SEASON SUMMARY
    // ==========================================
    buildSummary() {
        this.container.add(this.add.text(this.cx, 40, 'SEZON ÖZETİ', { font: '700 25px sans-serif', fill: '#ffffff', letterSpacing: 2 }).setOrigin(0.5));
        this.container.add(this.add.text(this.cx, 70, this.seasonText, { font: '700 14px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
        
        // Left Panel (Trophies Won)
        const lpX = this.cx - 300;
        const lpY = this.cy - 70;
        this.createGlassPanel(lpX - 140, lpY - 100, 280, 220, 0x1e293b);
        this.container.add(this.add.text(lpX, lpY - 80, 'KAZANILAN KUPALAR', { font: '700 12px sans-serif', fill: '#d946ef' }).setOrigin(0.5));
        
        if (this.wonCups && this.wonCups.length > 0) {
            this.wonCups.forEach((cup, idx) => {
                const yOff = lpY - 40 + (idx * 40);
                const color = cup === 'LEAGUE' ? '#fbbf24' : (cup === 'CHAMPIONS_CUP' ? '#8b5cf6' : (cup === 'EUROPE_CUP' ? '#f59e0b' : '#22c55e'));
                const name = cup === 'LEAGUE' ? this.league.name.toUpperCase() : (cup === 'CHAMPIONS_CUP' ? 'FURIO CHAMPIONS CUP' : (cup === 'EUROPE_CUP' ? 'FURIO EUROPE CUP' : 'FURIO CONFERENCE CUP'));
                
                this.container.add(this.add.text(lpX - 100, yOff, '🏆', { font: '18px sans-serif' }).setOrigin(0.5));
                this.container.add(this.add.text(lpX - 70, yOff, name, { font: '800 12px sans-serif', fill: color }).setOrigin(0, 0.5));
            });
        } else {
            this.container.add(this.add.text(lpX, lpY, 'Bu sezon kupa kazanılamadı.', { font: '600 12px sans-serif', fill: '#64748b' }).setOrigin(0.5));
        }

        // Center Panel (Club)
        this.addClubBadge(this.cx, this.cy - 40, 1.2, this.club);
        this.container.add(this.add.text(this.cx, this.cy + 30, this.club.name.toUpperCase(), { font: '700 25px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        
        let starsStr = '';
        const starCount = Math.min(5, Math.max(1, (this.wonCups ? this.wonCups.length : 0) + 2));
        for(let i=0; i<starCount; i++) starsStr += '★ ';
        this.container.add(this.add.text(this.cx, this.cy + 60, starsStr.trim(), { font: '700 17px sans-serif', fill: '#fbbf24' }).setOrigin(0.5));
        this.container.add(this.add.text(this.cx, this.cy + 85, 'SEZON TAMAMLANDI', { font: '700 12px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5));

        // Right Panel (Player Stats)
        const rpX = this.cx + 300;
        const rpY = this.cy - 70;
        this.createGlassPanel(rpX - 140, rpY - 100, 280, 220, 0x1e293b);
        this.container.add(this.add.text(rpX, rpY - 80, 'SEZONUN ÖNE ÇIKAN OYUNCUSU', { font: '700 12px sans-serif', fill: '#d946ef' }).setOrigin(0.5));
        
        const playerName = window.gameState.player.username || window.gameState.player.name || 'Oyuncu';
        if (this.textures.exists('player1')) {
            this.container.add(this.add.image(rpX, rpY - 20, 'player1').setScale(1.5));
        } else {
            this.container.add(this.add.circle(rpX, rpY - 20, 30, 0x334155));
        }
        
        this.container.add(this.add.text(rpX, rpY + 30, playerName.toUpperCase(), { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        this.container.add(this.add.text(rpX, rpY + 50, window.gameState.player.position || 'FORVET', { font: '700 10px sans-serif', fill: '#fbbf24' }).setOrigin(0.5));
        
        const pStatsY = rpY + 80;
        this.container.add(this.add.text(rpX - 90, pStatsY, 'MAÇ', { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
        this.container.add(this.add.text(rpX - 90, pStatsY + 20, this.seasonStats.matchesPlayed, { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        
        this.container.add(this.add.text(rpX - 30, pStatsY, 'GOL', { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
        this.container.add(this.add.text(rpX - 30, pStatsY + 20, this.seasonStats.goals, { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        
        this.container.add(this.add.text(rpX + 30, pStatsY, 'ASİST', { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
        this.container.add(this.add.text(rpX + 30, pStatsY + 20, this.seasonStats.assists, { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        
        this.container.add(this.add.text(rpX + 90, pStatsY, 'ORT', { font: '600 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
        this.container.add(this.add.text(rpX + 90, pStatsY + 20, this.seasonStats.avgRating.toFixed(1), { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0.5));

        // Bottom Panel (Team Stats)
        const bpY = this.cy + 170;
        this.createGlassPanel(this.cx - 440, bpY - 40, 880, 80, 0x1e293b);
        
        const table = window.CareerManager ? window.CareerManager.getSortedTable(this.club.leagueId) : [];
        const myRow = table.find(t => t.clubId === this.clubId) || { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 };
        
        const tStats = [
            { l: 'OYNANAN MAÇ', v: myRow.played },
            { l: 'GALİBİYET', v: myRow.wins || myRow.won || 0 },
            { l: 'BERABERLİK', v: myRow.draws || myRow.drawn || 0 },
            { l: 'MAĞLUBİYET', v: myRow.losses || myRow.lost || 0 },
            { l: 'ATILAN GOL', v: myRow.goalsFor || myRow.gf || 0 },
            { l: 'YENİLEN GOL', v: myRow.goalsAgainst || myRow.ga || 0 }
        ];
        
        const spacing = 880 / 6;
        tStats.forEach((st, idx) => {
            const sx = (this.cx - 440) + (spacing / 2) + (idx * spacing);
            this.container.add(this.add.text(sx, bpY - 15, st.l, { font: '700 10px sans-serif', fill: '#94a3b8' }).setOrigin(0.5));
            this.container.add(this.add.text(sx, bpY + 15, st.v, { font: '700 25px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        });

        this.createContinueBtn(this.cx, this.H - 50, 'YENİ SEZONA GEÇ >');
    }

    // ==========================================
    // 5. AWARDS
    // ==========================================
    buildAwards() {
        this.container.add(this.add.text(this.cx, 50, 'SEZON ÖDÜLLERİ', { font: '700 16px sans-serif', fill: '#d946ef', letterSpacing: 2 }).setOrigin(0.5));
        const title = this.add.text(this.cx, 90, 'YILDIZLAR GECESİ', { font: '700 49px sans-serif', fill: '#fbbf24' }).setOrigin(0.5);
        title.setShadow(0, 0, '#fbbf24', 20, true, true);
        this.container.add(title);
        
        this.renderTrophy(this.cx, this.cy, 'league'); // central trophy visual
        
        const playerName = window.gameState.player.username || window.gameState.player.name || 'Oyuncu';
        
        // Let's create award cards
        const createAwardCard = (x, y, title, val, icon) => {
            this.createGlassPanel(x, y, 260, 70, 0x334155);
            this.container.add(this.add.text(x + 70, y + 10, title, { font: '700 10px sans-serif', fill: '#d946ef' }));
            this.container.add(this.add.text(x + 70, y + 25, playerName, { font: '700 15px sans-serif', fill: '#ffffff' }));
            this.container.add(this.add.text(x + 70, y + 45, this.club.name.toUpperCase(), { font: '600 10px sans-serif', fill: '#94a3b8' }));
            
            this.container.add(this.add.text(x + 240, y + 25, val.toString(), { font: '700 19px sans-serif', fill: '#fbbf24' }).setOrigin(1, 0.5));
            this.container.add(this.add.text(x + 240, y + 45, icon, { font: '700 10px sans-serif', fill: '#94a3b8' }).setOrigin(1, 0.5));
        };

        createAwardCard(this.cx - 400, this.cy - 120, 'GOL KRALI', this.seasonStats.goals, 'GOL');
        createAwardCard(this.cx - 400, this.cy - 30, 'ASİST USTASI', this.seasonStats.assists, 'ASİST');
        createAwardCard(this.cx - 400, this.cy + 60, 'EN İYİ ORTALAMA', this.seasonStats.avgRating.toFixed(1), 'ORTALAMA');
        
        createAwardCard(this.cx + 140, this.cy - 120, 'SEZONUN OYUNCUSU', '1.', 'SIRA');
        createAwardCard(this.cx + 140, this.cy - 30, 'TARAFTARIN FAVORİSİ', '%98', 'DESTEK');

        if (!this.cw.currentSeason.rewardsClaimed.awards) {
            this.cw.currentSeason.rewardsClaimed.awards = true;
            let bonusEZ = 0;
            if (this.seasonStats.goals > 15) bonusEZ += 500;
            if (this.seasonStats.assists > 10) bonusEZ += 500;
            if (this.seasonStats.avgRating > 8.0) bonusEZ += 500;
            window.gameState.career.ez = (window.gameState.career.ez || this.cw.ez || 0) + bonusEZ;
            this.cw.ez = window.gameState.career.ez;
        }

        this.createContinueBtn(this.cx, this.H - 50, 'DEVAM ET >');
    }

    // ==========================================
    // 6. NEW SEASON
    // ==========================================
    buildNewSeason() {
        this.container.add(this.add.text(this.cx, 50, 'YENİ SEZON', { font: '700 16px sans-serif', fill: '#22c55e', letterSpacing: 2 }).setOrigin(0.5));
        const title = this.add.text(this.cx, 90, 'YENİ BİR HİKAYE BAŞLIYOR', { font: '700 49px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        title.setShadow(0, 0, '#ffffff', 20, true, true);
        this.container.add(title);
        
        const offersCount = (this.cw.currentSeason.transferOffers || []).length;
        
        this.createGlassPanel(this.cx - 200, this.cy - 100, 400, 200, 0x1e293b);
        this.container.add(this.add.text(this.cx, this.cy - 70, 'TRANSFER DÖNEMİ AÇILDI!', { font: '700 25px sans-serif', fill: '#38bdf8' }).setOrigin(0.5));
        this.container.add(this.add.text(this.cx, this.cy - 30, `Bekleyen Teklif Sayısı: ${offersCount}`, { font: '700 16px sans-serif', fill: '#ffffff' }).setOrigin(0.5));
        this.container.add(this.add.text(this.cx, this.cy + 10, 'Kulübünde kalabilir veya gelen teklifleri değerlendirip\nyeni bir maceraya atılabilirsin.', { font: '600 12px sans-serif', fill: '#94a3b8', align: 'center' }).setOrigin(0.5));

        this.createContinueBtn(this.cx, this.H - 50, 'KARİYER MERKEZİNE DÖN >');
    }

    finishEndOfSeason() {
        // Give control back to CareerWorldScene, and trigger new season
        window.CareerManager.startNewSeason();
        window.SaveManager.save();
        this.scene.start('CareerWorldScene');
    }
}
