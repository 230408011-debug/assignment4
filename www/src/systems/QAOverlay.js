/**
 * QAOverlay.js - FURIO FC Developer QA Control Panel Overlay
 * Floating developer panel for career reset, data validation, test matches, stat upgrades, and reports.
 */

class QAOverlay {
    constructor() {
        this.isVisible = false;
        this.container = null;
    }

    init() {
        // Expose keyboard shortcut (Shift + D) for toggling QA Panel in debug mode
        if (typeof window !== 'undefined') {
            window.addEventListener('keydown', (e) => {
                if (e.shiftKey && e.key.toUpperCase() === 'D') {
                    if (window.QA_MODE || window.DEBUG_BUILD) {
                        this.toggle();
                    }
                }
            });
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        if (this.container) this.container.remove();

        const div = document.createElement('div');
        div.id = 'furio-qa-overlay';
        div.style.position = 'fixed';
        div.style.top = '10px';
        div.style.right = '10px';
        div.style.width = '320px';
        div.style.maxHeight = '90vh';
        div.style.overflowY = 'auto';
        div.style.backgroundColor = 'rgba(6, 11, 22, 0.95)';
        div.style.border = '2px solid #38bdf8';
        div.style.borderRadius = '10px';
        div.style.padding = '12px';
        div.style.boxShadow = '0 0 20px rgba(56, 189, 248, 0.5)';
        div.style.zIndex = '999999';
        div.style.color = '#ffffff';
        div.style.fontFamily = 'monospace, sans-serif';
        div.style.fontSize = '12px';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #38bdf8; padding-bottom:6px;">
                <strong style="color:#38bdf8;">🛠️ FURIO FC QA PANEL</strong>
                <button id="qa-close-btn" style="background:#ef4444; border:none; color:white; padding:2px 8px; border-radius:4px; cursor:pointer;">X</button>
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:10px;">
                <button class="qa-btn" id="qa-fresh-career" style="grid-column: span 2; background:#0284c7; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer;">⚡ FRESH CAREER TEST</button>
                <button class="qa-btn" id="qa-run-regression" style="grid-column: span 2; background:#9333ea; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer;">🧪 RUN FULL REGRESSION</button>
            </div>

            <div style="margin-bottom:8px;">
                <div style="color:#94a3b8; font-weight:bold; margin-bottom:4px;">CAREER CONTROLS</div>
                <button class="qa-btn" id="qa-reset-career" style="width:100%; background:#334155; color:white; border:none; padding:4px; border-radius:4px; margin-bottom:4px; cursor:pointer;">RESET CAREER</button>
            </div>

            <div style="margin-bottom:8px;">
                <div style="color:#94a3b8; font-weight:bold; margin-bottom:4px;">DATABASE VALIDATION</div>
                <button class="qa-btn" id="qa-val-db" style="width:100%; background:#334155; color:white; border:none; padding:4px; border-radius:4px; margin-bottom:4px; cursor:pointer;">VALIDATE 2026 DB</button>
                <button class="qa-btn" id="qa-val-victor" style="width:100%; background:#334155; color:white; border:none; padding:4px; border-radius:4px; margin-bottom:4px; cursor:pointer;">VALIDATE VICTOR ASIMHEN</button>
            </div>

            <div style="margin-bottom:8px;">
                <div style="color:#94a3b8; font-weight:bold; margin-bottom:4px;">DEVELOPMENT & STATS</div>
                <button class="qa-btn" id="qa-add-ez" style="width:100%; background:#334155; color:white; border:none; padding:4px; border-radius:4px; margin-bottom:4px; cursor:pointer;">+500 EZ POINTS</button>
                <button class="qa-btn" id="qa-upg-dribble" style="width:100%; background:#334155; color:white; border:none; padding:4px; border-radius:4px; margin-bottom:4px; cursor:pointer;">+5 DRIBBLING STAT</button>
            </div>

            <div id="qa-report-output" style="background:#020617; border:1px solid #1e293b; padding:8px; border-radius:4px; max-height:150px; overflow-y:auto; font-size:11px; white-space:pre-wrap; color:#38bdf8;">QA Panel Ready.\nPress Shift+D to toggle.</div>
        `;

        document.body.appendChild(div);
        this.container = div;
        this.isVisible = true;
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('qa-close-btn').onclick = () => this.hide();
        
        document.getElementById('qa-fresh-career').onclick = () => {
            const res = window.QAController.startFreshCareerTest();
            this.logOutput(res ? "✅ Fresh career test initialized successfully!" : "❌ Fresh career test failed.");
        };

        document.getElementById('qa-run-regression').onclick = () => {
            const report = window.QAController.runFullRegression();
            this.logOutput(`--- REGRESSION REPORT ---\n${report.summary}\n\n` + report.details.join('\n'));
        };

        document.getElementById('qa-reset-career').onclick = () => {
            if (window.gameState) window.gameState.career = { started: false };
            this.logOutput("Career state reset.");
        };

        document.getElementById('qa-val-db').onclick = () => {
            const res = window.QAValidator.validateFootballDatabase();
            this.logOutput(res.pass ? `✅ DB VALID (Clubs: ${res.clubsCount}, Players: ${res.playersCount})` : `❌ DB FAIL: ${res.errors.join(', ')}`);
        };

        document.getElementById('qa-val-victor').onclick = () => {
            const res = window.QAValidator.validateVictorAsimhen();
            this.logOutput(res.pass ? `✅ VICTOR ASIMHEN VALID (${res.player.name}, Club: ${res.player.clubId}, Pos: ${res.player.position})` : `❌ VICTOR FAIL: ${res.error || res.errors.join(', ')}`);
        };

        document.getElementById('qa-add-ez').onclick = () => {
            if (window.gameState && window.gameState.career) {
                window.gameState.career.ez = (window.gameState.career.ez || 0) + 500;
                this.logOutput(`Added +500 EZ. Total: ${window.gameState.career.ez}`);
            }
        };

        document.getElementById('qa-upg-dribble').onclick = () => {
            if (window.gameState && window.gameState.player && window.gameState.player.attributes) {
                window.gameState.player.attributes.dribbling = Math.min(100, (window.gameState.player.attributes.dribbling || 60) + 5);
                this.logOutput(`Upgraded Dribbling to ${window.gameState.player.attributes.dribbling}`);
            }
        };
    }

    logOutput(txt) {
        const out = document.getElementById('qa-report-output');
        if (out) out.innerText = txt;
    }

    hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isVisible = false;
    }
}

window.QAOverlay = new QAOverlay();
