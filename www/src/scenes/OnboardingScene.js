class OnboardingScene extends Phaser.Scene {
    constructor() {
        super('OnboardingScene');
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        const cx = width / 2;
        const cy = height / 2;

        // FTUE Start Event
        if (window.AnalyticsService) {
            window.AnalyticsService.trackOnce('ftue_start', { timestamp: Date.now() });
        }

        // Cinematic Background
        this.bg = this.add.image(cx, cy, 'bg_stadium');
        const scale = Math.max(width / this.bg.width, height / this.bg.height);
        this.bg.setScale(scale * 1.05);
        this.bg.setTint(0x333333);
        
        // Gentle Camera Sway Parallax
        this.tweens.add({
            targets: this.bg,
            x: cx + 20,
            y: cy + 10,
            duration: 15000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // HTML Overlay
        const htmlString = `
        <style>
        .onboarding-container {
            width: 580px;
            max-width: 95vw;
            max-height: 80vh;
            overflow-y: auto;
            background: rgba(10, 5, 20, 0.95);
            border: 2px solid #38bdf8;
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 0 40px rgba(56, 189, 248, 0.3);
            backdrop-filter: blur(15px);
            font-family: 'Outfit', sans-serif;
            color: white;
            text-align: center;
            box-sizing: border-box;
            transform: scale(0.9);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
        }
        
        @media (orientation: landscape) and (max-height: 500px) {
            .onboarding-container {
                max-height: 90vh;
                padding: 10px;
            }
            .onboarding-container h2 {
                margin: 5px 0;
                font-size: 20px;
            }
            .form-group {
                margin-bottom: 10px;
            }
        }
        /* Custom scrollbar for mobile overflow */
        .onboarding-container::-webkit-scrollbar { width: 6px; }
        .onboarding-container::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .onboarding-container::-webkit-scrollbar-thumb { background: #c084fc; border-radius: 3px; }

        .onboarding-container.active {
            transform: scale(1);
            opacity: 1;
        }
        @media (max-height: 500px) {
            .onboarding-container { padding: 10px; }
            .onboarding-title { font-size: 18px; margin-bottom: 2px; }
            .onboarding-sub { margin-bottom: 8px; }
            .cyber-input { padding: 8px 10px; font-size: 14px; }
            .submit-btn { padding: 8px; margin-top: 8px; font-size: 16px; }
            .input-group { margin-bottom: 6px; }
            .input-group label { margin-bottom: 2px; }
        }
        .onboarding-title {
            font-size: clamp(20px, 4vw, 32px);
            font-weight: 900;
            margin-bottom: 4px;
            color: #ffffff;
            text-shadow: 0 0 15px #c084fc;
            letter-spacing: 2px;
        }
        .onboarding-sub {
            font-size: clamp(11px, 2.5vw, 14px);
            color: #94a3b8;
            margin-bottom: 18px;
            letter-spacing: 1px;
        }
        .input-group {
            margin-bottom: 12px;
            text-align: left;
        }
        .input-group label {
            display: block;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 6px;
            color: #38bdf8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .input-row {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .input-row .input-group {
            flex: 1;
            min-width: 200px;
        }
        .cyber-input {
            width: 100%;
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid #475569;
            border-radius: 8px;
            padding: 14px 16px;
            font-size: 16px;
            color: white;
            font-family: 'Outfit', sans-serif;
            outline: none;
            transition: all 0.3s;
            box-sizing: border-box;
        }
        .cyber-input:focus {
            border-color: #c084fc;
            box-shadow: 0 0 15px rgba(192, 132, 252, 0.4);
            background: rgba(15, 23, 42, 1);
        }
        .cyber-input::placeholder {
            color: #475569;
        }
        .validation-msg {
            font-size: 13px;
            margin-top: 6px;
            min-height: 18px;
            font-weight: 500;
            transition: all 0.2s;
        }
        .msg-error { color: #f43f5e; text-shadow: 0 0 8px rgba(244, 63, 94, 0.5); }
        .msg-success { color: #4ade80; text-shadow: 0 0 8px rgba(74, 222, 128, 0.5); }
        .submit-btn {
            width: 100%;
            padding: 12px;
            margin-top: 15px;
            background: linear-gradient(90deg, #c084fc, #38bdf8);
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 800;
            color: white;
            font-family: 'Outfit', sans-serif;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 3px;
            transition: all 0.3s;
            box-shadow: 0 0 15px rgba(192, 132, 252, 0.4);
        }
        .submit-btn:hover:not(:disabled) {
            transform: scale(1.02);
            box-shadow: 0 0 30px rgba(192, 132, 252, 0.8);
        }
        .submit-btn:disabled {
            background: #1e293b;
            color: #475569;
            cursor: not-allowed;
            box-shadow: none;
        }
        </style>
        <div id="ob-wrapper" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 99999;">
            <div class="onboarding-container" id="ob-container" style="pointer-events: auto;">
                <div class="onboarding-title">WELCOME TO FURIO FC</div>
                <div class="onboarding-sub">Create your futuristic football identity</div>
                
                <div class="input-row">
                    <div class="input-group">
                        <label>First Name</label>
                        <input type="text" id="ob-first" class="cyber-input" placeholder="e.g. Alex" maxlength="20">
                    </div>
                    <div class="input-group">
                        <label>Last Name</label>
                        <input type="text" id="ob-last" class="cyber-input" placeholder="e.g. Hunter" maxlength="20">
                    </div>
                </div>
                
                <div class="input-row">
                    <div class="input-group">
                        <label>Date of Birth</label>
                        <input type="date" id="ob-dob" class="cyber-input">
                        <div id="ob-dob-msg" class="validation-msg"></div>
                    </div>
                    <div class="input-group">
                        <label>Region</label>
                        <select id="ob-country" class="cyber-input">
                            <option value="TR">Turkey</option>
                            <option value="US">United States</option>
                            <option value="UK">United Kingdom</option>
                            <option value="BR">Brazil</option>
                            <option value="AR">Argentina</option>
                            <option value="FR">France</option>
                            <option value="DE">Germany</option>
                            <option value="ES">Spain</option>
                            <option value="IT">Italy</option>
                            <option value="JP">Japan</option>
                            <option value="KR">South Korea</option>
                            <option value="OT">Other</option>
                        </select>
                    </div>
                </div>
                
                <div class="input-group">
                    <label>Username</label>
                    <input type="text" id="ob-user" class="cyber-input" placeholder="Choose a unique codename (3-16 chars)" maxlength="16">
                    <div id="ob-user-msg" class="validation-msg"></div>
                </div>
                
                <button id="ob-submit" class="submit-btn" disabled>INITIALIZE PROFILE</button>
            </div>
        </div>
        `;

        const wrapperDiv = document.createElement('div');
        wrapperDiv.style.position = 'absolute';
        wrapperDiv.style.width = '0';
        wrapperDiv.style.height = '0';
        wrapperDiv.innerHTML = htmlString;
        this.nativeOverlay = wrapperDiv;
        document.getElementById('game-container').appendChild(this.nativeOverlay);
        
        // Setup Logic after DOM is ready
        this.time.delayedCall(100, () => {
            const container = document.getElementById('ob-container');
            if (container) container.classList.add('active');
            this.setupValidation();
        });
        
        // Intro Camera
        this.cameras.main.zoom = 1.2;
        this.cameras.main.zoomTo(1, 3000, 'Sine.easeOut');

        // Cleanup on scene shutdown
        this.events.once('shutdown', () => {
            if (this.nativeOverlay && this.nativeOverlay.parentNode) {
                this.nativeOverlay.parentNode.removeChild(this.nativeOverlay);
                this.nativeOverlay = null;
            }
        });
    }

    setupValidation() {
        const elFirst = document.getElementById('ob-first');
        const elLast = document.getElementById('ob-last');
        const elDob = document.getElementById('ob-dob');
        const elCountry = document.getElementById('ob-country');
        const elUser = document.getElementById('ob-user');
        
        const msgDob = document.getElementById('ob-dob-msg');
        const msgUser = document.getElementById('ob-user-msg');
        const btnSubmit = document.getElementById('ob-submit');

        const blockedWords = ['admin', 'moderator', 'owner', 'support', 'system', 'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'nigger', 'faggot', 'slut', 'whore', 'hitler', 'nazi'];
        
        let isUserValid = false;
        let isDobValid = false;

        const checkForm = () => {
            if (isUserValid && isDobValid && elFirst.value.trim().length > 0) {
                btnSubmit.disabled = false;
            } else {
                btnSubmit.disabled = true;
            }
        };

        // DOB Validation
        elDob.addEventListener('change', () => {
            const selectedDate = new Date(elDob.value);
            const today = new Date();
            let age = today.getFullYear() - selectedDate.getFullYear();
            const m = today.getMonth() - selectedDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) {
                age--;
            }

            if (!elDob.value) {
                msgDob.className = 'validation-msg msg-error';
                msgDob.innerText = 'Date of birth is required.';
                isDobValid = false;
            } else if (selectedDate > today) {
                msgDob.className = 'validation-msg msg-error';
                msgDob.innerText = 'Date cannot be in the future.';
                isDobValid = false;
            } else if (age < 3) {
                msgDob.className = 'validation-msg msg-error';
                msgDob.innerText = 'Player must be at least 3 years old.';
                isDobValid = false;
            } else if (age > 120) {
                msgDob.className = 'validation-msg msg-error';
                msgDob.innerText = 'Invalid date. Age too high.';
                isDobValid = false;
            } else {
                msgDob.className = 'validation-msg msg-success';
                msgDob.innerText = 'Valid date.';
                isDobValid = true;
            }
            checkForm();
        });

        // Username Validation
        elUser.addEventListener('input', () => {
            const val = elUser.value;
            const lowerVal = val.toLowerCase();
            
            if (val.trim() !== val) {
                msgUser.className = 'validation-msg msg-error';
                msgUser.innerText = 'Cannot start or end with spaces.';
                isUserValid = false;
            } else if (val.length < 3) {
                msgUser.className = 'validation-msg msg-error';
                msgUser.innerText = 'Username must be at least 3 characters.';
                isUserValid = false;
            } else if (!/^[a-zA-Z0-9_]+$/.test(val)) {
                msgUser.className = 'validation-msg msg-error';
                msgUser.innerText = 'Only letters, numbers, and underscores allowed.';
                isUserValid = false;
            } else if (blockedWords.some(w => lowerVal.includes(w))) {
                msgUser.className = 'validation-msg msg-error';
                msgUser.innerText = 'Inappropriate or reserved word detected.';
                isUserValid = false;
            } else {
                msgUser.className = 'validation-msg msg-success';
                msgUser.innerText = 'Username is available!';
                isUserValid = true;
            }
            checkForm();
        });

        // Basic inputs check for First Name
        elFirst.addEventListener('input', checkForm);

        const submitAction = (e) => {
            // Remove preventDefault as it can block synthetic touch clicks on Android WebView
            if (!btnSubmit.disabled) {
                // Save Data
                window.gameState.player.username = elUser.value.trim();
                window.gameState.player.firstName = elFirst.value.trim();
                window.gameState.player.lastName = elLast.value.trim();
                window.gameState.player.dob = elDob.value;
                window.gameState.player.country = elCountry.value;
                
                // Construct a display name
                window.gameState.player.name = window.gameState.player.firstName;
                if (window.gameState.player.lastName) {
                    window.gameState.player.name += " " + window.gameState.player.lastName.charAt(0) + ".";
                }
                
                window.gameState.player.onboardingComplete = true;              
                if (window.SaveManager) window.SaveManager.save();
                else localStorage.setItem('headSoccerSave', JSON.stringify(window.gameState));

                if (window.AnalyticsService) {
                    window.AnalyticsService.trackOnce('character_created', {
                        completed: true
                    });
                }

                // Transition
                btnSubmit.innerText = "INITIALIZING...";
                btnSubmit.disabled = true;
                
                const container = document.getElementById('ob-container');
                container.style.transform = 'scale(1.1)';
                container.style.opacity = '0';
                container.style.filter = 'blur(10px)';

                this.cameras.main.zoomTo(3, 1000, 'Expo.in');
                this.cameras.main.fade(1000, 255, 255, 255);

                this.time.delayedCall(1000, () => {
                    if (this.nativeOverlay && this.nativeOverlay.parentNode) {
                        this.nativeOverlay.parentNode.removeChild(this.nativeOverlay);
                    }
                    this.scene.start('MenuScene');
                });
            }
        };

        // Use only 'click' to prevent duplicate event race conditions on Android
        btnSubmit.addEventListener('click', submitAction);
    }
}
