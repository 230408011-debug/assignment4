class BallShopScene extends Phaser.Scene {
    constructor() {
        super('BallShopScene');
        this.balls = [
            { id: 'ball_basic', name: 'KLASİK TOP', level: 1, xp: 0, bounce: 0.6, description: 'Standart sokak futbolu topu.', rarity: 'COMMON', badge: 'BAŞLANGIÇ', class: 'common' },
            { id: 'ball_street', name: 'SOKAK TOPU', level: 2, xp: 100, bounce: 0.65, description: 'Daha iyi sekme ve kontrol.', rarity: 'NADİR', badge: 'SOKAK', class: 'rare' },
            { id: 'ball_neon', name: 'NEON TOP', level: 3, xp: 250, bounce: 0.65, description: 'Gece maçları için özel neon kaplama.', rarity: 'EPİK', badge: 'NEON', class: 'epic' },
            { id: 'ball_fire', name: 'ATEŞ TOPU', level: 4, xp: 500, bounce: 0.7, description: 'Yüksek hız ve vuruş gücü!', rarity: 'EPİK', badge: 'ATEŞ', class: 'special' },
            { id: 'ball_legendary', name: 'EFSANEVİ TOP', level: 5, xp: 1000, bounce: 0.75, description: 'Sahanın gerçek efsaneleri için.', rarity: 'EFSANEVİ', badge: 'EFSANE', class: 'legendary' }
        ];
        this.currentTab = 'TÜMÜ'; // TÜMÜ, SAHİP OLUNAN, KİLİTLİ
    }

    create() {
        this.width = this.cameras.main.width;
        this.height = this.cameras.main.height;

        this.input.on('gameobjectdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
        });

        // Clean any existing overlay first
        const existing = document.getElementById('cyber-shop-overlay');
        if (existing) existing.remove();

        // Inject Stylesheet
        this.injectStyles();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'cyber-shop-overlay';
        overlay.className = 'ball-shop-overlay';

        // Background Image Underlay
        const bgUnderlay = document.createElement('div');
        bgUnderlay.className = 'ball-shop-bg-image';
        overlay.appendChild(bgUnderlay);

        // Render Function
        const render = () => {
            const xp = window.gameState.player.xp || 0;
            const currentLevel = this.calculateLevel(xp);
            const nextLevelXP = this.balls[currentLevel + 1] ? this.balls[currentLevel + 1].xp : 1000;
            const prevLevelXP = currentLevel > 0 ? this.balls[currentLevel].xp : 0;
            const progressPercent = Phaser.Math.Clamp(((xp - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100, 0, 100);

            const unlockedCount = window.gameState.customization.unlockedBalls.length;
            const totalCount = this.balls.length;

            // Filtered Balls
            let filteredBalls = this.balls;
            if (this.currentTab === 'SAHİP OLUNAN') {
                filteredBalls = this.balls.filter(b => window.gameState.customization.unlockedBalls.includes(b.id));
            } else if (this.currentTab === 'KİLİTLİ') {
                filteredBalls = this.balls.filter(b => !window.gameState.customization.unlockedBalls.includes(b.id));
            }

            overlay.innerHTML = '';
            overlay.appendChild(bgUnderlay);

            // Structure Builder
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.height = '100%';

            container.innerHTML = `
                <!-- TOP HEADER -->
                <div class="shop-header">
                    <div class="shop-back-btn" id="cyber-shop-back-btn">←</div>
                    
                    <div class="progress-widget">
                        <span class="progress-widget-icon">⚽</span>
                        <div class="progress-widget-details">
                            <span class="progress-widget-title">${unlockedCount}/${totalCount} AÇILDI</span>
                            <span class="progress-widget-sub">Koleksiyon İlerlemesi</span>
                        </div>
                    </div>

                    <div class="shop-center-area">
                        <span class="shop-title">TOP KOLEKSİYONU</span>
                        <span class="shop-subtitle">TOP SEVİYESİ: ${currentLevel + 1}</span>
                        <div class="xp-bar-container">
                            <div class="xp-bar-fill" style="width: ${progressPercent}%"></div>
                            <span class="xp-bar-text">${xp} / ${nextLevelXP} XP</span>
                        </div>
                    </div>

                    <div class="filter-widget">
                        <button class="filter-btn">
                            <span>⚙</span> Nadirliğe Göre
                        </button>
                    </div>
                </div>

                <!-- TABS -->
                <div class="tabs-bar">
                    <button class="tab-item ${this.currentTab === 'TÜMÜ' ? 'active' : ''}" data-tab="TÜMÜ">Tümü</button>
                    <button class="tab-item ${this.currentTab === 'SAHİP OLUNAN' ? 'active' : ''}" data-tab="SAHİP OLUNAN">Sahip Olunan</button>
                    <button class="tab-item ${this.currentTab === 'KİLİTLİ' ? 'active' : ''}" data-tab="KİLİTLİ">Kilitli</button>
                </div>

                <!-- CARDS GRID -->
                <div class="cards-container">
                    ${filteredBalls.map(ball => {
                        const isUnlocked = window.gameState.customization.unlockedBalls.includes(ball.id);
                        const isSelected = window.gameState.customization.equipped.ball === ball.id;
                        
                        let actionHtml = '';
                        if (isSelected) {
                            actionHtml = `<button class="card-action-btn btn-equipped">✔ SEÇİLDİ</button>`;
                        } else if (isUnlocked) {
                            actionHtml = `<button class="card-action-btn btn-equip" data-equip-id="${ball.id}">SEÇ</button>`;
                        } else {
                            actionHtml = `<button class="card-action-btn btn-locked">${ball.xp} XP GEREKLİ</button>`;
                        }

                        const visualHtml = isUnlocked 
                            ? this.drawBallSVG(ball.id) 
                            : `<div class="locked-hud-ring"><span class="lock-icon">🔒</span></div>`;

                        return `
                            <div class="ball-card ${ball.class} ${isSelected ? 'selected' : ''}">
                                <div class="card-badge ${ball.class}">${ball.badge}</div>
                                <div class="ball-visual-container">
                                    ${visualHtml}
                                </div>
                                <span class="ball-name">${ball.name}</span>
                                <p class="ball-desc">${ball.description}</p>
                                <span class="ball-rarity ${ball.class}">• ${ball.rarity} •</span>
                                ${actionHtml}
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- FOOTER -->
                <div class="shop-footer">
                    <div class="footer-info">
                        <span class="footer-info-icon">ℹ</span>
                        <span class="footer-info-text">
                            Daha fazla top aç, daha fazla stil kazan!<br>
                            Her top, sahadaki tarzını yansıtır.
                        </span>
                    </div>

                    <div class="brand-panel">
                        <span class="brand-icon">⚽</span>
                        <div class="brand-details">
                            <span class="brand-title">FURIO FC</span>
                            <span class="brand-sub">Sokakta Efsane Ol</span>
                        </div>
                    </div>
                </div>
            `;

            overlay.appendChild(container);
            attachEvents();
        };

        const attachEvents = () => {
            // Back Button
            const backBtn = overlay.querySelector('#cyber-shop-back-btn');
            if (backBtn) {
                const closeShop = () => {
                    this.cameras.main.fadeOut(300);
                    this.time.delayedCall(300, () => {
                        overlay.remove();
                        this.scene.start('MenuScene');
                    });
                };
                backBtn.onclick = closeShop;
                backBtn.ontouchend = (e) => { e.preventDefault(); closeShop(); };
            }

            // Tab Buttons
            const tabs = overlay.querySelectorAll('[data-tab]');
            tabs.forEach(tab => {
                tab.onclick = (e) => {
                    this.currentTab = e.target.getAttribute('data-tab');
                    render();
                };
            });

            // Equip Buttons
            const equipBtns = overlay.querySelectorAll('[data-equip-id]');
            equipBtns.forEach(btn => {
                btn.onclick = (e) => {
                    const id = e.target.getAttribute('data-equip-id');
                    window.gameState.customization.equipped.ball = id;
                    if (window.SaveManager) window.SaveManager.save();
                    render();
                };
            });
        };

        render();
        document.body.appendChild(overlay);

        this.cameras.main.fadeIn(500);
    }

    calculateLevel(xp) {
        let level = 0;
        for (let i = 0; i < this.balls.length; i++) {
            if (xp >= this.balls[i].xp) level = i;
        }
        return level;
    }

    drawBallSVG(id) {
        if (id === 'ball_basic') {
            return `
                <svg class="svg-ball" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="17" fill="#ffffff" stroke="#000000" stroke-width="1.5"/>
                    <path d="M18 12 L15 16 L21 16 Z M11 19 L15 16 M25 19 L21 16 M18 12 L18 6 M6 12 L11 19 M30 12 L25 19" stroke="#000000" stroke-width="1.5" fill="#000000"/>
                    <circle cx="18" cy="18" r="4.5" fill="#000000"/>
                    <circle cx="6" cy="10" r="3.5" fill="#000000"/>
                    <circle cx="30" cy="10" r="3.5" fill="#000000"/>
                    <circle cx="10" cy="28" r="3.5" fill="#000000"/>
                    <circle cx="26" cy="28" r="3.5" fill="#000000"/>
                </svg>
            `;
        } else if (id === 'ball_street') {
            return `
                <svg class="svg-ball" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="17" fill="#374151" stroke="#1f2937" stroke-width="1.5"/>
                    <circle cx="10" cy="10" r="1.5" fill="#f3f4f6" opacity="0.3"/>
                    <circle cx="26" cy="12" r="2" fill="#f3f4f6" opacity="0.4"/>
                    <circle cx="14" cy="24" r="1.2" fill="#f3f4f6" opacity="0.3"/>
                    <circle cx="22" cy="28" r="1.8" fill="#f3f4f6" opacity="0.3"/>
                    <path d="M6 18 Q 18 12 30 18 M10 24 Q 18 20 26 24" stroke="#111827" stroke-width="1" fill="none"/>
                </svg>
            `;
        } else if (id === 'ball_neon') {
            return `
                <svg class="svg-ball" viewBox="0 0 36 36" style="filter: drop-shadow(0 0 6px #06b6d4)">
                    <circle cx="18" cy="18" r="17" fill="#000000" stroke="#06b6d4" stroke-width="2"/>
                    <circle cx="18" cy="18" r="10" fill="rgba(6, 182, 212, 0.2)" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2,2"/>
                    <circle cx="18" cy="18" r="4.5" fill="#ffffff" stroke="#06b6d4" stroke-width="1"/>
                </svg>
            `;
        } else if (id === 'ball_fire') {
            return `
                <svg class="svg-ball" viewBox="0 0 36 36" style="filter: drop-shadow(0 0 8px #f97316)">
                    <circle cx="18" cy="18" r="17" fill="#e11d48" stroke="#f97316" stroke-width="2"/>
                    <circle cx="18" cy="18" r="12" fill="#f97316"/>
                    <circle cx="18" cy="18" r="6" fill="#facc15"/>
                    <path d="M 12 18 Q 18 8 24 18 Q 18 28 12 18 Z" fill="rgba(255, 255, 255, 0.4)"/>
                </svg>
            `;
        } else if (id === 'ball_legendary') {
            return `
                <svg class="svg-ball" viewBox="0 0 36 36" style="filter: drop-shadow(0 0 8px #eab308)">
                    <circle cx="18" cy="18" r="17" fill="#1e1b4b" stroke="#eab308" stroke-width="2.5"/>
                    <polygon points="18,4 21,12 29,12 23,17 25,25 18,20 11,25 13,17 7,12 15,12" fill="#eab308"/>
                </svg>
            `;
        }
        return '';
    }

    injectStyles() {
        const styleId = 'cyberpunk-shop-style';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .ball-shop-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100dvh;
                background: radial-gradient(circle at center, rgba(15, 23, 42, 0.85) 0%, rgba(3, 7, 18, 0.98) 100%);
                z-index: 10000;
                font-family: 'sans-serif', sans-serif;
                user-select: none;
                -webkit-user-select: none;
                display: flex;
                flex-direction: column;
                padding: calc(8px + var(--sat, env(safe-area-inset-top, 0px))) calc(16px + var(--sar, env(safe-area-inset-right, 15px))) calc(8px + var(--sab, env(safe-area-inset-bottom, 0px))) calc(16px + var(--sal, env(safe-area-inset-left, 15px)));
                box-sizing: border-box;
                overflow: hidden;
            }

            .ball-shop-bg-image {
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                background: url('assets/bg_stadium.png') no-repeat center center/cover;
                opacity: 0.15;
                filter: blur(2px);
                z-index: -1;
            }

            .shop-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
                height: 44px;
                flex-shrink: 0;
            }

            .shop-back-btn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(15, 23, 42, 0.6);
                border: 2px solid #db2777;
                color: #fff;
                font-size: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                box-shadow: 0 0 15px rgba(219, 39, 119, 0.4);
                transition: all 0.2s ease;
            }
            .shop-back-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 0 25px #db2777;
                background: #db2777;
            }

            .progress-widget {
                background: rgba(20, 25, 45, 0.6);
                border: 1px solid rgba(6, 182, 212, 0.3);
                border-radius: 10px;
                padding: 4px 10px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
            }
            .progress-widget-icon {
                font-size: 20px;
                filter: drop-shadow(0 0 8px #06b6d4);
            }
            .progress-widget-details {
                display: flex;
                flex-direction: column;
            }
            .progress-widget-title {
                font-size: 11px;
                font-weight: 900;
                color: #06b6d4;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .progress-widget-sub {
                font-size: 8px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .shop-center-area {
                display: flex;
                flex-direction: column;
                align-items: center;
                flex-grow: 1;
            }
            .shop-title {
                font-size: 20px;
                font-weight: 900;
                color: #fff;
                letter-spacing: 2px;
                text-shadow: 0 0 15px rgba(219, 39, 119, 0.6);
                text-transform: uppercase;
            }
            .shop-subtitle {
                font-size: 10px;
                font-weight: 700;
                color: #cbd5e1;
                letter-spacing: 1px;
                text-transform: uppercase;
            }

            .xp-bar-container {
                width: 240px;
                height: 18px;
                background: rgba(15, 23, 42, 0.8);
                border: 1.5px solid #db2777;
                border-radius: 9px;
                position: relative;
                margin-top: 2px;
                overflow: hidden;
                box-shadow: 0 0 15px rgba(219, 39, 119, 0.3);
            }
            .xp-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #7c3aed 0%, #db2777 100%);
                width: 0%;
                transition: width 0.5s ease;
                box-shadow: 0 0 10px #db2777;
            }
            .xp-bar-text {
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                font-size: 9px;
                font-weight: 900;
                color: #fff;
                letter-spacing: 1px;
                text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            }

            .filter-widget {
                position: relative;
            }
            .filter-btn {
                background: rgba(20, 25, 45, 0.6);
                border: 1px solid rgba(124, 58, 237, 0.4);
                border-radius: 12px;
                padding: 10px 16px;
                color: #cbd5e1;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
                text-transform: uppercase;
            }
            .filter-btn:hover {
                border-color: #06b6d4;
                color: #fff;
                box-shadow: 0 0 12px rgba(6, 182, 212, 0.3);
            }

            .tabs-bar {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-top: 6px;
                flex-shrink: 0;
            }
            .tab-item {
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(124, 58, 237, 0.4);
                border-radius: 14px;
                padding: 4px 14px;
                color: #94a3b8;
                font-size: 10px;
                font-weight: 900;
                cursor: pointer;
                transition: all 0.2s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .tab-item:hover {
                border-color: #db2777;
                color: #fff;
            }
            .tab-item.active {
                background: rgba(219, 39, 119, 0.15);
                border-color: #db2777;
                color: #fff;
                box-shadow: 0 0 12px rgba(219, 39, 119, 0.4);
                text-shadow: 0 0 5px #fff;
            }

            .cards-container {
                display: flex;
                justify-content: flex-start;
                align-items: center;
                gap: 12px;
                flex-grow: 1;
                min-height: 0;
                margin-top: 6px;
                margin-bottom: 6px;
                overflow-x: auto;
                overflow-y: hidden;
                padding: 4px 4px;
                -webkit-overflow-scrolling: touch;
            }

            .ball-card {
                width: 140px;
                height: 100%;
                max-height: 190px;
                flex-shrink: 0;
                background: rgba(15, 20, 35, 0.85);
                border-radius: 12px;
                position: relative;
                padding: 8px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .ball-card.common { border: 1.5px solid rgba(219, 39, 119, 0.3); }
            .ball-card.rare { border: 1.5px solid rgba(6, 182, 212, 0.3); }
            .ball-card.epic { border: 1.5px solid rgba(168, 85, 247, 0.3); }
            .ball-card.special { border: 1.5px solid rgba(249, 115, 22, 0.3); }
            .ball-card.legendary { border: 1.5px solid rgba(234, 179, 8, 0.3); }

            .ball-card:hover {
                transform: translateY(-4px);
            }
            .ball-card.common:hover { box-shadow: 0 0 15px rgba(219, 39, 119, 0.3); border-color: #db2777; }
            .ball-card.rare:hover { box-shadow: 0 0 15px rgba(6, 182, 212, 0.3); border-color: #06b6d4; }
            .ball-card.epic:hover { box-shadow: 0 0 15px rgba(168, 85, 247, 0.3); border-color: #a855f7; }
            .ball-card.special:hover { box-shadow: 0 0 15px rgba(249, 115, 22, 0.3); border-color: #f97316; }
            .ball-card.legendary:hover { box-shadow: 0 0 15px rgba(234, 179, 8, 0.3); border-color: #eab308; }

            .ball-card.selected {
                transform: translateY(-4px);
            }
            .ball-card.common.selected { box-shadow: 0 0 20px rgba(219, 39, 119, 0.6); border: 2px solid #db2777; }
            .ball-card.rare.selected { box-shadow: 0 0 20px rgba(6, 182, 212, 0.6); border: 2px solid #06b6d4; }
            .ball-card.epic.selected { box-shadow: 0 0 20px rgba(168, 85, 247, 0.6); border: 2px solid #a855f7; }
            .ball-card.special.selected { box-shadow: 0 0 20px rgba(249, 115, 22, 0.6); border: 2px solid #f97316; }
            .ball-card.legendary.selected { box-shadow: 0 0 20px rgba(234, 179, 8, 0.6); border: 2px solid #eab308; }

            .card-badge {
                position: absolute;
                top: 6px; left: 6px;
                font-size: 7px;
                font-weight: 900;
                padding: 2px 6px;
                border-radius: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .card-badge.common { background: rgba(219, 39, 119, 0.15); border: 1px solid #db2777; color: #db2777; }
            .card-badge.rare { background: rgba(6, 182, 212, 0.15); border: 1px solid #06b6d4; color: #06b6d4; }
            .card-badge.epic { background: rgba(168, 85, 247, 0.15); border: 1px solid #a855f7; color: #a855f7; }
            .card-badge.special { background: rgba(249, 115, 22, 0.15); border: 1px solid #f97316; color: #f97316; }
            .card-badge.legendary { background: rgba(234, 179, 8, 0.15); border: 1px solid #eab308; color: #eab308; }

            .ball-visual-container {
                width: 48px;
                height: 48px;
                margin-top: 12px;
                margin-bottom: 2px;
                display: flex;
                justify-content: center;
                align-items: center;
                position: relative;
            }

            .locked-hud-ring {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 2px dashed #64748b;
                position: absolute;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            .ball-card.rare .locked-hud-ring { border-color: rgba(6, 182, 212, 0.5); }
            .ball-card.epic .locked-hud-ring { border-color: rgba(168, 85, 247, 0.5); }
            .ball-card.special .locked-hud-ring { border-color: rgba(249, 115, 22, 0.5); }
            .ball-card.legendary .locked-hud-ring { border-color: rgba(234, 179, 8, 0.5); }

            .lock-icon {
                font-size: 18px;
                color: #64748b;
            }

            .svg-ball {
                width: 42px;
                height: 42px;
                filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.3));
            }
            .ball-card.selected .svg-ball {
                animation: rotateBall 8s linear infinite;
            }
            @keyframes rotateBall {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .ball-name {
                font-size: 11px;
                font-weight: 900;
                color: #fff;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-align: center;
            }
            .ball-desc {
                font-size: 9px;
                color: #94a3b8;
                text-align: center;
                line-height: 1.1;
                max-height: 22px;
                overflow: hidden;
                margin: 2px 0;
            }
            .ball-rarity {
                font-size: 7px;
                font-weight: 700;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 4px;
            }

            .card-action-btn {
                width: 100%;
                padding: 5px 0;
                border-radius: 6px;
                border: none;
                font-size: 10px;
                font-weight: 900;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                transition: all 0.2s ease;
            }
            .btn-equip {
                background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%);
                border: 1px solid rgba(168, 85, 247, 0.4);
                color: #fff;
            }
            .btn-equipped {
                background: rgba(34, 197, 94, 0.15);
                border: 1px solid #22c55e;
                color: #22c55e;
                cursor: default;
            }
            .btn-locked {
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                cursor: not-allowed;
            }

            .shop-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                height: 32px;
                flex-shrink: 0;
                margin-top: auto;
            }
            .footer-info {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .footer-info-icon {
                font-size: 14px;
                color: #06b6d4;
            }
            .footer-info-text {
                font-size: 9px;
                color: #cbd5e1;
                line-height: 1.2;
            }

            .brand-panel {
                background: linear-gradient(90deg, rgba(124, 58, 237, 0.2) 0%, rgba(219, 39, 119, 0.2) 100%);
                border: 1px solid #db2777;
                border-radius: 6px;
                padding: 4px 10px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .brand-icon {
                font-size: 14px;
                animation: rotateBall 15s linear infinite;
            }
            .brand-details {
                display: flex;
                flex-direction: column;
            }
            .brand-title {
                font-size: 10px;
                font-weight: 900;
                color: #fff;
            }
            .brand-sub {
                font-size: 7px;
                color: #cbd5e1;
                text-transform: uppercase;
            }
        `;
        document.head.appendChild(style);
    }
}
