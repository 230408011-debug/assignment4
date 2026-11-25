class UIUtils {
    static addClickFeedback(scene, object, scaleDown = 0.95, duration = 60) {
        if (!object || !scene) return;
        
        // Ensure interactive if not already
        if (!object.input) {
            object.setInteractive({ useHandCursor: true });
        }
        
        // Use standard original scale
        const origScaleX = object.scaleX || 1;
        const origScaleY = object.scaleY || 1;
        
        object.on('pointerdown', () => {
            if (window.audioManager) window.audioManager.playSFX('button_click');
            scene.tweens.add({
                targets: object,
                scaleX: origScaleX * scaleDown,
                scaleY: origScaleY * scaleDown,
                alpha: 0.8,
                duration: duration,
                ease: 'Sine.easeOut'
            });
        });
        
        const resetAnim = () => {
            scene.tweens.add({
                targets: object,
                scaleX: origScaleX,
                scaleY: origScaleY,
                alpha: 1,
                duration: duration * 1.5,
                ease: 'Sine.easeOut'
            });
        };
        
        object.on('pointerup', resetAnim);
        object.on('pointerout', resetAnim);
    }

    static createBackButton(scene, x = 40, y = 40, callback = null) {
        if (!scene) return null;
        const safe = window.getSafeArea ? window.getSafeArea() : { safeLeft: 0, safeTop: 0 };
        const posX = Math.max(x, safe.safeLeft + 35);
        const posY = Math.max(y, safe.safeTop + 35);

        const container = scene.add.container(posX, posY);
        
        const bg = scene.add.graphics();
        bg.fillStyle(0x0f172a, 0.85);
        bg.lineStyle(2, 0xdb2777, 0.9);
        bg.fillCircle(0, 0, 24);
        bg.strokeCircle(0, 0, 24);

        const txt = scene.add.text(0, 0, "❮", { font: '900 20px sans-serif', fill: '#ffffff' }).setOrigin(0.5);

        const hit = scene.add.circle(0, 0, 32, 0x000000, 0).setInteractive({ useHandCursor: true });
        
        container.add([bg, txt, hit]);

        this.addClickFeedback(scene, hit);

        hit.on('pointerdown', () => {
            if (callback) {
                callback();
            } else if (window.navigateBack) {
                window.navigateBack();
            }
        });

        return container;
    }

    static formatPositionTR(pos) {
        if (!pos) return 'Forvet';
        const p = String(pos).toUpperCase().trim();
        const map = {
            'ST': 'Forvet',
            'CF': 'Forvet',
            'RW': 'Sağ Kanat',
            'LW': 'Sol Kanat',
            'MID': 'Orta Saha',
            'CM': 'Orta Saha',
            'CAM': 'Ofansif Orta Saha',
            'CDM': 'Defansif Orta Saha',
            'DEF': 'Defans',
            'CB': 'Stoper',
            'LB': 'Sol Bek',
            'RB': 'Sağ Bek',
            'GK': 'Kaleci'
        };
        return map[p] || (p.includes('ST') || p.includes('FOR') || p.includes('ATT') ? 'Forvet' :
               p.includes('MID') || p.includes('ORT') ? 'Orta Saha' :
               p.includes('DEF') || p.includes('BEK') ? 'Defans' :
               p.includes('GK') || p.includes('KAL') ? 'Kaleci' : p);
    }

    static drawClubShield(scene, x, y, club, size = 50) {
        if (!scene) return null;
        const cont = scene.add.container(x, y);
        const cObj = club || { name: 'FC', shortName: 'FC', primaryColor: 0x38bdf8, secondaryColor: 0xffffff };
        const pColor = typeof cObj.primaryColor === 'number' ? cObj.primaryColor : 0x38bdf8;
        const sColor = typeof cObj.secondaryColor === 'number' ? cObj.secondaryColor : 0xffffff;
        const w = size;
        const h = Math.round(size * 1.15);

        // Glow
        const glow = scene.add.graphics();
        glow.fillStyle(pColor, 0.25);
        glow.fillCircle(0, 0, Math.round(size * 0.7));

        // Shield graphics
        const sg = scene.add.graphics();
        sg.fillStyle(pColor, 1);
        sg.lineStyle(Math.max(2, Math.round(size * 0.06)), sColor, 1);

        sg.beginPath();
        sg.moveTo(-w / 2, -h / 2);
        sg.lineTo(w / 2, -h / 2);
        sg.lineTo(w / 2, -h * 0.05);
        sg.lineTo(0, h / 2);
        sg.lineTo(-w / 2, -h * 0.05);
        sg.closePath();
        sg.fillPath();
        sg.strokePath();

        // Secondary color accent stripe
        const ag = scene.add.graphics();
        ag.fillStyle(sColor, 0.35);
        ag.beginPath();
        ag.moveTo(-w * 0.1, -h / 2);
        ag.lineTo(w * 0.2, -h / 2);
        ag.lineTo(0, h * 0.45);
        ag.lineTo(-w * 0.2, h * 0.45);
        ag.closePath();
        ag.fillPath();

        // Monogram / Short Name
        const label = cObj.shortName ? cObj.shortName.substring(0, 3).toUpperCase() : (cObj.name ? cObj.name.substring(0, 3).toUpperCase() : 'FC');
        const fontSize = Math.max(10, Math.round(size * 0.32));
        const txt = scene.add.text(0, -Math.round(h * 0.05), label, {
            font: `900 ${fontSize}px sans-serif`,
            fill: '#ffffff'
        }).setOrigin(0.5);
        txt.setShadow(0, 1, '#000000', 3, true, true);

        cont.add([glow, sg, ag, txt]);
        return cont;
    }
}
window.UIUtils = UIUtils;

