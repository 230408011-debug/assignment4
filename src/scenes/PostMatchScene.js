class PostMatchScene extends Phaser.Scene {
    constructor() {
        super('PostMatchScene');
    }

    init(data) {
        this.leveledUp = false;
        const activeMatch = window.gameState.activeMatch;
        this.userIsHome = activeMatch?.userSide !== 'away';
        this.matchStats = data || { scoreLeft: 0, scoreRight: 0, isWin: false, isDraw: true };
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        this.cameras.main.fadeIn(400);
        
        // 1. Process Match Rewards & Career Engine State
        this.evaluateObjectives();
        
        // 2. Render UI Layout
        this.createBackground();
        this.createHeader();
        
        const cx = this.width / 2;
        const cy = this.height / 2;
        
        // Responsive vertical offset
        const contentTopY = Math.max(110, cy - 230);
        
        // Render 4 Main Panels
        // Left Column: Match Stats
        this.createStatsPanel(cx - 300, contentTopY + 160);
        
        // Right Column: MOTM & Rewards (Top) + Summary (Bottom)
        this.createMotmPanel(cx + 60, contentTopY + 70);
        this.createRewardsPanel(cx + 340, contentTopY + 70);
        this.createSummaryPanel(cx + 200, contentTopY + 235);

        // 3. Render Responsive Continue Button
        this.createContinueButton();
        
        // 4. Level up popup if applicable
        this.checkLevelUp();
    }

    evaluateObjectives() {
        this.earnedCoins = 0;
        this.earnedXp = 0;
        
        const activeMatch = window.gameState && window.gameState.activeMatch;
        const cw = window.gameState && window.gameState.career;
        const myScore = this.matchStats.scoreLeft;
        const oppScore = this.matchStats.scoreRight;
        this.homeScore = this.userIsHome ? myScore : oppScore;
        this.awayScore = this.userIsHome ? oppScore : myScore;

        this.isWin = myScore > oppScore;
        this.isDraw = myScore === oppScore;
        this.isLoss = myScore < oppScore;

        let userGoals = this.matchStats.userStats ? (this.matchStats.userStats.goals || 0) : 0;
        
        // Process career match rewards cleanly from contract
        if (activeMatch && cw && cw.contract) {
            const matchBonus = cw.contract.matchBonus || 30;
            const goalBonus = cw.contract.goalBonus || 15;

            if (this.isWin) {
                this.earnedCoins += matchBonus;
                this.earnedXp += 60;
            } else if (this.isDraw) {
                this.earnedCoins += Math.floor(matchBonus / 2);
                this.earnedXp += 30;
            } else {
                this.earnedCoins += Math.floor(matchBonus / 4);
                this.earnedXp += 15;
            }

            if (userGoals > 0) {
                this.earnedCoins += userGoals * goalBonus;
                this.earnedXp += userGoals * 20;
            }

            if (oppScore === 0) {
                this.earnedCoins += Math.floor(matchBonus / 2);
                this.earnedXp += 25;
            }
        } else {
            // Casual match fallback
            if (this.isWin) { this.earnedCoins += 50; this.earnedXp += 50; }
            else if (this.isDraw) { this.earnedCoins += 25; this.earnedXp += 25; }
            else { this.earnedCoins += 15; this.earnedXp += 15; }
        }

        const objective = activeMatch?.objective;
        this.objectiveResult = null;
        if (objective) {
            const progress = Math.min(objective.target, this.matchStats.userStats?.[objective.stat] ?? 0);
            const completed = progress === objective.target;
            this.objectiveResult = { ...objective, progress, completed };
            if (completed) {
                this.earnedCoins += objective.ez;
                this.earnedXp += objective.xp;
            }
        }

        // Form change calculation (Deterministic based on result, zero random -5!)
        let ratingChange = 0;
        if (this.isWin) {
            ratingChange = 15 + ((myScore - oppScore) * 2);
        } else if (this.isDraw) {
            ratingChange = (oppScore === 0) ? 5 : 0; // Clean sheet draw earns +5, otherwise neutral 0
        } else {
            ratingChange = -10 - ((oppScore - myScore) * 2);
        }
        
        this.ratingChange = ratingChange;

        const fixture = activeMatch?.fixtureId
            ? cw?.fixtures?.find(match => match.id === activeMatch.fixtureId)
            : cw?.fixtures?.[activeMatch?.scheduleIndex];
        const applyRewards = !activeMatch || (
            activeMatch.status !== 'completed' && fixture && !fixture.completed &&
            fixture.home === activeMatch.homeTeamId && fixture.away === activeMatch.awayTeamId
        );

        if (applyRewards && cw) {
            cw.rating = Math.max(0, (cw.rating ?? 100) + ratingChange);
        }
        // Apply EZ coins and Player XP
        if (applyRewards && cw) cw.ez = (cw.ez || 0) + this.earnedCoins;
        if (applyRewards && window.gameState.player) {
            window.gameState.player.xp = (window.gameState.player.xp || 0) + this.earnedXp;
            
            // Level up check
            const xpNeeded = (window.gameState.player.level || 1) * 1000;
            if (window.gameState.player.xp >= xpNeeded) {
                window.gameState.player.level = (window.gameState.player.level || 1) + 1;
                window.gameState.player.xp -= xpNeeded;
                this.leveledUp = true;
            }
        }

        // Attach structured rewards data for subsequent scenes (SocialMediaScene)
        this.matchStats.rewards = {
            earnedCoins: this.earnedCoins,
            earnedXp: this.earnedXp,
            matchBonus: (cw && cw.contract && cw.contract.matchBonus) || 30,
            goalBonus: (cw && cw.contract && cw.contract.goalBonus) || 15,
            userGoals: userGoals,
            cleanSheet: oppScore === 0,
            competition: (activeMatch && activeMatch.competition) || 'Lig'
        };

        // Send actual result to CareerManager
        if (applyRewards && activeMatch && fixture) {
            let userAssists = this.matchStats.userStats ? (this.matchStats.userStats.assists || 0) : 0;
            let userRating = this.matchStats.userStats ? (this.matchStats.userStats.rating || 7.0) : 7.0;
            let isMotm = this.matchStats.userStats ? !!this.matchStats.userStats.isMotm : this.isWin;
            
            if (window.CareerManager) {
                window.CareerManager.processMatchResult(fixture, this.homeScore, this.awayScore, {
                    ...this.matchStats.userStats,
                    goals: userGoals,
                    assists: userAssists,
                    rating: userRating,
                    isMotm
                }, this.userIsHome);
            }
            activeMatch.status = 'completed';
        }

        if (applyRewards && window.SaveManager) window.SaveManager.save();
    }

    createBackground() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x020617, 0x020617, 0x0f172a, 0x0f172a, 1);
        bg.fillRect(0, 0, this.width, this.height);
    }

    createHeader() {
        const cx = this.width / 2;
        const activeMatch = window.gameState && window.gameState.activeMatch;
        
        let homeName = "HOME";
        let awayName = "AWAY";

        if (activeMatch) {
            const hc = window.TeamDatabase.getClub(activeMatch.homeTeamId);
            const ac = window.TeamDatabase.getClub(activeMatch.awayTeamId);
            if (hc) homeName = hc.name.toUpperCase();
            if (ac) awayName = ac.name.toUpperCase();
        }

        // Top status color bar
        let resColor = this.isWin ? 0x22c55e : (this.isDraw ? 0x94a3b8 : 0xef4444);
        let resHex = this.isWin ? '#22c55e' : (this.isDraw ? '#94a3b8' : '#ef4444');
        let resText = this.isWin ? 'GALİBİYET' : (this.isDraw ? 'BERABERLİK' : 'MAĞLUBİYET');

        const g = this.add.graphics();
        g.fillStyle(resColor, 1);
        g.fillRect(0, 0, this.width, 6);

        // Header Names & Score
        this.add.text(cx - 110, 42, homeName, { font: '900 26px sans-serif', fill: '#ffffff' }).setOrigin(1, 0.5);
        this.add.text(cx, 42, `${this.homeScore} - ${this.awayScore}`, { font: '900 36px sans-serif', fill: resHex }).setOrigin(0.5);
        this.add.text(cx + 110, 42, awayName, { font: '900 26px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);

        // Subtitle
        const comp = activeMatch ? (activeMatch.competition === 'league' ? 'LİG MAÇI' : activeMatch.competition.toUpperCase()) : 'LİG MAÇI';
        const week = activeMatch && (activeMatch.week || activeMatch.matchDay) ? `HAFTA ${activeMatch.week || activeMatch.matchDay}` : 'HAFTA 1';
        this.add.text(cx, 80, `MAÇ SONUCU  •  ${resText}  •  ${comp} - ${week}`, { font: '700 13px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
    }

    createStatsPanel(x, y) {
        const w = 310, h = 330;
        this.drawGlassPanel(x - w/2, y - h/2, w, h);

        this.add.text(x, y - h/2 + 22, "MAÇ İSTATİSTİKLERİ", { font: '800 14px sans-serif', fill: '#38bdf8' }).setOrigin(0.5);

        const home = this.matchStats.homeStats || {};
        const away = this.matchStats.awayStats || {};
        const rows = [
            ["Topla Oynama (%)", "possession"],
            ["Şutlar", "shots"],
            ["İsabetli Şut", "shotsOnTarget"],
            ["Paslar", "passes"],
            ["Müdahaleler", "tackles"]
        ];

        let startY = y - h/2 + 65;
        const spacing = 45;

        this.add.text(x - w/2 + 24, startY - 22, "Ev", { font: '700 12px sans-serif', fill: '#94a3b8' });
        this.add.text(x + w/2 - 24, startY - 22, "Dep", { font: '700 12px sans-serif', fill: '#94a3b8' }).setOrigin(1, 0);

        const drawRow = (label, v1, v2, yPos) => {
            this.add.text(x, yPos, label, { font: '600 13px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
            this.add.text(x - w/2 + 30, yPos, String(v1 ?? '—'), { font: '800 15px sans-serif', fill: v1 != null && v2 != null && v1 >= v2 ? '#38bdf8' : '#94a3b8' }).setOrigin(0.5);
            this.add.text(x + w/2 - 30, yPos, String(v2 ?? '—'), { font: '800 15px sans-serif', fill: v1 != null && v2 != null && v2 >= v1 ? '#ef4444' : '#94a3b8' }).setOrigin(0.5);
        };

        rows.forEach(([label, key], index) => drawRow(label, home[key], away[key], startY + spacing * index));
    }

    createMotmPanel(x, y) {
        const w = 270, h = 150;
        this.drawGlassPanel(x - w/2, y - h/2, w, h);
        
        this.add.text(x, y - h/2 + 20, "MAÇIN ADAMI", { font: '800 14px sans-serif', fill: '#facc15' }).setOrigin(0.5);

        // Fetch Authoritative Player Name from Player/Team Database (Fix duplicate text bug!)
        let pName = "OYUNCU";
        if (window.gameState && window.gameState.player) {
            pName = window.gameState.player.displayName || window.gameState.player.name || window.gameState.player.username || "OYUNCU";
        } else if (this.matchStats && this.matchStats.userStats && this.matchStats.userStats.name) {
            pName = this.matchStats.userStats.name;
        }

        let pOvr = (window.gameState && window.gameState.player) ? (window.gameState.player.overall || 75) : 75;
        let pRating = (this.matchStats && this.matchStats.userStats && this.matchStats.userStats.rating) ? this.matchStats.userStats.rating.toFixed(1) : "7.5";

        let motmName = pName;
        let motmOvr = pOvr;
        let motmRating = pRating;

        // Rating circle
        const g = this.add.graphics();
        g.lineStyle(3.5, 0xfacc15, 1);
        g.strokeCircle(x - 80, y + 10, 32);

        this.add.text(x - 80, y + 10, motmRating, { font: '900 20px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        
        // Single authoritative text object for player name (NO DUPLICATE OVERLAY)
        this.add.text(x - 30, y - 5, motmName.toUpperCase(), { font: '800 18px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
        this.add.text(x - 30, y + 20, `ST • OVR ${motmOvr}`, { font: '600 13px sans-serif', fill: '#94a3b8' }).setOrigin(0, 0.5);
        
        if (this.matchStats && this.matchStats.userStats) {
            let uGoals = this.matchStats.userStats.goals || 0;
            let uAssists = this.matchStats.userStats.assists || 0;
            let sub = "";
            if (uGoals > 0) sub += `${uGoals} Gol `;
            if (uAssists > 0) sub += `${uAssists} Asist`;
            if (sub) this.add.text(x - 30, y + 40, sub.trim(), { font: '700 11px sans-serif', fill: '#22c55e' }).setOrigin(0, 0.5);
        }
    }

    createRewardsPanel(x, y) {
        const w = 270, h = 150;
        this.drawGlassPanel(x - w/2, y - h/2, w, h);

        this.add.text(x, y - h/2 + 20, "ÖDÜLLER & FORM", { font: '800 14px sans-serif', fill: '#c084fc' }).setOrigin(0.5);

        // XP
        this.add.text(x - 70, y - 12, "XP", { font: '700 12px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        this.add.text(x - 70, y + 15, `+${this.earnedXp}`, { font: '900 24px sans-serif', fill: '#c084fc' }).setOrigin(0.5);

        // EZ
        this.add.text(x, y - 12, "EZ COIN", { font: '700 12px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        this.add.text(x, y + 15, `+${this.earnedCoins}`, { font: '900 24px sans-serif', fill: '#facc15' }).setOrigin(0.5);

        // Form
        this.add.text(x + 70, y - 12, "FORM", { font: '700 12px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);
        
        let formIcon = "—";
        let formColor = "#94a3b8";
        let formVal = "0";
        
        if (this.ratingChange > 0) { formIcon = "▲"; formColor = "#22c55e"; formVal = `+${this.ratingChange}`; }
        else if (this.ratingChange < 0) { formIcon = "▼"; formColor = "#ef4444"; formVal = `${this.ratingChange}`; }

        this.add.text(x + 70, y + 15, `${formIcon} ${formVal}`, { font: '900 20px sans-serif', fill: formColor }).setOrigin(0.5);
        if (this.objectiveResult) {
            const { label, progress, target, completed, ez, xp } = this.objectiveResult;
            const summary = completed ? `✓ ${label}  +${ez} EZ  +${xp} XP` : `${label}  ${progress}/${target}`;
            this.add.text(x, y + 49, summary, {
                font: '700 13px sans-serif', color: completed ? '#86efac' : '#94a3b8'
            }).setOrigin(0.5);
        }
    }

    createSummaryPanel(x, y) {
        const w = 550, h = 150;
        this.drawGlassPanel(x - w/2, y - h/2, w, h);

        this.add.text(x - w/2 + 20, y - h/2 + 18, "MAÇ ÖZETİ", { font: '800 14px sans-serif', fill: '#ffffff' });

        const oppScore = this.matchStats.scoreRight;
        const myScore = this.matchStats.scoreLeft;
        const userTeamStats = this.userIsHome ? this.matchStats.homeStats : this.matchStats.awayStats;

        let uGoals = this.matchStats.userStats ? (this.matchStats.userStats.goals || 0) : 0;
        let uAssists = this.matchStats.userStats ? (this.matchStats.userStats.assists || 0) : 0;

        let summaryLines = [];
        
        // Line 1: Match Result Summary
        if (this.isWin) {
            summaryLines.push(`Harika bir performansla sahadan galibiyetle ayrıldık.`);
        } else if (this.isDraw) {
            summaryLines.push(`Zorlu mücadele dengeli bir oyunla beraberlikle sonuçlandı.`);
        } else {
            summaryLines.push(`Rakibin etkili atakları sonucunda mağlubiyet aldık.`);
        }

        // Line 2: Defensive performance
        if (oppScore === 0) {
            summaryLines.push(`Savunmamız kusursuz bir performansla kaleyi gole kapattı.`);
        } else if (oppScore >= 3) {
            summaryLines.push(`Savunmada verilen açıklar rakibin skor üretmesine yol açtı.`);
        } else {
            summaryLines.push(`Takım savunması mücadele boyunca disiplinini korudu.`);
        }

        // Line 3: Player performance highlight
        if (uGoals >= 3) {
            summaryLines.push(`İnanılmaz bir hat-trick ile takımına üç gol kazandırdın!`);
        } else if (uGoals > 0) {
            summaryLines.push(`Attığın ${uGoals} gol ile takıma doğrudan skor katkısı sağladın.`);
        } else if (uAssists > 0) {
            summaryLines.push(`Yaptığın ${uAssists} asist ile skora önemli katkıda bulundun.`);
        } else if (userTeamStats?.possession >= 55) {
            summaryLines.push(`Yüksek topla oynama oranı ile saha organizasyonunu yönettin.`);
        } else {
            summaryLines.push(`Takım disiplini içerisinde görevini başarıyla tamamladın.`);
        }

        // Fix \n bug by using single \n linebreaks and replacing literal \\n
        const summaryText = summaryLines.join('\n').replaceAll('\\n', '\n');

        // Fix overflow bug using wordWrap with explicit width boundary
        this.add.text(x - w/2 + 20, y - h/2 + 45, summaryText, { 
            font: '500 13px sans-serif', 
            fill: '#cbd5e1', 
            lineSpacing: 6,
            wordWrap: { width: w - 40 }
        });
    }

    drawGlassPanel(x, y, w, h) {
        const g = this.add.graphics();
        g.fillStyle(0x0f172a, 0.75);
        g.fillRoundedRect(x, y, w, h, 14);
        g.lineStyle(1, 0x334155, 0.8);
        g.strokeRoundedRect(x, y, w, h, 14);
    }

    createContinueButton() {
        const cx = this.width / 2;
        // Position DEVAM button safely inside viewport bounds without cutoff
        const btnY = Math.min(this.height - 45, this.height * 0.92);
        const btnW = 380, btnH = 50;

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x38bdf8, 1);
        btnBg.fillRoundedRect(cx - btnW/2, btnY - btnH/2, btnW, btnH, 25);
        
        btnBg.fillStyle(0x0ea5e9, 1);
        btnBg.fillRoundedRect(cx - btnW/2 + 2, btnY - btnH/2 + 2, btnW - 4, btnH - 4, 23);

        const btnText = this.add.text(cx, btnY, 'DEVAM', { font: '900 22px sans-serif', fill: '#0f172a', letterSpacing: 2 }).setOrigin(0.5);
        
        const hit = this.add.rectangle(cx, btnY, btnW, btnH, 0, 0).setInteractive({ useHandCursor: true });
        if (window.UIUtils) window.UIUtils.addClickFeedback(this, hit);

        hit.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            
            this.tweens.add({
                targets: [btnBg, btnText],
                scale: 0.95,
                duration: 100,
                yoyo: true,
                onComplete: () => {
                    this.cameras.main.fadeOut(300);
                    // Match flow: PostMatch -> SocialMedia -> CareerWorld
                    this.time.delayedCall(300, () => this.scene.start('SocialMediaScene', this.matchStats));
                }
            });
        });
    }

    checkLevelUp() {
        if (this.leveledUp) {
            this.time.delayedCall(800, () => {
                const cx = this.width/2, cy = this.height/2;
                const bg = this.add.rectangle(cx, cy, this.width, this.height, 0x000000, 0.85).setDepth(2000);
                const txt = this.add.text(cx, cy - 20, 'SEVİYE ATLANDI!', { font: '900 48px sans-serif', fill: '#facc15' }).setOrigin(0.5).setDepth(2001);
                txt.setShadow(0,0,'#fbbf24', 20, true, true);
                const num = this.add.text(cx, cy + 40, 'Level ' + (window.gameState.player ? window.gameState.player.level : 1), { font: '700 28px sans-serif', fill: '#ffffff' }).setOrigin(0.5).setDepth(2001);
                
                bg.setInteractive();
                bg.on('pointerdown', () => {
                    bg.destroy(); txt.destroy(); num.destroy();
                });

                this.time.delayedCall(2500, () => {
                    if (bg && bg.active) { bg.destroy(); txt.destroy(); num.destroy(); }
                });
            });
        }
    }
}

