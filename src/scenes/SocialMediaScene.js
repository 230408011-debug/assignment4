class SocialMediaScene extends Phaser.Scene {
    constructor() {
        super('SocialMediaScene');
    }

    init(data) {
        // Core Match Data
        this.matchStats = data || { scoreLeft: 0, scoreRight: 0, isWin: true };
        this.matchStats.scoreLeft = Number(this.matchStats.scoreLeft) || 0;
        this.matchStats.scoreRight = Number(this.matchStats.scoreRight) || 0;
        
        const diff = this.matchStats.scoreLeft - this.matchStats.scoreRight;
        this.matchStats.isWin = diff > 0;
        this.matchStats.isDraw = diff === 0;

        // Verify valid career state
        if (!window.gameState || !window.gameState.activeMatch) {
            console.error("SocialMediaScene: activeMatch eksik. Kariyer modundan gelinmedi.");
            setTimeout(() => { this.scene.start('CareerWorldScene'); }, 50);
            return;
        }

        const activeMatch = window.gameState.activeMatch;
        const isUserHome = activeMatch.userSide === 'home';
        
        // Club Database Lookups
        const userClubId = isUserHome ? activeMatch.homeTeamId : activeMatch.awayTeamId;
        const oppClubId = isUserHome ? activeMatch.awayTeamId : activeMatch.homeTeamId;
        
        let myClub = window.TeamDatabase.getClub(userClubId);
        let oppClub = window.TeamDatabase.getClub(oppClubId);
        if (!myClub.squad) myClub.squad = { gk: { name: 'GK' }, mid: { name: 'MID' }, st: { name: 'ST' } };
        if (!oppClub.squad) oppClub.squad = { gk: { name: 'GK' }, mid: { name: 'MID' }, st: { name: 'ST' } };

        this.currentClubName = window.TeamDatabase.getTeamName(userClubId) || 'YOU';
        this.currentClubShort = window.TeamDatabase.getShortName(userClubId) || 'YOU';
        this.currentClubColor = window.TeamDatabase.getPrimaryColor(userClubId) || 0x3b82f6;

        this.opponentClubName = window.TeamDatabase.getTeamName(oppClubId) || 'CPU';
        this.opponentClubShort = window.TeamDatabase.getShortName(oppClubId) || 'CPU';
        this.opponentClubColor = window.TeamDatabase.getPrimaryColor(oppClubId) || 0xef4444;

        let comp = activeMatch.competition || 'Lig Maçı';
        if (comp === 'League' || comp === 'league') {
            const leagueObj = window.TeamDatabase && window.TeamDatabase.getLeague ? window.TeamDatabase.getLeague(activeMatch.league) : null;
            comp = (leagueObj && leagueObj.name) ? leagueObj.name : 'Süper Lig';
        }
        this.competitionName = comp;
        this.isCupMatch = this.competitionName.toLowerCase().includes('cup') || this.competitionName.toLowerCase().includes('kupa');
        this.isBigMatch = (oppClub.tier || '') === 'ELITE';

        // Player Stats
        const uStats = this.matchStats.userStats || {};
        this.username = uStats.name || window.gameState.player.username || window.gameState.player.name || "Oyuncu";
        this.userGoals = uStats.goals !== undefined ? uStats.goals : this.matchStats.scoreLeft;
        this.userAssists = uStats.assists !== undefined ? uStats.assists : Math.max(0, this.userGoals - 1);
        this.userShots = uStats.shots !== undefined ? uStats.shots : this.userGoals + 1;
        this.userRating = uStats.rating !== undefined ? Number(uStats.rating).toFixed(1) : 7.0;

        // Structured Match Rewards
        const rewards = this.matchStats.rewards || {};
        const cw = window.gameState.career || {};
        const matchBonus = rewards.matchBonus || ((cw.contract && cw.contract.matchBonus) || 30);
        const goalBonus = rewards.goalBonus || ((cw.contract && cw.contract.goalBonus) || 15);
        const earnedCoins = rewards.earnedCoins !== undefined ? rewards.earnedCoins : (
            (this.matchStats.isWin ? matchBonus : (this.matchStats.isDraw ? Math.floor(matchBonus/2) : Math.floor(matchBonus/4))) +
            (this.userGoals * goalBonus) +
            (this.matchStats.scoreRight === 0 ? Math.floor(matchBonus/2) : 0)
        );
        const earnedXp = rewards.earnedXp !== undefined ? rewards.earnedXp : (
            (this.matchStats.isWin ? 60 : (this.matchStats.isDraw ? 30 : 15)) +
            (this.userGoals * 20) +
            (this.matchStats.scoreRight === 0 ? 25 : 0)
        );
        this.matchRewards = {
            matchBonus: matchBonus,
            goalBonus: goalBonus,
            goalEarnings: this.userGoals * goalBonus,
            earnedCoins: earnedCoins,
            earnedXp: earnedXp,
            competition: this.competitionName
        };

        // Star Player Logic - use actual player names
        if (this.matchStats.isWin || diff >= 0) {
            this.starPlayer = {
                name: this.username,
                teamAbbr: this.currentClubShort,
                rating: this.userRating,
                goals: this.userGoals,
                assists: this.userAssists,
                shots: this.userShots,
                color: this.currentClubColor
            };
        } else {
            const cpuGoals = this.matchStats.scoreRight;
            let strikerName = 'Rakip Forvet';
            if (oppClub.squad && oppClub.squad.st) {
                strikerName = window.TeamDatabase.getPlayerSafeName(oppClub.squad.st);
            } else if (oppClub.squad && oppClub.squad.mid) {
                strikerName = window.TeamDatabase.getPlayerSafeName(oppClub.squad.mid);
            }
            this.starPlayer = {
                name: strikerName,
                teamAbbr: this.opponentClubShort,
                rating: Math.min(10.0, 7.5 + (cpuGoals * 0.8)).toFixed(1),
                goals: cpuGoals,
                assists: Math.max(0, cpuGoals - 1),
                shots: cpuGoals + 2,
                color: this.opponentClubColor
            };
        }

        // Generate Social Media Data using SocialMediaData system
        this.matchId = `${this.currentClubShort}_vs_${this.opponentClubShort}_${this.matchStats.scoreLeft}-${this.matchStats.scoreRight}_${Date.now().toString().slice(0, 8)}`;
        this.generateContent();

        // Get Next Fixture
        this.nextFixture = null;
        if (window.gameState.career && window.gameState.career.fixtures) {
            const unplayed = window.gameState.career.fixtures.filter(f => !f.completed);
            if (unplayed.length > 0) {
                this.nextFixture = unplayed[0];
            }
        }

        // Active tab
        this.activeTab = 'furiogram';
    }

    generateContent() {
        const vars = {
            playerName: this.starPlayer.name,
            clubName: this.currentClubName,
            opponentName: this.opponentClubName,
            score: `${this.matchStats.scoreLeft}-${this.matchStats.scoreRight}`,
            goals: this.starPlayer.goals,
            assists: this.starPlayer.assists,
            rating: this.starPlayer.rating,
            leagueName: this.competitionName
        };

        // Fetch data for all three tabs once
        this.furiogramPosts = window.SocialMediaData.getCommentsForMatch(this.matchStats, vars, 6);
        this.fxPosts = window.SocialMediaData.getCommentsForMatch(this.matchStats, vars, 6);
        this.futioticVideos = window.SocialMediaData.getVideosForMatch(this.matchStats, 4);
        
        // Match base stats
        const isWin = this.matchStats.scoreLeft > this.matchStats.scoreRight;
        const rep = (window.gameState.player.stats && window.gameState.player.stats.reputation) || 50;
        
        // Realistic community stats (Likes: 10K-45K, Comments: 1K-6K, Active Fans: 15K-35K)
        const rawLikes = Math.floor(10000 + (rep / 100) * 22000 + (isWin ? 8000 : 2000) + Math.random() * 3000);
        const rawComments = Math.floor(1000 + (rep / 100) * 3200 + (isWin ? 1200 : 300) + Math.random() * 500);
        const rawActiveFans = Math.floor(15000 + (rep / 100) * 14000 + (isWin ? 4000 : 1000) + Math.random() * 1000);
        const rawOnlineNow = Math.floor(1200 + (rep / 100) * 2400 + Math.random() * 600);
        const rawPosts = Math.floor(450 + (rep / 100) * 900 + (isWin ? 300 : 100));
        
        const fmt = window.SocialMediaData ? window.SocialMediaData.formatNumber.bind(window.SocialMediaData) : (n => Math.round(n).toString());
        this.communityStats = {
            posts: fmt(rawPosts),
            likes: fmt(rawLikes),
            comments: fmt(rawComments),
            activeFans: fmt(rawActiveFans),
            onlineNow: fmt(rawOnlineNow)
        };

        // Popular Tags & Creators
        this.hashtags = window.SocialMediaData.getMatchHashtags(vars);
        this.creators = window.SocialMediaData.getRisingCreators(this.isBigMatch);
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;
        
        if (window.audioManager) window.audioManager.scene = this;
        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        this.cameras.main.fadeIn(400);

        // Grid parameters (1280x720 base)
        this.leftColX = 20;
        this.leftColWidth = 200;
        this.mainX = 235;
        this.mainW = 750;
        this.rightX = 1000;
        this.rightW = 260;

        this.createBackground();
        this.createHeader();
        
        this.createLeftSidebar();
        this.createMainArea();
        this.createRightSidebar();
        this.createBottomBar();
    }

    createBackground() {
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x0a011a, 0x050011, 0x090117, 0x03000b, 1);
        bg.fillRect(0, 0, this.width, this.height);

        // Neon Grid
        const grid = this.add.graphics().setAlpha(0.08);
        grid.lineStyle(1, 0xd946ef, 0.15);
        for (let y = 0; y < this.height; y += 40) {
            grid.beginPath(); grid.moveTo(0, y); grid.lineTo(this.width, y); grid.strokePath();
        }
        for (let x = 0; x < this.width; x += 40) {
            grid.beginPath(); grid.moveTo(x, 0); grid.lineTo(x, this.height); grid.strokePath();
        }
    }

    createHeader() {
        // Logo
        const logoG = this.add.graphics();
        logoG.fillStyle(0x0c011a, 0.9);
        logoG.lineStyle(2, 0x00ffff, 1);
        logoG.beginPath();
        logoG.moveTo(40, 20); logoG.lineTo(100, 20); logoG.lineTo(110, 45); logoG.lineTo(70, 70); logoG.lineTo(30, 45);
        logoG.closePath();
        logoG.fillPath(); logoG.strokePath();
        
        this.add.text(70, 42, "FURIO\nFC", { font: '700 13px sans-serif', fill: '#00ffff', align: 'center', lineSpacing: -4 }).setOrigin(0.5);

        // Titles
        this.add.text(140, 25, "MAÇ SONU SOSYAL MEDYA", { font: '700 27px sans-serif', fill: '#ffffff', letterSpacing: 2 }).setShadow(0, 0, '#d946ef', 10, true, true);
        this.add.text(140, 55, "TARAFTARLAR NE DİYOR?", { font: '800 12px sans-serif', fill: '#00ffff', letterSpacing: 1.5 });

        // Close Button
        const closeBtn = this.add.circle(this.width - 40, 40, 18, 0x1d1330).setStrokeStyle(2, 0xd946ef).setInteractive({ useHandCursor: true });
        this.add.text(this.width - 40, 40, "X", { font: '700 15px sans-serif', fill: '#d946ef' }).setOrigin(0.5);
        
        closeBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('CareerWorldScene'));
        });
    }

    createLeftSidebar() {
        if (!this.sidebarElements) this.sidebarElements = [];
        let y = 100;
        
        // Profile Card
        const pCard = this.add.graphics();
        pCard.fillStyle(0x0a011a, 0.8).fillRoundedRect(this.leftColX, y, this.leftColWidth, 60, 12);
        pCard.lineStyle(2, 0xd946ef, 0.15).strokeRoundedRect(this.leftColX, y, this.leftColWidth, 60, 12);
        
        const avatarBg = this.add.circle(this.leftColX + 35, y + 30, 20, 0x1d1330).setStrokeStyle(2, 0x00ffff);
        const avatarIcon = this.add.text(this.leftColX + 35, y + 30, "😎", { fontSize: '21px' }).setOrigin(0.5);
        const nameTextObj = this.add.text(this.leftColX + 70, y + 15, this.username.toUpperCase(), { font: '700 15px sans-serif', fill: '#ffffff' });
        this.add.text(this.leftColX + 70, y + 15, this.username.toUpperCase(), { font: '700 15px sans-serif', fill: '#ffffff' });
        const level = window.gameState.player.level || 1;
        const ez = window.gameState.career.ez || 0;
        const ezText = this.add.text(this.leftColX + 70, y + 35, `Lvl ${level}  |  ${ez} EZ`, { font: '800 11px sans-serif', fill: '#facc15' });

        this.sidebarElements.push(pCard, avatarBg, avatarIcon, nameTextObj, ezText);

        y += 80;

        // Platforms - ALL interactive tabs
        const platforms = [
            { icon: '📸', name: 'Furiogram', key: 'furiogram' },
            { icon: '💬', name: 'FX', key: 'fx' },
            { icon: '🎵', name: 'Futiotic', key: 'futiotic' }
        ];

        this.tabButtons = [];
        platforms.forEach(p => {
            const isActive = this.activeTab === p.key;
            const btnBg = this.add.graphics();
            if (isActive) {
                btnBg.fillStyle(0x1a0b35, 1).fillRoundedRect(this.leftColX + 30, y, 140, 50, 12);
                btnBg.lineStyle(2, 0x00ffff, 1).strokeRoundedRect(this.leftColX + 30, y, 140, 50, 12);
            } else {
                btnBg.fillStyle(0x1a1a2e, 0.4).fillRoundedRect(this.leftColX + 30, y, 140, 45, 8);
            }
            
            const iconText = this.add.text(this.leftColX + 55, y + (isActive ? 25 : 22.5), p.icon, { fontSize: isActive ? '22px' : '20px' }).setOrigin(0.5);
            const nameText = this.add.text(this.leftColX + 75, y + (isActive ? 25 : 22.5), p.name.toUpperCase(), { 
                font: isActive ? '900 15px sans-serif' : '700 13px sans-serif', 
                fill: isActive ? '#00ffff' : '#94a3b8', 
                letterSpacing: isActive ? 1 : 0 
            }).setOrigin(0, 0.5);
            
            if (!isActive) {
                iconText.setAlpha(0.6);
                nameText.setAlpha(0.6);
            }

            // Make ALL tabs clickable
            const hitArea = this.add.rectangle(this.leftColX + 100, y + (isActive ? 25 : 22.5), 140, isActive ? 50 : 45, 0x000000, 0).setInteractive({ useHandCursor: true });
            hitArea.on('pointerdown', () => {
                if (this.activeTab !== p.key) {
                    this.switchTab(p.key);
                }
            });

            y += isActive ? 65 : 55;
            
            this.sidebarElements.push(btnBg, iconText, nameText, hitArea);
        });

        y += 10;

        // Community Stats
        const csG = this.add.graphics();
        csG.lineStyle(2, 0xd946ef, 0.15).strokeRoundedRect(this.leftColX, y, this.leftColWidth, 240, 12);
        const csTitle = this.add.text(this.leftColX + 15, y - 10, " TOPLULUK İSTATİSTİKLERİ ", { font: '800 11px sans-serif', fill: '#00ffff', backgroundColor: '#0a011a' });
        this.sidebarElements.push(csG, csTitle);

        const statsList = [
            { icon: "📝", label: "TOPLAM GÖNDERİ", val: this.communityStats.posts, color: '#ffffff' },
            { icon: "❤️", label: "TOPLAM BEĞENİ", val: this.communityStats.likes, color: '#ef4444' },
            { icon: "💬", label: "TOPLAM YORUM", val: this.communityStats.comments, color: '#38bdf8' },
            { icon: "👥", label: "AKTİF TARAFTAR", val: this.communityStats.activeFans, color: '#cbd5e1' },
            { icon: "⚡", label: "ONLİNE ŞU AN", val: this.communityStats.onlineNow, color: '#22c55e' }
        ];

        let sy = y + 25;
        statsList.forEach(st => {
            const bg = this.add.rectangle(this.leftColX + 10, sy, this.leftColWidth - 20, 35, 0x1a0b35, 0.5).setOrigin(0);
            const icon = this.add.text(this.leftColX + 25, sy + 17.5, st.icon, { fontSize: '15px' }).setOrigin(0.5);
            const lbl = this.add.text(this.leftColX + 45, sy + 8, st.label, { font: '700 9px sans-serif', fill: '#94a3b8' });
            const val = this.add.text(this.leftColX + 45, sy + 25, st.val, { font: '700 15px sans-serif', fill: st.color });
            sy += 40;
            this.sidebarElements.push(bg, icon, lbl, val);
        });
    }

    switchTab(key) {
        if (this.activeTab === key) return;
        this.activeTab = key;
        if (window.audioManager) window.audioManager.playSFX('button_click');
        
        // Clean up previous elements
        if (this.sidebarElements) {
            this.sidebarElements.forEach(e => e.destroy());
            this.sidebarElements = [];
        }
        
        this.createLeftSidebar();
        this.renderActiveFeed(100 + 120 + 20); // mainY + rh + padding
    }

    createMainArea() {
        const y = 100;
        // Result Panel
        const rw = 450;
        const rh = 120;
        
        const diff = this.matchStats.scoreLeft - this.matchStats.scoreRight;
        let resColor = 0x38bdf8;
        let resText = "BERABERLİK";
        if (diff > 0) { resColor = 0x22c55e; resText = "GALİBİYET"; }
        else if (diff < 0) { resColor = 0xef4444; resText = "MAĞLUBİYET"; }

        const rG = this.add.graphics();
        rG.fillStyle(0x0a021a, 0.9).fillRoundedRect(this.mainX, y, rw, rh, 12);
        rG.lineStyle(2, resColor, 1).strokeRoundedRect(this.mainX, y, rw, rh, 12);
        
        // Result Badge
        this.add.rectangle(this.mainX + 20, y + 20, 100, 24, resColor, 1).setOrigin(0, 0.5);
        this.add.text(this.mainX + 70, y + 20, resText, { font: '700 13px sans-serif', fill: '#000000', letterSpacing: 1 }).setOrigin(0.5);

        // Scores
        this.add.circle(this.mainX + 50, y + 70, 22, 0x1d1330).setStrokeStyle(2, this.currentClubColor);
        this.add.text(this.mainX + 50, y + 70, "😎", { fontSize: '21px' }).setOrigin(0.5);
        this.add.text(this.mainX + 85, y + 55, this.currentClubShort.toUpperCase(), { font: '700 17px sans-serif', fill: '#' + this.currentClubColor.toString(16).padStart(6, '0') });
        this.add.text(this.mainX + 85, y + 75, this.currentClubName, { font: '700 12px sans-serif', fill: '#cbd5e1' });

        this.add.text(this.mainX + rw/2, y + 70, `${this.matchStats.scoreLeft} - ${this.matchStats.scoreRight}`, { font: '700 53px sans-serif', fill: '#ffffff', letterSpacing: 4 }).setOrigin(0.5).setShadow(0,0,'#'+resColor.toString(16).padStart(6,'0'), 15, true, true);

        const cpuG = this.add.graphics();
        cpuG.lineStyle(2, this.opponentClubColor, 1);
        cpuG.strokeCircle(this.mainX + rw - 50, y + 70, 22);
        cpuG.strokeCircle(this.mainX + rw - 50, y + 70, 18);
        this.add.text(this.mainX + rw - 85, y + 55, this.opponentClubShort.toUpperCase(), { font: '700 17px sans-serif', fill: '#' + this.opponentClubColor.toString(16).padStart(6, '0') }).setOrigin(1, 0);
        this.add.text(this.mainX + rw - 85, y + 75, this.opponentClubName, { font: '700 12px sans-serif', fill: '#cbd5e1' }).setOrigin(1, 0);

        this.add.text(this.mainX + rw/2, y + 105, `🏆 ${this.competitionName}   ⏱️ MS`, { font: '800 12px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);

        // MOTM Panel
        const mw = 280;
        const mx = this.mainX + rw + 20;
        const starColor = this.starPlayer.color;

        const mG = this.add.graphics();
        mG.fillStyle(0x0a021a, 0.9).fillRoundedRect(mx, y, mw, rh, 12);
        mG.lineStyle(2, starColor, 1).strokeRoundedRect(mx, y, mw, rh, 12);

        this.add.text(mx + mw/2, y + 20, "🌟 MAÇIN YILDIZI", { font: '700 15px sans-serif', fill: '#facc15', letterSpacing: 1 }).setOrigin(0.5);

        this.add.circle(mx + 40, y + 65, 20, 0x1d1330).setStrokeStyle(2, starColor);
        this.add.text(mx + 40, y + 65, this.starPlayer.name === this.username ? "😎" : "🤖", { fontSize: '21px' }).setOrigin(0.5);

        this.add.text(mx + 75, y + 50, this.starPlayer.name, { font: '700 17px sans-serif', fill: '#ffffff' });
        this.add.text(mx + 75, y + 70, this.starPlayer.teamAbbr.toUpperCase(), { font: '800 12px sans-serif', fill: '#' + starColor.toString(16).padStart(6, '0') });

        this.add.rectangle(mx + mw - 35, y + 65, 40, 26, starColor, 0.2).setStrokeStyle(1, starColor);
        this.add.text(mx + mw - 35, y + 65, this.starPlayer.rating, { font: '700 16px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

        this.add.text(mx + mw/2, y + 105, `GOL: ${this.starPlayer.goals}  |  ASİST: ${this.starPlayer.assists}  |  ŞUT: ${this.starPlayer.shots}`, { font: '800 12px sans-serif', fill: '#cbd5e1' }).setOrigin(0.5);

        this.renderActiveFeed(y + rh + 20);
    }
    
    renderActiveFeed(fY) {
        if (this.feedContainer) {
            this.feedContainer.destroy();
        }
        this.feedContainer = this.add.container(0, 0);
        
        if (this.activeTab === 'futiotic') {
            this.renderFutioticFeed(fY);
        } else if (this.activeTab === 'furiogram') {
            this.renderFuriogramFeed(fY);
        } else if (this.activeTab === 'fx') {
            this.renderFXFeed(fY);
        }
    }

    renderFutioticFeed(fY) {
        let fX = this.mainX;
        const cw = 175;
        const ch = 190;
        const space = 16;

        // Tab header
        const header = this.add.text(fX, fY - 5, "🎵 FUTİOTİC - VİDEO YORUMLARI", { font: '700 15px sans-serif', fill: '#d946ef', letterSpacing: 1 });
        this.feedContainer.add(header);
        fY += 20;

        this.futioticVideos.forEach((post, i) => {
            const row = Math.floor(i / 4);
            const col = i % 4;
            const cx = fX + col * (cw + space);
            const cy = fY + row * (ch + space);

            const cg = this.add.graphics();
            cg.fillStyle(0x130526, 0.8).fillRoundedRect(cx, cy, cw, ch, 10);
            cg.lineStyle(1.5, 0xd946ef, 0.25).strokeRoundedRect(cx, cy, cw, ch, 10);

            // Video thumbnail area (dark with play button)
            const thumbG = this.add.graphics();
            thumbG.fillStyle(0x0a0118, 0.9).fillRoundedRect(cx + 8, cy + 8, cw - 16, 70, 6);
            const playBtn = this.add.text(cx + cw/2, cy + 43, "▶", { font: '700 29px sans-serif', fill: '#d946ef' }).setOrigin(0.5).setAlpha(0.85);
            const dur = this.add.text(cx + cw - 18, cy + 70, post.duration, { font: '700 9px sans-serif', fill: '#ffffff', backgroundColor: '#000000cc', padding: { x: 3, y: 1 } }).setOrigin(1, 1);

            // Avatar & Name
            const avBg = this.add.circle(cx + 25, cy + 100, 12, 0x1d1330).setStrokeStyle(1, 0x00ffff);
            const avIcon = this.add.text(cx + 25, cy + 100, "👤", { fontSize: '13px' }).setOrigin(0.5);
            const usr = this.add.text(cx + 42, cy + 93, post.username, { font: '800 10px sans-serif', fill: '#ffffff' });
            const time = this.add.text(cx + 42, cy + 107, post.time, { font: '700 9px sans-serif', fill: '#94a3b8' });

            // Video Title
            const title = this.add.text(cx + 12, cy + 125, post.title, { 
                font: '700 11.5px sans-serif', 
                fill: '#e2e8f0', 
                wordWrap: { width: cw - 24 },
                lineSpacing: 3
            });

            // Engagements
            let curViews = post.rawViews || Math.floor(1500 + Math.random() * 4000);
            let curLikes = post.rawLikes || Math.floor(140 + Math.random() * 600);
            const fmt = window.SocialMediaData ? window.SocialMediaData.formatNumber.bind(window.SocialMediaData) : (n => Math.round(n).toString());

            const views = this.add.text(cx + 12, cy + ch - 18, `👁️ ${fmt(curViews)}`, { font: '800 10px sans-serif', fill: '#94a3b8' });
            const likes = this.add.text(cx + 95, cy + ch - 18, `❤️ ${fmt(curLikes)}`, { font: '800 10px sans-serif', fill: '#ef4444' });

            // Interactive Video Click
            const hitVideo = this.add.rectangle(cx + cw/2, cy + 43, cw - 16, 70, 0, 0).setInteractive({ useHandCursor: true });
            hitVideo.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                curViews++;
                views.setText(`👁️ ${fmt(curViews)}`);
                this.tweens.add({ targets: playBtn, scale: 1.3, duration: 120, yoyo: true });
                this.showToast(`▶ Video oynatılıyor: "${post.title.substring(0, 20)}..."`, 0xd946ef);
            });

            // Interactive Like Click
            const hitLike = this.add.rectangle(cx + 120, cy + ch - 18, 55, 20, 0, 0).setInteractive({ useHandCursor: true });
            hitLike.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                curLikes++;
                likes.setText(`❤️ ${fmt(curLikes)}`);
                this.tweens.add({ targets: likes, scale: 1.25, duration: 100, yoyo: true });
                this.showToast('❤️ Video beğenildi! (+1)', 0xef4444);
            });

            this.feedContainer.add([cg, thumbG, playBtn, dur, avBg, avIcon, usr, time, title, views, likes, hitVideo, hitLike]);
        });
    }

    renderFuriogramFeed(fY) {
        let fX = this.mainX;
        const cw = 235;
        const ch = 150;
        const space = 15;

        // Tab header
        const header = this.add.text(fX, fY - 5, "📸 FURİOGRAM - TARAFTAR YORUMLARI", { font: '700 15px sans-serif', fill: '#e040fb', letterSpacing: 1 });
        this.feedContainer.add(header);
        fY += 20;

        const isWin = this.matchStats.isWin;
        const isDraw = this.matchStats.isDraw;
        const goals = this.userGoals;
        const shotCount = this.userShots;
        const rating = this.userRating;

        // Dynamic picture cards directly connected to match statistics
        const pictureTypes = [
            { emoji: "📸", label: "MAÇTAN KARE", tagInfo: "Kritik anlar" },
            { emoji: "🏟️", label: "STATTAN", tagInfo: `Şut: ${shotCount} | Reyting: ${rating}` },
            goals > 0 ? {
                emoji: "⚽",
                label: "GOL ANI",
                tagInfo: `${Math.floor(Math.random() * 65 + 15)}' Ağları sarsan şut!`
            } : {
                emoji: "🧤",
                label: "SAVUNMA",
                tagInfo: "Geçit vermeyen savunma"
            },
            isWin ? {
                emoji: "🎉",
                label: "KUTLAMA",
                tagInfo: "Galibiyet sevinci!"
            } : (isDraw ? {
                emoji: "⚖️",
                label: "MÜCADELE",
                tagInfo: "Puanlar paylaşıldı"
            } : {
                emoji: "🤝",
                label: "DESTEK",
                tagInfo: "Başımız dik, devam!"
            }),
            { emoji: "🏆", label: "TRİBÜN", tagInfo: "90 dakika tezahürat" },
            { emoji: "🔥", label: "SAHADAN", tagInfo: `${this.starPlayer.name} baskısı` }
        ];

        this.furiogramPosts.forEach((post, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const cx = fX + col * (cw + space);
            const cy = fY + row * (ch + space);
            const picType = pictureTypes[i % pictureTypes.length];

            const cg = this.add.graphics();
            cg.fillStyle(0x130526, 0.8).fillRoundedRect(cx, cy, cw, ch, 10);
            cg.lineStyle(1.5, 0xe040fb, 0.4).strokeRoundedRect(cx, cy, cw, ch, 10);

            // Image placeholder (left side)
            const imgG = this.add.graphics();
            const colors = [0x3b0764, 0x6b21a8, 0x4c1d95, 0x7c3aed, 0x1e1b4b, 0x312e81];
            imgG.fillStyle(colors[i % colors.length], 0.85).fillRoundedRect(cx + 8, cy + 8, 60, 60, 6);
            const emo = this.add.text(cx + 38, cy + 30, picType.emoji, { fontSize: '25px' }).setOrigin(0.5);
            const lbl = this.add.text(cx + 38, cy + 55, picType.label, { font: '700 8px sans-serif', fill: '#e0e0e0' }).setOrigin(0.5);

            // Avatar & Name
            const avBg = this.add.circle(cx + 85, cy + 20, 10, 0x1d1330).setStrokeStyle(1, 0xe040fb);
            const avIcon = this.add.text(cx + 85, cy + 20, "👤", { fontSize: '11px' }).setOrigin(0.5);
            const usr = this.add.text(cx + 100, cy + 13, post.username, { font: '800 10px sans-serif', fill: '#ffffff' });
            const subTag = this.add.text(cx + 100, cy + 26, picType.tagInfo, { font: '700 8.5px sans-serif', fill: '#a855f7' });
            
            // Caption
            let caption = post.text;
            if (caption.length > 70) caption = caption.substring(0, 67) + '...';
            const txt = this.add.text(cx + 12, cy + 78, caption, { 
                font: '600 11px sans-serif', 
                fill: '#e2e8f0', 
                wordWrap: { width: cw - 24 },
                lineSpacing: 3
            });

            // Realistic per-post engagements (80 - 950 likes)
            let postLikes = Math.floor(80 + Math.random() * 820);
            let postComments = Math.floor(postLikes * (0.05 + Math.random() * 0.07));

            const likes = this.add.text(cx + 12, cy + ch - 20, `❤️ ${postLikes}`, { font: '800 10.5px sans-serif', fill: '#ef4444' });
            const comments = this.add.text(cx + 95, cy + ch - 20, `💬 ${postComments}`, { font: '800 10.5px sans-serif', fill: '#cbd5e1' });

            // Interactive Click
            const hit = this.add.rectangle(cx + cw/2, cy + ch/2, cw, ch, 0, 0).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                postLikes++;
                likes.setText(`❤️ ${postLikes}`);
                this.tweens.add({ targets: likes, scale: 1.25, duration: 100, yoyo: true });
                this.showToast(`❤️ ${post.username} gönderisi beğenildi!`, 0xe040fb);
            });

            this.feedContainer.add([cg, imgG, emo, lbl, avBg, avIcon, usr, subTag, txt, likes, comments, hit]);
        });
    }

    renderFXFeed(fY) {
        let fX = this.mainX;
        const cw = 235;
        const ch = 150;
        const space = 15;

        // Tab header
        const header = this.add.text(fX, fY - 5, "💬 FX - TARAFTAR PAYLAŞIMLARI", { font: '700 15px sans-serif', fill: '#38bdf8', letterSpacing: 1 });
        this.feedContainer.add(header);
        fY += 20;

        this.fxPosts.forEach((post, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const cx = fX + col * (cw + space);
            const cy = fY + row * (ch + space);

            const cg = this.add.graphics();
            cg.fillStyle(0x0a1628, 0.9).fillRoundedRect(cx, cy, cw, ch, 10);
            cg.lineStyle(1.5, 0x38bdf8, 0.35).strokeRoundedRect(cx, cy, cw, ch, 10);

            // Avatar & Name
            const avBg = this.add.circle(cx + 25, cy + 25, 14, 0x1d1330).setStrokeStyle(1, 0x38bdf8);
            const avIcon = this.add.text(cx + 25, cy + 25, "👤", { fontSize: '15px' }).setOrigin(0.5);
            const usr = this.add.text(cx + 45, cy + 18, post.username, { font: '800 11px sans-serif', fill: '#ffffff' });
            const time = this.add.text(cx + 45, cy + 32, (Math.floor(Math.random() * 50) + 1) + "dk önce", { font: '700 9px sans-serif', fill: '#94a3b8' });

            // Verified Badge
            const vBg = this.add.circle(cx + 45 + (post.username.length * 6.5) + 5, cy + 23, 5, 0x38bdf8);
            const vIcon = this.add.text(cx + 45 + (post.username.length * 6.5) + 5, cy + 23, "✓", { font: '700 9px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

            // Tweet text
            let safeTweet = post.text;
            if (safeTweet.length > 80) safeTweet = safeTweet.substring(0, 77) + '...';
            const txt = this.add.text(cx + 15, cy + 55, safeTweet, { 
                font: '600 12px sans-serif', 
                fill: '#e2e8f0', 
                wordWrap: { width: cw - 30 },
                lineSpacing: 4
            });

            // Realistic Engagements (80 - 950 likes, proportional reposts and views)
            let rawLikes = Math.floor(80 + Math.random() * 850);
            let rawReposts = Math.floor(rawLikes * (0.1 + Math.random() * 0.12));
            let rawViews = Math.floor(rawLikes * (3.5 + Math.random() * 2.5));
            const fmt = window.SocialMediaData ? window.SocialMediaData.formatNumber.bind(window.SocialMediaData) : (n => Math.round(n).toString());
            
            const e1 = this.add.text(cx + 10, cy + ch - 22, `🔁 ${rawReposts}`, { font: '800 10px sans-serif', fill: '#22c55e' });
            const e2 = this.add.text(cx + 70, cy + ch - 22, `❤️ ${rawLikes}`, { font: '800 10px sans-serif', fill: '#ef4444' });
            const e3 = this.add.text(cx + 135, cy + ch - 22, `👁️ ${fmt(rawViews)}`, { font: '800 10px sans-serif', fill: '#94a3b8' });

            // Interactive Repost Click
            const hitRepost = this.add.rectangle(cx + 35, cy + ch - 22, 50, 20, 0, 0).setInteractive({ useHandCursor: true });
            hitRepost.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                rawReposts++;
                e1.setText(`🔁 ${rawReposts}`);
                this.tweens.add({ targets: e1, scale: 1.25, duration: 100, yoyo: true });
                this.showToast('🔁 FX Gönderisi yeniden paylaşıldı!', 0x22c55e);
            });

            // Interactive Like Click
            const hitLike = this.add.rectangle(cx + 95, cy + ch - 22, 50, 20, 0, 0).setInteractive({ useHandCursor: true });
            hitLike.on('pointerdown', () => {
                if (window.audioManager) window.audioManager.playSFX('button_click');
                rawLikes++;
                e2.setText(`❤️ ${rawLikes}`);
                this.tweens.add({ targets: e2, scale: 1.25, duration: 100, yoyo: true });
                this.showToast('❤️ FX Gönderisi beğenildi! (+1)', 0xef4444);
            });

            this.feedContainer.add([cg, avBg, avIcon, usr, time, vBg, vIcon, txt, e1, e2, e3, hitRepost, hitLike]);
        });
    }

    createRightSidebar() {
        let y = 100;
        const w = this.rightW;
        
        // 1. MATCH REWARDS & INCOME PANEL
        const rPanelH = 160;
        const rG = this.add.graphics();
        rG.fillStyle(0x0a011a, 0.9).fillRoundedRect(this.rightX, y, w, rPanelH, 12);
        rG.lineStyle(2, 0xfacc15, 0.5).strokeRoundedRect(this.rightX, y, w, rPanelH, 12);
        
        this.add.text(this.rightX + 16, y + 14, "🎁 MAÇ ÖDÜLLERİ", { font: '700 13px sans-serif', fill: '#facc15', letterSpacing: 1 });
        this.add.text(this.rightX + w - 16, y + 15, `🏆 ${this.competitionName.toUpperCase()}`, { font: '800 9px sans-serif', fill: '#38bdf8' }).setOrigin(1, 0);

        const rw = this.matchRewards;
        const rewardItems = [
            { label: 'Maç Primi:', val: `+${rw.matchBonus} EZ`, col: '#ffffff' },
            { label: `Gol Primi (${this.userGoals} gol):`, val: `+${rw.goalEarnings} EZ`, col: '#ffffff' },
            { label: 'Kazanılan XP:', val: `+${rw.earnedXp} XP`, col: '#a855f7' },
            { label: 'TOPLAM GELİR:', val: `+${rw.earnedCoins} EZ`, col: '#22c55e', bold: true }
        ];

        let ry = y + 36;
        rewardItems.forEach(it => {
            const font = it.bold ? '800 11.5px sans-serif' : '700 10px sans-serif';
            this.add.text(this.rightX + 16, ry, it.label, { font: font, fill: it.bold ? '#facc15' : '#94a3b8' });
            this.add.text(this.rightX + w - 16, ry, it.val, { font: font, fill: it.col }).setOrigin(1, 0);
            ry += 22;
        });

        const curEZ = window.GameStateManager && window.GameStateManager.getEZ ? window.GameStateManager.getEZ() : (window.gameState.career.ez || 0);
        const wBg = this.add.graphics();
        wBg.fillStyle(0x1a1200, 0.8).fillRoundedRect(this.rightX + 14, ry + 2, w - 28, 22, 6);
        wBg.lineStyle(1, 0xfacc15, 0.5).strokeRoundedRect(this.rightX + 14, ry + 2, w - 28, 22, 6);
        this.add.text(this.rightX + w / 2, ry + 13, `Kasa Bakiyesi: ${curEZ} EZ 🪙`, { font: '800 10px sans-serif', fill: '#facc15' }).setOrigin(0.5);

        y += rPanelH + 12;

        // 2. POPULAR TAGS
        const tPanelH = 150;
        const tG = this.add.graphics();
        tG.fillStyle(0x0a011a, 0.8).fillRoundedRect(this.rightX, y, w, tPanelH, 12);
        tG.lineStyle(2, 0x00ffff, 0.15).strokeRoundedRect(this.rightX, y, w, tPanelH, 12);
        
        this.add.text(this.rightX + 16, y + 14, "POPÜLER ETİKETLER", { font: '700 13px sans-serif', fill: '#00ffff', letterSpacing: 1 });

        let ty = y + 40;
        this.hashtags.slice(0, 4).forEach(h => {
            this.add.circle(this.rightX + 22, ty + 7, 3, 0xd946ef);
            this.add.text(this.rightX + 34, ty, h.tag, { font: '800 11px sans-serif', fill: '#ffffff' });
            this.add.text(this.rightX + w - 16, ty, h.usage + " kullanım", { font: '700 9.5px sans-serif', fill: '#94a3b8' }).setOrigin(1, 0);
            ty += 24;
        });

        y += tPanelH + 12;

        // 3. RISING CREATORS
        const cPanelH = 160;
        const cG = this.add.graphics();
        cG.fillStyle(0x0a011a, 0.8).fillRoundedRect(this.rightX, y, w, cPanelH, 12);
        cG.lineStyle(2, 0xd946ef, 0.15).strokeRoundedRect(this.rightX, y, w, cPanelH, 12);

        this.add.text(this.rightX + 16, y + 14, "YÜKSELEN İÇERİK ÜRETİCİLER", { font: '700 12.5px sans-serif', fill: '#d946ef', letterSpacing: 1 });

        let cy = y + 42;
        this.creators.forEach(c => {
            this.add.circle(this.rightX + 28, cy + 9, 13, 0x1d1330).setStrokeStyle(1, 0x00ffff);
            this.add.text(this.rightX + 28, cy + 9, "⚡", { fontSize: '12px' }).setOrigin(0.5);
            
            this.add.text(this.rightX + 50, cy, c.handle, { font: '800 11px sans-serif', fill: '#ffffff' });
            this.add.text(this.rightX + 50, cy + 14, `${c.followers} Takipçi`, { font: '700 9.5px sans-serif', fill: '#94a3b8' });
            
            const color = c.trend === 'up' ? '#22c55e' : '#ef4444';
            const arrow = c.trend === 'up' ? '⬆' : '⬇';
            this.add.text(this.rightX + w - 24, cy + 9, arrow, { font: '700 14px sans-serif', fill: color }).setOrigin(0.5);

            cy += 38;
        });
    }

    createBottomBar() {
        const barH = 65;
        const y = this.height - barH;
        const bg = this.add.graphics();
        bg.fillStyle(0x0a011a, 0.95).fillRect(0, y, this.width, barH);
        bg.lineStyle(2, 0xd946ef, 0.15).moveTo(0, y).lineTo(this.width, y).strokePath();

        // Next Match Logic
        if (this.nextFixture) {
            const hClub = window.TeamDatabase.getClub(this.nextFixture.home);
            const aClub = window.TeamDatabase.getClub(this.nextFixture.away);
            const hShort = hClub ? (hClub.shortName || hClub.abbreviation || "HOM") : "HOM";
            const aShort = aClub ? (aClub.shortName || aClub.abbreviation || "AWY") : "AWY";

            this.add.text(450, y + barH/2, "SIRADAKİ MAÇ", { font: '700 15px sans-serif', fill: '#ffffff', letterSpacing: 1 }).setOrigin(1, 0.5);
            
            // Home Logo
            this.add.circle(480, y + barH/2, 14).setStrokeStyle(2, hClub ? hClub.primaryColor : 0x00ffff);
            this.add.text(510, y + barH/2, hShort.toUpperCase(), { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(0, 0.5);
            
            this.add.text(560, y + barH/2, "VS", { font: '800 12px sans-serif', fill: '#94a3b8' }).setOrigin(0.5);

            // Away Logo
            this.add.circle(630, y + barH/2, 14).setStrokeStyle(2, aClub ? aClub.primaryColor : 0xef4444);
            this.add.text(585, y + barH/2, aShort.toUpperCase(), { font: '700 17px sans-serif', fill: '#ffffff' }).setOrigin(1, 0.5);

            const daysLeft = Math.floor(Math.random() * 4) + 2;
            const hoursLeft = Math.floor(Math.random() * 23);
            this.add.text(700, y + barH/2, `⏱️ ${daysLeft} GÜN ${hoursLeft} SAAT`, { font: '700 15px sans-serif', fill: '#facc15' }).setOrigin(0, 0.5);
        } else {
            this.add.text(this.width/2 - 100, y + barH/2, "SEZON TAMAMLANDI", { font: '700 15px sans-serif', fill: '#ffffff' }).setOrigin(0.5);
        }

        // DEVAM ET Button - positioned safely above bottom edge
        const btnW = 200;
        const btnX = this.width - btnW - 30;
        const btnY = y + 10;
        const bG = this.add.graphics();
        bG.fillGradientStyle(0xd946ef, 0xc026d3, 0xa21caf, 0x86198f, 1).fillRoundedRect(btnX, btnY, btnW, barH - 20, 8);
        
        const hitArea = this.add.rectangle(btnX + btnW/2, btnY + (barH - 20)/2, btnW, barH - 20, 0, 0).setInteractive({ useHandCursor: true });
        this.add.text(btnX + btnW/2, btnY + (barH - 20)/2, "DEVAM ET   ▶", { font: '700 17px sans-serif', fill: '#ffffff', letterSpacing: 2 }).setOrigin(0.5);

        hitArea.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('CareerWorldScene'));
        });
    }

    showToast(message, color = 0x00ffff) {
        if (this._toastContainer) {
            this._toastContainer.destroy();
        }

        const toast = this.add.container(this.width / 2, 75).setDepth(999);
        const bg = this.add.graphics();
        const msgLen = Math.max(260, message.length * 9 + 40);
        bg.fillStyle(0x0f172a, 0.95);
        bg.fillRoundedRect(-msgLen / 2, -18, msgLen, 36, 8);
        bg.lineStyle(1.5, color, 0.9);
        bg.strokeRoundedRect(-msgLen / 2, -18, msgLen, 36, 8);

        const txt = this.add.text(0, 0, message, {
            font: '800 12px sans-serif', fill: '#ffffff'
        }).setOrigin(0.5);

        toast.add([bg, txt]);
        this._toastContainer = toast;

        this.tweens.add({
            targets: toast,
            y: 85,
            alpha: { from: 0, to: 1 },
            duration: 180,
            ease: 'Power2'
        });

        this.time.delayedCall(1600, () => {
            if (toast && toast.active) {
                this.tweens.add({
                    targets: toast,
                    alpha: 0,
                    y: 70,
                    duration: 220,
                    onComplete: () => toast.destroy()
                });
            }
        });
    }
}
