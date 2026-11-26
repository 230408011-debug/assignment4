class Player extends Phaser.GameObjects.Container {
    constructor(scene, x, y, isLeftTeam, isHuman = false, controllerId = 0, customColor = null, playerStats = null) {
        super(scene, x, y);
        this.scene = scene;
        this.isLeftTeam = isLeftTeam;
        this.isHuman = isHuman;
        this.controllerId = controllerId;
        
        // Character Attributes System (±15% Bounded Balanced Impact)
        // At 50: 0.85 (-15%), At 75: 1.00 (base), At 100: 1.15 (+15%)
        const mapAttr15 = (val) => {
            const v = Number(val) || 50;
            return Phaser.Math ? Phaser.Math.Clamp(0.85 + ((v - 50) / 50) * 0.30, 0.85, 1.15) : Math.max(0.85, Math.min(1.15, 0.85 + ((v - 50) / 50) * 0.30));
        };
        
        let attrs = { speed: 50, shooting: 50, passing: 50, physical: 50, dribbling: 50, stamina: 50 };
        
        if (playerStats) {
            attrs = {
                speed: playerStats.speed !== undefined ? playerStats.speed : (playerStats.pace || 50),
                shooting: playerStats.shooting !== undefined ? playerStats.shooting : (playerStats.shot || 50),
                passing: playerStats.passing !== undefined ? playerStats.passing : (playerStats.pass || 50),
                physical: playerStats.physical !== undefined ? playerStats.physical : (playerStats.defense || 50),
                dribbling: playerStats.dribbling !== undefined ? playerStats.dribbling : (playerStats.dribble || 50),
                stamina: playerStats.stamina !== undefined ? playerStats.stamina : 70
            };
        } else if (isHuman && window.gameState && window.gameState.player && window.gameState.player.attributes) {
            attrs = window.gameState.player.attributes;
        }

        this.stats = {
            speed: mapAttr15(attrs.speed || 50),
            accel: mapAttr15(attrs.speed || 50),
            shotPower: mapAttr15(attrs.shooting || 50),
            control: mapAttr15(attrs.dribbling || 50),
            agility: mapAttr15(attrs.dribbling || 50),
            defense: mapAttr15(attrs.physical || 50),
            passing: mapAttr15(attrs.passing || 50),
            stamina: mapAttr15(attrs.stamina || 50),
            shotAccuracy: mapAttr15(attrs.shooting || 50),
            physical: mapAttr15(attrs.physical || 50),
            dribbling: mapAttr15(attrs.dribbling || 50)
        };

        // Unified Speed Calculation: Base 205 px/s * speedMod (174 - 235 px/s)
        this.baseSpeed = 205 * this.stats.speed; 
        this.speed = this.baseSpeed;
        this.sprintMultiplier = 1.28; // x1.28 sprint boost (1.25 - 1.35 range)
        this.dashSpeed = this.baseSpeed * this.sprintMultiplier; // peak sprint: ~222 - 300 px/s (27 - 35 km/h)
        
        // Stamina system properties scaled by stamina attribute (±15%)
        this.maxStamina = Math.round(100 * this.stats.stamina);
        this.stamina = this.maxStamina;
        this.isFatigued = false;
        this.isSprinting = false;
        
        this.reactionTimer = 0;
        this.aiTarget = {x: x, y: y};
        this.visualRotation = 0;
        
        this.hasPossession = false;
        this.possessionTimer = 0;
        this.isGoalkeeper = false;
        this.dashCooldown = 0;
        this.tackleCooldown = 0;
        this.shootCooldown = 0;
        this.chargeTime = 0;
        this.diveCooldown = 0;
        this.isHoldingBall = false;
        this.heldBallTimer = 0;
        this.catchCooldown = 0;
        this._isGoalkeeper = false;
        this.dashAngle = 0;
        
        // AI State Machine
        this.aiState = 'IDLE';
        this.stateTimer = 0;
        this.teamIntelligence = 0.75; // Set by GameScene from club strength
        this.lastDecisionTime = 0;
        
        // Anti-clumping & Stuck Recovery
        this.stuckTimer = 0;
        this.lastX = x;
        this.lastY = y;
        this.unstuckTime = 0;
        
        // Playstyle initialization
        this.playStyle = 'BALANCED';
        if (playerStats && playerStats.playStyle) {
            this.playStyle = playerStats.playStyle;
        }
        
        this.createVisuals(customColor);
        
        this.scene.add.existing(this);
        this.scene.physics.add.existing(this);
        
        this.body.setCircle(22);
        this.body.setOffset(-22, -22);
        this.body.setCollideWorldBounds(true);
        this.body.setBounce(0.1); // Reduced bounce for grounded feel
        this.body.setDrag(1200); // Higher drag for snappier stops (no sliding)
        this.body.setMass(8 + ((this.stats.physical || 1.0) * 4)); // Heavy player, light ball for real momentum transfer
        this.body.setMaxVelocity(Math.min(310, this.dashSpeed));
    }

    createVisuals(customColor) {
        let finalColorObj = { primary: 0xe11d48, secondary: 0xffffff, accent: 0x000000 };
        if (this.isLeftTeam) {
            if (customColor !== null && typeof customColor === 'object') finalColorObj = { ...customColor, accent: 0 };
            else if (customColor !== null) finalColorObj = { primary: customColor, secondary: 0xffffff, accent: 0 };
            else if (window.gameState && window.gameState.profile.customColors) finalColorObj = { ...window.gameState.profile.customColors, accent: 0 };
        } else {
            if (customColor !== null && typeof customColor === 'object') finalColorObj = { ...customColor, accent: 0 };
            else if (customColor !== null) finalColorObj = { primary: customColor, secondary: 0xffffff, accent: 0 };
            else finalColorObj = { primary: 0x2563eb, secondary: 0xffffff, accent: 0 };
        }

        const size = 22;
        this.visuals = this.scene.add.container(0, 0);

        this.baseGlow = this.scene.add.circle(0, 0, size + 4, finalColorObj.primary, 0.3);
        this.baseCircle = this.scene.add.circle(0, 0, size, finalColorObj.primary).setStrokeStyle(3, 0xffffff);
        
        this.halfCircle = this.scene.add.graphics();
        this.halfCircle.fillStyle(finalColorObj.secondary, 1);
        this.halfCircle.beginPath();
        this.halfCircle.arc(0, 0, size, -Math.PI/2, Math.PI/2, false);
        this.halfCircle.closePath();
        this.halfCircle.fillPath();
        
        this.eye1 = this.scene.add.circle(8, -6, 4, 0xffffff);
        this.eye1Inner = this.scene.add.circle(10, -6, 2, 0x000000);
        this.eye2 = this.scene.add.circle(8, 6, 4, 0xffffff);
        this.eye2Inner = this.scene.add.circle(10, 6, 2, 0x000000);

        this.visuals.add([this.baseCircle, this.halfCircle, this.eye1, this.eye1Inner, this.eye2, this.eye2Inner]);

        // Customizations have been moved to pure 2D effects
        
        this.add(this.visuals);
        
        // Neon cyan selection ring underneath human player with forward directional chevron
        this.selectionRing = this.scene.add.container(0, 0);
        const selCircle = this.scene.add.circle(0, 0, 31).setStrokeStyle(3.5, 0x00f0ff, 0.95);
        const chevron = this.scene.add.triangle(36, 0, 0, -6, 9, 0, 0, 6, 0x00f0ff);
        this.selectionRing.add([selCircle, chevron]);
        this.addAt(this.selectionRing, 0); // Put it at the very bottom layer
        this.selectionRing.setVisible(this.isHuman);
        
        // Store color configuration for HUD rendering
        this.colorObj = finalColorObj;

        // Create Floating Player Name Label Container above player head (Hidden as per request)
        this.nameTagContainer = this.scene.add.container(0, -42);
        this.nameTagContainer.setVisible(false);
        this.nameTagBg = this.scene.add.graphics();
        this.nameTagText = this.scene.add.text(0, 0, '', {
            font: '900 10.5px sans-serif',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.nameTagText.setShadow(0, 1, '#000000', 3);
        this.nameTagContainer.add([this.nameTagBg, this.nameTagText]);
        this.add(this.nameTagContainer);
    }

    setPlayerIdentity(name, clubShort = '') {
        this.playerName = name;
        this.clubShort = clubShort;
        this.updateNameTag();
    }

    setRPGStats(playerObj) {
        if (!playerObj) return;
        this.playerData = playerObj;
        
        // Map 0-99 RPG stats to internal multiplier engine (±15% bounded range: 0.85 - 1.15)
        const mapStat15 = (val) => {
            const v = Number(val) || 60;
            return Phaser.Math ? Phaser.Math.Clamp(0.85 + ((v - 50) / 50) * 0.30, 0.85, 1.15) : Math.max(0.85, Math.min(1.15, 0.85 + ((v - 50) / 50) * 0.30));
        };
        
        this.stats.speed = mapStat15(playerObj.pace || playerObj.speed || 60);
        this.stats.accel = mapStat15(playerObj.pace || playerObj.speed || 60);
        this.stats.shotPower = mapStat15(playerObj.shooting || playerObj.shot || 60);
        this.stats.control = mapStat15(playerObj.dribbling || playerObj.dribble || 60);
        this.stats.agility = mapStat15(playerObj.dribbling || playerObj.dribble || 60);
        this.stats.defense = mapStat15(playerObj.defense || playerObj.physical || 60);
        this.stats.passing = mapStat15(playerObj.passing || playerObj.pass || 60);
        this.stats.stamina = mapStat15(playerObj.stamina || 70);
        this.stats.shotAccuracy = mapStat15(playerObj.shooting || playerObj.shot || 60);
        this.stats.physical = mapStat15(playerObj.defense || playerObj.physical || 60);
        this.stats.dribbling = mapStat15(playerObj.dribbling || playerObj.dribble || 60);
        
        // Physical stats dictate mass for collisions
        if (this.body) {
            this.body.setMass(8 + (this.stats.physical * 4)); 
        }

        // Unified speed & dash calculation (base: 205 * speedMod, sprint: base * 1.28 capped at 310 px/s)
        this.baseSpeed = 205 * this.stats.speed;
        this.speed = this.baseSpeed;
        this.dashSpeed = Math.min(310, this.baseSpeed * this.sprintMultiplier);
        if (this.body) {
            this.body.setMaxVelocity(this.dashSpeed);
        }

        // Apply to stamina
        this.maxStamina = Math.round(100 * this.stats.stamina);
        this.stamina = this.maxStamina;
    }

    updateNameTag() {
        if (!this.nameTagText || !this.playerName) return;
        
        // Clean any prohibited terms
        let rawName = String(this.playerName).trim();
            
        if (!rawName) rawName = "Player";

        const prefix = this.clubShort ? `[${this.clubShort}] ` : "";
        const fullDisplay = prefix + rawName;

        this.nameTagText.setText(fullDisplay);
        
        const padding = 12;
        const txtW = Math.max(44, this.nameTagText.width + padding);
        const txtH = 18;

        this.nameTagBg.clear();
        this.nameTagBg.fillStyle(0x060212, 0.85);
        this.nameTagBg.fillRoundedRect(-txtW / 2, -txtH / 2, txtW, txtH, 5);

        const borderColor = this.isLeftTeam ? 0xd946ef : 0x00ffff;
        this.nameTagBg.lineStyle(1.5, borderColor, 0.9);
        this.nameTagBg.strokeRoundedRect(-txtW / 2, -txtH / 2, txtW, txtH, 5);
    }

    update(time, delta, keys, mobileKeys, ball) {
        if (!this.body) return;

        if (this.nameTagContainer) {
            this.nameTagContainer.setRotation(-this.rotation || 0);
            if (this.playerName && this._lastRenderedName !== this.playerName) {
                this._lastRenderedName = this.playerName;
                this.updateNameTag();
            }
        }
        
        delta = Math.min(delta, 33.33);
        const dt = delta / 16.666;

        if (this.dashCooldown > 0) this.dashCooldown -= delta;
        if (this.tackleCooldown > 0) this.tackleCooldown -= delta;
        if (this.shootCooldown > 0) this.shootCooldown -= delta;
        if (this.diveCooldown > 0) this.diveCooldown -= delta;
        if (this.possessionTimer > 0) this.possessionTimer -= delta;
        if (this.catchCooldown > 0) this.catchCooldown -= delta;
        if (this.dashBoost > 0) {
            this.dashBoost -= delta;
            const boostRatio = this.dashBoost / 800;
            this.body.setAcceleration(Math.cos(this.dashAngle) * this.dashSpeed * 15 * boostRatio, Math.sin(this.dashAngle) * this.dashSpeed * 15 * boostRatio);
        }

        // Goalkeeper Catch held state
        if (this.isHoldingBall) {
            if (ball && ball.body) {
                ball.body.setVelocity(0);
                ball.setPosition(this.x + Math.cos(this.rotation) * 22, this.y + Math.sin(this.rotation) * 22);
            }
            // Repel opponents from the goalkeeper
            this.scene.players.forEach(p => {
                if (p.isLeftTeam !== this.isLeftTeam && p.body) {
                    const dist = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                    if (dist < 100) {
                        const repelAngle = Math.atan2(p.y - this.y, p.x - this.x);
                        p.body.velocity.x += Math.cos(repelAngle) * 20;
                        p.body.velocity.y += Math.sin(repelAngle) * 20;
                    }
                }
            });
            this.heldBallTimer -= delta;
            if (this.heldBallTimer <= 0) {
                this.isHoldingBall = false;
                this.catchCooldown = 3000;
                this.hasPossession = true;
                this.shootCooldown = 0;
            }
            return;
        }

        // Stamina system state logic
        const sprintKeyPressed = this.isHuman && (keys.SHIFT.isDown || keys.C.isDown || mobileKeys.sprint);
        
        const isSprintingInput = sprintKeyPressed;
        
        this.isSprinting = isSprintingInput && this.stamina > 0 && !this.isFatigued;
        
        if (this.isSprinting) {
            // Smoothly accelerate up to sprint speed (baseSpeed * sprintMultiplier)
            const targetSprintSpeed = this.baseSpeed * this.sprintMultiplier;
            this.speed += (targetSprintSpeed - this.speed) * 0.35 * dt;
            // Stamina drain is inversely proportional to stamina attribute
            const drainRate = 18 * (1.15 - (this.stats.stamina - 0.85) * 0.5);
            const cost = drainRate * (delta / 1000);
            this.stamina = Math.max(0, this.stamina - cost);
            if (this.isHuman && this.scene.userPlayerStats) {
                this.scene.userPlayerStats.staminaUsed = (this.scene.userPlayerStats.staminaUsed || 0) + cost;
            }
            if (this.stamina <= 0) {
                this.isFatigued = true;
            }
        } else {
            const isMoving = this.body && (this.body.velocity.lengthSq() > 100);
            if (isMoving) {
                // Gradual return to base speed
                this.speed += (this.baseSpeed - this.speed) * 0.20 * dt;
                // Walking stamina recovery: 15 * staminaMod / sec
                const recoveryRate = 15 * (this.stats.stamina || 1.0);
                this.stamina = Math.min(this.maxStamina, this.stamina + recoveryRate * (delta / 1000));
            } else {
                this.speed = this.baseSpeed;
                // Stationary stamina recovery: 45 * staminaMod / sec
                const recoveryRate = 45 * (this.stats.stamina || 1.0);
                this.stamina = Math.min(this.maxStamina, this.stamina + recoveryRate * (delta / 1000));
            }
            
            // Recover from fatigued state when stamina reaches 30%
            if (this.isFatigued && this.stamina >= (this.maxStamina * 0.30)) {
                this.isFatigued = false;
            }
        }
        
        // Hide floating names to reduce overlap, only show for ball carrier
        if (this.nameTagText) {
            // this.nameTagText.setVisible(this.hasPossession); // HIDDEN BY USER REQUEST
            if (this.isHuman) this.nameTagText.setFill('#00ffff');
        }
        if (this.isFatigued) {
            this.speed = this.baseSpeed * 0.70;
        }
        
        const isMoving = (this.body && this.body.velocity) ? (this.body.velocity.lengthSq() > 100) : false;

        // 2D Run animations (Customization)
        if (this.isHuman && isMoving && window.gameState && window.gameState.customization && window.gameState.customization.equipped) {
            const runAnim = window.gameState.customization.equipped.runAnimation;
            if (runAnim === 'neon_run' && Math.random() < 0.25) {
                const trail = this.scene.add.circle(this.x, this.y + 15, 10, 0xd946ef, 0.45).setBlendMode('ADD');
                this.scene.tweens.add({
                    targets: trail,
                    scale: 0.1,
                    alpha: 0,
                    duration: 350,
                    onComplete: () => trail.destroy()
                });
            } else if (runAnim === 'hiz_run' && Math.random() < 0.2) {
                const trail = this.scene.add.circle(this.x, this.y + 10, 8, 0x00ffff, 0.4).setBlendMode('ADD');
                this.scene.tweens.add({
                    targets: trail,
                    scale: 0.1,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => trail.destroy()
                });
            }
        }

        // Sticky dribbling tethering removed. Real physics collision is now used.

        if (this.isHuman) {
            this.handleHumanInput(keys, mobileKeys, ball, delta, dt);
        } else {
            this.handleBotAI(ball, delta, time, dt);
        }
        
        // VISUAL STABILITY LOCKED
        this.visuals.scaleX = 1.0;
        this.visuals.scaleY = 1.0;
        
        const speedSq = this.body.velocity.lengthSq();
        if (speedSq > 2000) { 
            const currentSpeed = Math.sqrt(speedSq);
            if (currentSpeed > 350 && Math.random() < 0.2 * dt && this.scene.trailEmitter) {
                const color = this.isLeftTeam ? 0xf43f5e : 0x3b82f6;
                this.scene.trailEmitter.setParticleTint(color);
                this.scene.trailEmitter.emitParticleAt(this.x, this.y, 1);
            }
            this.targetRotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
        } else {
            if (this.hasPossession) {
                const oppGoalX = this.isLeftTeam ? 1950 : 50;
                this.targetRotation = Math.atan2(600 - this.y, oppGoalX - this.x);
            } else if (this.isHuman && ball && !this.hasPossession && Phaser.Math.Distance.Between(this.x, this.y, ball.x, ball.y) < 200) {
                this.targetRotation = Math.atan2(ball.y - this.y, ball.x - this.x);
            }
        }
        
        if (this.targetRotation !== undefined) {
            let diff = this.targetRotation - this.visuals.rotation;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            
            // Highly agile turning
            this.visuals.rotation += diff * 0.25 * this.stats.agility * dt; 
            this.rotation = this.visuals.rotation;
        }
        
        // Dynamic visibility and rotation for selection ring based on human control
        if (this.selectionRing) {
            this.selectionRing.setVisible(this.isHuman);
            if (this.isHuman) {
                this.selectionRing.setRotation(this.visuals.rotation);
            }
        }

        // --- TRUE DRIBBLING (SNAPPING) ---
        if (this.hasPossession && ball && ball.body) {
            // High dribbling keeps ball closer (22-38 range)
            let dribbleDist = 45 - ((this.stats.dribbling || 1.0) * 15);
            // Sprinting pushes ball slightly further away
            if (this.isSprinting) dribbleDist += 10 - ((this.stats.dribbling || 1.0) * 5);

            const targetX = this.x + Math.cos(this.visuals.rotation) * dribbleDist;
            const targetY = this.y + Math.sin(this.visuals.rotation) * dribbleDist;
            
            // Smoothly snap ball position to the target (prevents physics jitter)
            ball.x += (targetX - ball.x) * 0.6;
            ball.y += (targetY - ball.y) * 0.6;
            
            // Match velocity so the camera tracking and physics momentum look correct
            ball.body.velocity.x = this.body.velocity.x;
            ball.body.velocity.y = this.body.velocity.y;
            
            // Add realistic spin based on movement speed
            ball.body.angularVelocity = this.body.velocity.length() * 0.5;
        }

        // --- HARD CLAMP BOUNDARIES (CRITICAL FIX) ---
        // Prevent players from getting stuck in invisible walls near corners
        if (this.y < 150) this.y = 150;
        if (this.y > 1050) this.y = 1050;

        // Prevent field players from entering the goal net physically
        if (!this.isGoalkeeper) {
            // Strong boundary right at the goal line
            if (this.x < 100) {
                this.x = 100;
                this.body.velocity.x = Math.max(0, this.body.velocity.x);
            }
            if (this.x > 1900) {
                this.x = 1900;
                this.body.velocity.x = Math.min(0, this.body.velocity.x);
            }
        } else {
            // Goalkeepers can go a bit deeper but still restricted
            if (this.x < 60) this.x = 60;
            if (this.x > 1940) this.x = 1940;
        }

    }
    
    set isGoalkeeper(val) {
        this._isGoalkeeper = val;
        if (val && this.body) {
            this.body.setMass(10); // Heavy, cannot be pushed by field players
        }
    }
    
    get isGoalkeeper() {
        return this._isGoalkeeper;
    }
    // handleDribbling removed - using purely physical collisions now
    handleHumanInput(keys, mobileKeys, ball, delta, dt) {
        let vx = 0; let vy = 0;
        
        if ((keys.left && keys.left.isDown) || (keys.A && keys.A.isDown)) vx -= 1;
        if ((keys.right && keys.right.isDown) || (keys.D && keys.D.isDown)) vx += 1;
        if ((keys.up && keys.up.isDown) || (keys.W && keys.W.isDown)) vy -= 1;
        if ((keys.down && keys.down.isDown) || (keys.S && keys.S.isDown)) vy += 1;

        if (vx !== 0 || vy !== 0 || mobileKeys.joyForce > 0) {
            // Track first gameplay action
            if (this.isHuman && this.scene && !this.scene.firstActionRecorded && window.AnalyticsService) {
                this.scene.firstActionRecorded = true;
                const kickoffTs = this.scene.kickoffTimestamp || Date.now();
                const appOpenTs = window.AnalyticsService.getAppOpenTimestamp();
                const ftueCompleteTs = window.AnalyticsService.getFtueCompleteTimestamp();
                const now = Date.now();

                window.AnalyticsService.trackOnce('first_gameplay_action', {
                    action_type: 'move',
                    time_from_kickoff_sec: Math.max(0, Number(((now - kickoffTs) / 1000).toFixed(2))),
                    time_from_app_open_sec: Math.max(0, Number(((now - appOpenTs) / 1000).toFixed(2))),
                    time_from_ftue_complete_sec: ftueCompleteTs > 0 ? Math.max(0, Number(((now - ftueCompleteTs) / 1000).toFixed(2))) : 0
                }, 'first_gameplay_action_global');
            }

            let angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : mobileKeys.joyAngle;
            let forceMult = (vx !== 0 || vy !== 0) ? 1.0 : mobileKeys.joyForce;
            
            // Ball carrying speed penalty (-10% down to -4% with high dribbling)
            let effectiveSpeed = this.speed;
            if (this.hasPossession) {
                const dribblePenalty = 0.10 - Math.min(0.06, Math.max(0, (this.stats.dribbling - 0.85) * (0.06 / 0.30)));
                effectiveSpeed *= (1.0 - dribblePenalty);
            }
            
            // Hard physical velocity clamp to 310 px/s (never exceed 36 km/h)
            const targetMaxVel = Math.min(310, effectiveSpeed * Math.max(0.3, forceMult));
            this.body.setMaxVelocity(targetMaxVel);

            this.lastInputAngle = angle; // Store for passing/shooting
            // High acceleration for snappiness but scaled
            const accelForce = effectiveSpeed * 55 * this.stats.accel * forceMult; 
            
            const currentVelAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
            let angleDiff = Math.abs(angle - currentVelAngle);
            if (angleDiff > Math.PI) angleDiff = (Math.PI * 2) - angleDiff;
            
            // If turning sharply, instantly damp existing velocity to prevent "ice skating"
            if (angleDiff > Math.PI / 2) {
                this.body.velocity.x *= 0.15; // Extremely heavy damping on sharp turns
                this.body.velocity.y *= 0.15;
            } else if (angleDiff > Math.PI / 4) {
                this.body.velocity.x *= 0.75; // Moderate damping
                this.body.velocity.y *= 0.75;
            }
            
            // Limit turn speed while sprinting
            if (this.isSprinting || this.dashBoost > 0) {
                this.body.velocity.x *= 0.95;
                this.body.velocity.y *= 0.95;
            }
            
            this.body.setAcceleration(Math.cos(angle) * accelForce, Math.sin(angle) * accelForce);
        } else {
            // Natural deceleration (friction)
            this.body.setAcceleration(0, 0);
            this.body.velocity.x *= 0.85; // Much smoother stop
            this.body.velocity.y *= 0.85;
            if (this.body.velocity.lengthSq() < 100) this.body.setVelocity(0, 0);
        }

        const isShooting = mobileKeys.shoot || keys.SPACE.isDown || keys.Z.isDown;
        
        // Tackle attempt (if not in possession and shooting key pressed)
        if (isShooting && !this.hasPossession && this.tackleCooldown <= 0) {
            this.attemptTackle(ball);
        }
        
        const maxCharge = 700;
        const shotAngle = vx !== 0 || vy !== 0 || mobileKeys.joyForce > 0
            ? this.lastInputAngle : this.rotation;
        if (isShooting && this.hasPossession) {
            this.chargeTime = Math.min(this.chargeTime + delta, maxCharge);
            this.drawShotCharge(this.chargeTime / maxCharge, shotAngle);
            this.body.setAcceleration(this.body.acceleration.x * 0.1, this.body.acceleration.y * 0.1);
        } else if (this.chargeTime > 0) {
            if (this.hasPossession) {
                const force = 600 + (this.chargeTime / maxCharge) * 750 * this.stats.shotPower;
                this.shootBall(ball, force, shotAngle);
            }
            this.clearShotCharge();
        }

        if (!isShooting && this.shootCooldown <= 0) {
            const tacklePressed = keys.F.isDown;
            
            if (tacklePressed && !this.hasPossession) {
                if (this.tackleCooldown <= 0 && this.stamina >= 15) this.tackle(ball);
            } else if (mobileKeys.pass || Phaser.Input.Keyboard.JustDown(keys.X)) {
                if (this.hasPossession) this.passBall(ball, vx, vy);
                mobileKeys.pass = false;
            } else if (tacklePressed && this.dashCooldown <= 0 && this.hasPossession) {
                if (this.stamina >= 15) this.dash(vx, vy);
            }
        }
        
        if (this.nameTagText) {
            this.nameTagText.setRotation(-this.rotation);
        }
    }

    drawShotCharge(progress, angle) {
        if (!this.chargeGuide) this.chargeGuide = this.scene.add.graphics().setDepth(190);
        const guide = this.chargeGuide;
        guide.setPosition(this.x, this.y).clear();
        guide.lineStyle(4, 0x1e293b, 0.9).strokeCircle(0, 0, 34);

        const color = progress >= 1 ? 0xfacc15 : 0x67e8f9;
        guide.lineStyle(4, color, 1);
        guide.beginPath();
        guide.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        guide.strokePath();

        const tipX = Math.cos(angle) * 59;
        const tipY = Math.sin(angle) * 59;
        guide.fillStyle(color, 1);
        guide.fillTriangle(tipX, tipY,
            tipX - Math.cos(angle - 0.55) * 17, tipY - Math.sin(angle - 0.55) * 17,
            tipX - Math.cos(angle + 0.55) * 17, tipY - Math.sin(angle + 0.55) * 17
        );
    }

    clearShotCharge() {
        this.chargeTime = 0;
        this.chargeGuide?.destroy();
        this.chargeGuide = null;
    }

    dash(vx, vy) {
        if (this.stamina < 15) return;
        this.stamina = Math.max(0, this.stamina - 15);
        if (this.isHuman && this.scene.userPlayerStats) this.scene.userPlayerStats.staminaUsed += 15;
        this.dashCooldown = 3500;
        let angle = this.rotation;
        if (vx !== 0 || vy !== 0) angle = Math.atan2(vy, vx);
        
        // Gradual dash boost instead of instant teleport
        this.dashBoost = 800;
        this.dashAngle = angle;
        
        const flash = this.scene.add.circle(this.x, this.y, 35, 0x00ffff, 0.4).setBlendMode('ADD');
        this.scene.tweens.add({targets: flash, scale: 1.2, alpha: 0, duration: 400, onComplete: ()=>flash.destroy()});
    }

    tackle(ball) {
        if (this.stamina < 15) return;
        this.stamina = Math.max(0, this.stamina - 15);
        if (this.isHuman && this.scene.userPlayerStats) this.scene.userPlayerStats.staminaUsed += 15;
        this.tackleCooldown = 1500; // Skillful timing required
        this.shootCooldown = 400; 
        
        this.body.setVelocity(Math.cos(this.rotation) * this.dashSpeed * (0.8 + ((this.stats.physical||1.0)*0.4)), Math.sin(this.rotation) * this.dashSpeed * (0.8 + ((this.stats.physical||1.0)*0.4)));
        this.isTackling = true;
        this.scene.time.delayedCall(450, () => this.isTackling = false);
        
        const flash = this.scene.add.circle(this.x, this.y, 30, 0xff0000, 0.4).setBlendMode('ADD');
        this.scene.tweens.add({targets: flash, scale: 1.2, alpha: 0, duration: 300, onComplete: ()=>flash.destroy()});
    }

    // ═══════════════════════════════════════════════════════════
    // AI STATE MACHINE
    // ═══════════════════════════════════════════════════════════
    
    updateAIState(ball, time) {
        let myTeamHasBall = false;
        let oppTeamHasBall = false;
        let ballCarrier = null;
        
        this.scene.players.forEach(p => {
            if (p.hasPossession) {
                ballCarrier = p;
                if (p.isLeftTeam === this.isLeftTeam) myTeamHasBall = true;
                else oppTeamHasBall = true;
            }
        });
        
        const predictedBallX = ball.x + ball.body.velocity.x * 0.3;
        const predictedBallY = ball.y + ball.body.velocity.y * 0.3;
        
        const teammates = this.scene.players.filter(p => p.isLeftTeam === this.isLeftTeam && !p.isGoalkeeper);
        teammates.forEach(p => {
            p._distToBall = Phaser.Math.Distance.Between(p.x, p.y, predictedBallX, predictedBallY);
        });
        teammates.sort((a, b) => a._distToBall - b._distToBall);
        
        const closestToBall = teammates.length > 0 ? teammates[0] : null;
        const secondClosest = teammates.length > 1 ? teammates[1] : null;

        // Dynamic Team Mentality based on match context
        let mentality = this.playStyle || 'BALANCED';
        if (this.scene && this.scene.score) {
            const myScore = this.isLeftTeam ? this.scene.score.home : this.scene.score.away;
            const oppScore = this.isLeftTeam ? this.scene.score.away : this.scene.score.home;
            const timeLeft = this.scene.matchDuration ? (this.scene.matchDuration - this.scene.matchTimer) : 999;
            
            if (timeLeft < 30000) {
                if (myScore < oppScore) mentality = 'ATTACKING';
                else if (myScore > oppScore) mentality = 'DEFENSIVE';
            }
        }
        
        const role = this.playerRole || this._formation || 'MID';
        const isDef = role === 'DEF';
        const isAtt = role === 'ST' || role === 'ATT';
        
        if (this.hasPossession) {
            this.aiState = 'DRIBBLE';
        } else if (oppTeamHasBall || !myTeamHasBall) {
            // DEFENSE PHASE
            const ballDeepInOurHalf = this.isLeftTeam ? (ball.x < 600) : (ball.x > 1400);

            if (closestToBall === this) {
                if (isAtt && ballDeepInOurHalf && mentality !== 'PRESSING' && mentality !== 'ATTACKING') {
                    this.aiState = 'POSITIONING'; // Wait higher up
                } else {
                    this.aiState = 'PRESS';
                }
            } else if (secondClosest === this && (mentality === 'PRESSING' || ballDeepInOurHalf)) {
                this.aiState = 'COVER'; // Cut passing lanes
            } else {
                if (isDef) {
                    this.aiState = 'DEFEND';
                } else if (isAtt) {
                    this.aiState = (mentality === 'DEFENSIVE') ? 'POSITIONING' : 'ATTACK';
                } else {
                    this.aiState = 'POSITIONING';
                }
            }
        } else if (myTeamHasBall) {
            // ATTACK PHASE
            if (isDef && mentality !== 'ATTACKING') {
                this.aiState = 'DEFEND'; // Stay back to prevent counter
            } else if (closestToBall === this) {
                this.aiState = 'SUPPORT'; // Close support for pass
            } else {
                this.aiState = 'ATTACK'; // Make runs
            }
        } else {
            // NEUTRAL PHASE
            if (closestToBall === this) {
                this.aiState = 'PRESS';
            } else {
                this.aiState = 'POSITIONING';
            }
        }
    }
    
    handleBotAI(ball, delta, time, dt) {
        if (!ball || !ball.body) return;
        
        // DECISION COOLDOWN (Tied to team overall strength / intelligence)
        this.reactionTimer -= delta;
        if (this.reactionTimer <= 0) {
            const clubOvr = (this.club && (this.club.overall || this.club.strength)) ? (this.club.overall || this.club.strength) : 75;
            let intFactor = 0.5;
            let delayBase = 350;

            if (clubOvr < 60) {
                // GEN 50-59: Slow reaction (600-750ms), higher error rate, weaker press
                intFactor = 0.30 + (clubOvr - 50) * 0.015;
                delayBase = 600 + (60 - clubOvr) * 15;
            } else if (clubOvr < 70) {
                // GEN 60-69: Medium AI (380-520ms)
                intFactor = 0.45 + (clubOvr - 60) * 0.02;
                delayBase = 380 + (70 - clubOvr) * 14;
            } else if (clubOvr < 80) {
                // GEN 70-79: Fast reaction (220-340ms), better positioning & press
                intFactor = 0.68 + (clubOvr - 70) * 0.018;
                delayBase = 220 + (80 - clubOvr) * 12;
            } else {
                // GEN 80+: Top AI (120-200ms), high precision, aggressive press
                intFactor = 0.86 + Math.min(0.12, (clubOvr - 80) * 0.01);
                delayBase = Math.max(120, 200 - (clubOvr - 80) * 8);
            }

            this.teamIntelligence = intFactor;
            this.reactionTimer = delayBase + (Math.sin(time * 0.005) * 25);
            
            this.updateAIState(ball, time);
            this.lastDecision = this.aiState;
            
            let targetX = this.aiTarget.x;
            let targetY = this.aiTarget.y;
        
        const goalX = this.isLeftTeam ? 50 : 1950;
        const oppGoalX = this.isLeftTeam ? 1950 : 50;
        const pushDir = this.isLeftTeam ? 1 : -1;
        const distToBall = Phaser.Math.Distance.Between(this.x, this.y, ball.x, ball.y);

        // GOALKEEPER AI
        if (this.isGoalkeeper) {
            const minGKX = this.isLeftTeam ? 60 : 1700;
            const maxGKX = this.isLeftTeam ? 250 : 1940;
            const minGKY = 480;
            const maxGKY = 720;
            
            const dirX = ball.x - goalX;
            const dirY = ball.y - 600;
            const dist = Math.sqrt(dirX*dirX + dirY*dirY) || 1;
            
            let stepOut = 50;
            if (dist < 500) stepOut = 50 + (500 - dist) * 0.3;
            
            let desiredX = this.isLeftTeam ? (goalX + stepOut) : (goalX - stepOut);
            let slope = dirY / (dirX || 1);
            let desiredY = 600 + slope * (desiredX - goalX);
            
            if (dist < 120 && ball.x > minGKX && ball.x < maxGKX && ball.y > minGKY && ball.y < maxGKY) {
                desiredX = ball.x; desiredY = ball.y;
            }
            
            const ballSpeedSq = ball.body.velocity.lengthSq();
            const isBallHeadingToUs = this.isLeftTeam ? (ball.body.velocity.x < -150) : (ball.body.velocity.x > 150);
            const isBallInFront = this.isLeftTeam ? (ball.x > this.x - 15) : (ball.x < this.x + 15);
            
            if (ballSpeedSq > 20000 && isBallHeadingToUs && isBallInFront) {
                const timeToReach = Math.abs(this.x - ball.x) / Math.abs(ball.body.velocity.x || 1);
                if (timeToReach < 1.0) {
                    const predictedY = ball.y + ball.body.velocity.y * timeToReach;
                    desiredY = predictedY;
                    
                    const verticalDiff = Math.abs(predictedY - this.y);
                    if (timeToReach < 0.7 && this.diveCooldown <= 0 && verticalDiff > 35 && verticalDiff < 200) {
                        this.diveCooldown = 2000;
                        const diveSpeed = 620 * this.stats.agility * 1.15;
                        const diveAngle = Math.atan2(predictedY - this.y, this.isLeftTeam ? (ball.x - this.x) : (this.x - ball.x));
                        this.body.setVelocity(Math.cos(diveAngle) * (this.isLeftTeam ? 1 : -1) * diveSpeed, Math.sin(diveAngle) * diveSpeed);
                        this.lastDecision = "DIVE";
                    }
                }
            }
            
            targetX = Phaser.Math.Clamp(desiredX, minGKX, maxGKX);
            targetY = Phaser.Math.Clamp(desiredY, minGKY, maxGKY);
            
            if (this.hasPossession && this.shootCooldown <= 0) {
                this.shootCooldown = 400;
                this.lastDecision = "CLEARANCE";
                const teammates = this.scene.players.filter(p => p.isLeftTeam === this.isLeftTeam && p !== this && !p.isGoalkeeper);
                const opponents = this.scene.players.filter(p => p.isLeftTeam !== this.isLeftTeam);
                let bestTarget = null; let bestScore = -Infinity;
                teammates.forEach(t => {
                    let minOppDist = Infinity;
                    opponents.forEach(o => { const d = Phaser.Math.Distance.Between(t.x, t.y, o.x, o.y); if (d < minOppDist) minOppDist = d; });
                    if (minOppDist > 120) {
                        const fwd = this.isLeftTeam ? t.x : (2000 - t.x);
                        const score = minOppDist + fwd * 0.5;
                        if (score > bestScore) { bestScore = score; bestTarget = t; }
                    }
                });
                if (bestTarget) {
                    this.shootBall(ball, 580, Math.atan2(bestTarget.y - this.y, bestTarget.x - this.x));
                } else {
                    const clearAngle = Math.atan2((600 + (Math.random() - 0.5) * 350) - this.y, (this.isLeftTeam ? 2000 : 0) - this.x);
                    this.shootBall(ball, 850, clearAngle);
                }
            }
            
            this.aiTarget.x = targetX;
            this.aiTarget.y = targetY;
        }
        // FIELD PLAYER STATE MACHINE
        else {
            switch (this.aiState) {
                case 'PRESS': {
                    const anticipation = intFactor * 0.5;
                    targetX = ball.x + ball.body.velocity.x * anticipation;
                    targetY = ball.y + ball.body.velocity.y * anticipation;
                    
                    let tackleProb = 0.5 * intFactor;
                    if (this.playStyle === 'PRESSING') tackleProb += 0.3;
                    if (this.playStyle === 'DEFENSIVE') tackleProb -= 0.1;
                    
                    const isOnCorrectSide = this.isLeftTeam ? (this.x < ball.x + 40) : (this.x > ball.x - 40);
                    if (distToBall < 130 && isOnCorrectSide && this.tackleCooldown <= 0 && Math.random() < tackleProb) {
                        this.tackle(ball);
                        this.lastDecision = "TACKLE";
                    }
                    break;
                }
                case 'COVER': {
                    const supportX = ball.x + (goalX - ball.x) * 0.3;
                    const supportY = ball.y + (600 - ball.y) * 0.3;
                    targetX = supportX;
                    targetY = supportY + (this._homeY > 600 ? 150 : -150);
                    break;
                }
                case 'SUPPORT': {
                    let ballCarrier = null;
                    this.scene.players.forEach(p => { if (p.hasPossession && p.isLeftTeam === this.isLeftTeam) ballCarrier = p; });
                    
                    if (ballCarrier) {
                        // Dynamically choose to support behind or on the wings
                        const isWinger = Math.abs(this._homeY - 600) > 150;
                        if (isWinger) {
                            // Wing Support: Stay wide, slightly behind or level with carrier
                            targetX = ballCarrier.x - pushDir * 50; 
                            targetY = 600 + ((this._homeY - 600) * 1.5); 
                        } else {
                            // Central Support: Drop back to offer safe pass
                            targetX = ballCarrier.x - pushDir * 250; 
                            targetY = ballCarrier.y + (this._homeY > 600 ? 150 : -150); 
                        }
                    } else {
                        targetX = ball.x - pushDir * 150;
                        targetY = ball.y;
                    }
                    break;
                }
                case 'DEFEND': {
                    let defenseLineX = this.isLeftTeam ? Math.min(ball.x - 200, 450) : Math.max(ball.x + 200, 1550);
                    if (this.playStyle === 'DEFENSIVE' || this.playStyle === 'COUNTER_ATTACK') {
                        defenseLineX = this.isLeftTeam ? Math.min(ball.x - 300, 350) : Math.max(ball.x + 300, 1650);
                    }
                    
                    targetX = Phaser.Math.Clamp(defenseLineX, this.isLeftTeam ? 150 : 1200, this.isLeftTeam ? 800 : 1850);
                    
                    let nearestOpp = null; let nearestOppDist = Infinity;
                    this.scene.players.forEach(p => {
                        if (p.isLeftTeam !== this.isLeftTeam && !p.isGoalkeeper) {
                            const d = Phaser.Math.Distance.Between(this._homeX, this._homeY, p.x, p.y);
                            if (d < nearestOppDist) { nearestOppDist = d; nearestOpp = p; }
                        }
                    });
                    
                    const markingDist = 300 + (intFactor * 250);
                    if (nearestOpp && nearestOppDist < markingDist) {
                        targetX = nearestOpp.x + (goalX - nearestOpp.x) * 0.15;
                        targetY = nearestOpp.y + (600 - nearestOpp.y) * 0.15;
                    } else {
                        targetY = 600 + (this._homeY - 600) * 0.8;
                    }
                    break;
                }
                case 'ATTACK': {
                    let pushAmount = 350 + (this.stats.speed * 120); 
                    if (this.playStyle === 'ATTACKING' || this.playStyle === 'COUNTER_ATTACK') pushAmount += 250; 
                    
                    // Attack depth
                    targetX = ball.x + pushDir * pushAmount;
                    
                    // Wing corridors (if player home Y is far from center, push out wider)
                    let wideFactor = (this._homeY - 600) * 0.3; // Reduced to prevent sticking to edges
                    targetY = 600 + wideFactor;
                    
                    if (intFactor > 0.4) {
                        this.scene.players.forEach(p => {
                            if (p.isLeftTeam !== this.isLeftTeam && !p.isGoalkeeper) {
                                const dist = Phaser.Math.Distance.Between(targetX, targetY, p.x, p.y);
                                if (dist < 250) {
                                    // Move away from defenders to create passing lanes
                                    targetY += (targetY > p.y ? 180 : -180);
                                    targetX += pushDir * 50;
                                }
                            }
                        });
                    }
                    break;
                }
                case 'DRIBBLE': {
                    targetX = oppGoalX;
                    targetY = 600;
                    
                    const enemies = this.scene.players.filter(p => p.isLeftTeam !== this.isLeftTeam && !p.isGoalkeeper);
                    let closestEnemyDist = Infinity;
                    let closestEnemy = null;
                    enemies.forEach(e => {
                        const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
                        if (d < closestEnemyDist) { closestEnemyDist = d; closestEnemy = e; }
                    });
                    
                    let passProb = 0.05 + (intFactor * 0.1); 
                    if (this.playStyle === 'POSSESSION') passProb += 0.2;
                    
                    const dodgeDist = 150 + (this.stats.dribbling * 70);
                    if (closestEnemy && closestEnemyDist < dodgeDist) {
                        targetY += (this.y > closestEnemy.y ? dodgeDist : -dodgeDist);
                        
                        passProb += 0.3 + (intFactor * 0.2); 
                        if (closestEnemyDist < 100) passProb += 0.4;
                    }
                    
                    if (Math.random() < passProb && this.shootCooldown <= 0) {
                        this.passBall(ball);
                        this.lastDecision = "PASS";
                        break;
                    }
                    
                    let shootThreshold = 400 + (this.stats.shooting * 150); // Reduced to prevent shooting from GK half
                    if (this.playStyle === 'POSSESSION') shootThreshold -= 100;
                    
                    const distToGoal = Phaser.Math.Distance.Between(this.x, this.y, oppGoalX, 600);
                    
                    // FORCE SHOOT IF VERY CLOSE TO GOAL (PREVENTS CLUMPING AT POSTS)
                    if (distToGoal < 350 && this.shootCooldown <= 0) {
                        this.shootBall(ball, 1200 + (this.stats.shooting * 350), Math.atan2(600 - this.y, oppGoalX - this.x));
                        this.lastDecision = "FORCED_SHOOT";
                        break;
                    }
                    
                    if (distToGoal < shootThreshold && this.shootCooldown <= 0) {
                        let blocked = false;
                        if (intFactor > 0.4) {
                            enemies.forEach(e => {
                                if (e.x > Math.min(this.x, oppGoalX) && e.x < Math.max(this.x, oppGoalX)) {
                                    // Stricter block check based on angle to goal
                                    const angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                                    const angleToGoal = Math.atan2(600 - this.y, oppGoalX - this.x);
                                    let diff = Math.abs(angleToEnemy - angleToGoal);
                                    if (diff > Math.PI) diff = (Math.PI * 2) - diff;
                                    
                                    if (diff < 0.3 && Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y) < 300) {
                                        blocked = true;
                                    }
                                }
                            });
                        }
                        
                        if (!blocked || Math.random() > intFactor + 0.1) { // Long shots!
                            this.shootBall(ball, 1350 + (this.stats.shooting * 400), Math.atan2(600 - this.y, oppGoalX - this.x));
                            this.lastDecision = "LONG_SHOOT";
                        } else if (blocked) {
                            this.passBall(ball);
                            this.lastDecision = "PASS_INSTEAD_OF_BLOCKED_SHOT";
                        }
                    }
                    break;
                }
                case 'POSITIONING':
                default: {
                    const positionDrift = (1.3 - intFactor) * 80;
                    targetX = this._homeX + (ball.x - 1000) * 0.15 + (Math.random() - 0.5) * positionDrift;
                    targetY = this._homeY + (ball.y - 600) * 0.15 + (Math.random() - 0.5) * positionDrift;
                    break;
                }
            }
            
            if (time > this.unstuckTime) {
                const moveDist = Phaser.Math.Distance.Between(this.x, this.y, this.lastX, this.lastY);
                if (moveDist < 1.5 && this.aiState !== 'POSITIONING') {
                    this.stuckTimer += dt;
                    if (this.stuckTimer > 35) {
                        this.unstuckTime = time + 800;
                        this.stuckTimer = 0;
                        const escapeDirX = (this.x < 1000) ? 1 : -1;
                        const escapeDirY = (this.y < 600) ? 1 : -1;
                        this.escapeX = this.x + escapeDirX * 300 + (Math.random() - 0.5) * 100;
                        this.escapeY = this.y + escapeDirY * 300 + (Math.random() - 0.5) * 100;
                    }
                } else {
                    this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
                }
            }
            
            if (time < this.unstuckTime) {
                targetX = this.escapeX;
                targetY = this.escapeY;
            }
            this.lastX = this.x;
            this.lastY = this.y;
            
            if (this.aiState === 'DEFEND' || this.aiState === 'SUPPORT' || this.aiState === 'COVER') {
                const inPenaltyBox = (targetX < 350 || targetX > 1650) && targetY > 300 && targetY < 900;
                if (inPenaltyBox) {
                    if (targetX < 150) targetX = 150 + Math.random() * 50;
                    if (targetX > 1850) targetX = 1850 - Math.random() * 50;
                }
            }
            
            let minX = 100;
            let maxX = 1900;
            if (!this.isGoalkeeper) {
                minX = 150;
                maxX = 1850;
            }
            this.aiTarget.x = Phaser.Math.Clamp(targetX, minX, maxX);
            this.aiTarget.y = Phaser.Math.Clamp(targetY, 150, 1050);
        }
        } // <-- End of reactionTimer if block
        
        // MOVEMENT (Smooth Acceleration/Deceleration)
        let targetX = this.aiTarget.x;
        let targetY = this.aiTarget.y;
        let effectiveSpeed = this.speed;
        if (this.hasPossession) {
            const dribblePenalty = 0.10 - Math.min(0.06, Math.max(0, (this.stats.dribbling - 0.85) * (0.06 / 0.30)));
            effectiveSpeed *= (1.0 - dribblePenalty);
        }
        if (this.body) {
            this.body.setMaxVelocity(Math.min(310, effectiveSpeed * 1.1));
        }
        const accel = effectiveSpeed * 15 * this.stats.accel;
        const distToTarget = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        
        if (distToTarget > 20) {
            const angle = Math.atan2(targetY - this.y, targetX - this.x);
            const currentAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
            
            let turnDiff = angle - currentAngle;
            while (turnDiff < -Math.PI) turnDiff += Math.PI * 2;
            while (turnDiff > Math.PI) turnDiff -= Math.PI * 2;
            
            const turnPenalty = Math.abs(turnDiff) > Math.PI / 1.5 ? 0.3 : (Math.abs(turnDiff) > Math.PI / 3 ? 0.7 : 1.0);
            
            let currentAccel = accel * turnPenalty;
            if (distToTarget < 100) currentAccel *= (distToTarget / 100); 
            
            if (Math.abs(turnDiff) > Math.PI / 2) {
                this.body.velocity.x *= 0.9;
                this.body.velocity.y *= 0.9;
            }
            
            // Apply speed
            this.body.setAcceleration(Math.cos(angle) * currentAccel, Math.sin(angle) * currentAccel);
        } else {
            this.body.setAcceleration(0, 0);
            this.body.velocity.x *= 0.70;
            this.body.velocity.y *= 0.70;
        }

        // PHYSICAL SEPARATION (ANTI-CLUMPING & GK PROTECTION)
        this.scene.players.forEach(p => {
            if (p !== this && p.body) {
                const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
                
                let minSeparation = 100;
                let repelForceMult = 1.0;
                
                // Goalkeeper Protection Zone
                if (p.isGoalkeeper && !this.isGoalkeeper && p.isLeftTeam !== this.isLeftTeam) {
                    minSeparation = 140; // Large protection zone for GK
                    repelForceMult = 2.5; // Push attackers away strongly
                } else if (p.isGoalkeeper) {
                    minSeparation = 110;
                }

                if (distToPlayer < minSeparation && distToPlayer > 0) {
                    const repelForce = (minSeparation - distToPlayer) * repelForceMult;
                    const angleAway = Math.atan2(this.y - p.y, this.x - p.x);
                    this.body.velocity.x += Math.cos(angleAway) * repelForce * dt;
                    this.body.velocity.y += Math.sin(angleAway) * repelForce * dt;
                }
            }
        });

        // DEBUG OVERLAY
        if (window.AI_DEBUG_MODE) {
            if (!this.aiDebugText) {
                this.aiDebugText = this.scene.add.text(0, -60, '', { font: '10px monospace', fill: '#0f0', backgroundColor: '#0008' }).setOrigin(0.5);
                this.add(this.aiDebugText);
                this.aiDebugLine = this.scene.add.graphics();
                this.aiDebugLine.setDepth(500);
            }
            this.aiDebugText.setVisible(true);
            this.aiDebugText.setRotation(-this.rotation); 
            this.aiDebugText.setText(`ROLE:${this.playerRole || this._formation || 'MID'}
ST:${this.aiState}
AC:${this.lastDecision || 'NONE'}`);
            
            this.aiDebugLine.clear();
            if (this.aiTarget) {
                this.aiDebugLine.lineStyle(2, this.isLeftTeam ? 0x00ff00 : 0xff0000, 0.4);
                this.aiDebugLine.beginPath();
                this.aiDebugLine.moveTo(this.x, this.y);
                this.aiDebugLine.lineTo(this.aiTarget.x, this.aiTarget.y);
                this.aiDebugLine.strokePath();
            }
        } else if (this.aiDebugText) {
            this.aiDebugText.setVisible(false);
            if (this.aiDebugLine) this.aiDebugLine.clear();
        }
    }

    shootBall(ball, force, customAngle) {
        if (!ball || !ball.body) return;


        const goalX = this.isLeftTeam ? 1950 : 50;
        let goalY = 600; 
        if (Math.random() > 0.5) goalY = 540; else goalY = 660; // Aim at corners slightly
        
        const distToGoal = Phaser.Math.Distance.Between(this.x, this.y, goalX, goalY);
        let angleToGoal = Math.atan2(goalY - this.y, goalX - this.x);
        let finalAngle = angleToGoal;
        
        // Prevent shooting if ball is too far
        if (Phaser.Math.Distance.Between(this.x, this.y, ball.x, ball.y) > 130) return;
        
        if (this.isHuman && distToGoal > 1200) {
            // Cannot shoot from own half, convert to clearance
            finalAngle = customAngle !== undefined ? customAngle : this.rotation;
            force = 750;
        } else {
            const distancePenalty = Math.max(0, (distToGoal - 400) / 1000); 
            let errorMargin = ((1.25 - (this.stats.shotAccuracy || 0.5)) * 0.35) + (distancePenalty * 0.25) + ((this.maxStamina - this.stamina) / this.maxStamina * 0.20);
            
            if (customAngle !== undefined) {
                // If human aiming, blend their angle with the goal angle for some assist, 
                // but let them aim if they want to.
                let diff = customAngle - angleToGoal;
                // Normalize diff
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                
                // If they are aiming relatively towards the goal, assist them.
                if (Math.abs(diff) < Math.PI / 2.5) {
                     finalAngle = angleToGoal + diff * 0.4; // 60% aim assist
                } else {
                     finalAngle = customAngle; // Free aim
                }
            }
            
            finalAngle += Phaser.Math.FloatBetween(-errorMargin, errorMargin);
            force = Phaser.Math.Clamp(force * 1.1, 950, 1600); // Increased shot force
        }

        let finalVx = Math.cos(finalAngle) * force;
        let finalVy = Math.sin(finalAngle) * force;
        
        // Momentum transfer
        finalVx += this.body.velocity.x * 0.4;
        finalVy += this.body.velocity.y * 0.4;

        const team = this.scene.teamStats[this.isLeftTeam ? 0 : 1];
        const goalLine = this.isLeftTeam ? 1875 : 125;
        const goalTravelTime = (goalLine - ball.x) / finalVx;
        const projectedY = ball.y + finalVy * goalTravelTime;
        const isOnTarget = goalTravelTime > 0 && projectedY > 470 && projectedY < 730;
        team.shots++;
        if (isOnTarget) team.shotsOnTarget++;
        if (window.audioManager) window.audioManager.playSFX('kick', 1.0);
        if (this.isHuman && this.scene.userPlayerStats) this.scene.userPlayerStats.shots++;

        ball.body.setVelocity(finalVx, finalVy);
        this.hasPossession = false;
        if (this.scene) {
            this.scene.ballState = 'FREE';
            if (this.scene.ballController === this) this.scene.ballController = null;
            
            // Check shot on target vs off target for match rating
            if (this.isHuman) {
                if (isOnTarget) {
                    if (this.scene.userPlayerStats) this.scene.userPlayerStats.shotsOnTarget++;
                    if (this.scene.recordMatchRatingEvent) this.scene.recordMatchRatingEvent(0.3, "İsabetli Şut");
                } else {
                    if (this.scene.recordMatchRatingEvent) this.scene.recordMatchRatingEvent(-0.1, "İsabetsiz Şut");
                }
            }
            
            // Premium shot animation (wind up & follow-through)
            this.scene.tweens.add({
                targets: this,
                scaleX: 1.2,
                scaleY: 0.8,
                duration: 50,
                yoyo: true,
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: this,
                        scaleX: 0.9,
                        scaleY: 1.1,
                        duration: 100,
                        yoyo: true
                    });
                }
            });
        }
        this.shootCooldown = 600;
        this.possessionTimer = 0;
        if (this.scene && force > 600) {
            this.scene.cameras.main.shake(100, 0.006 * (force/1000)); 
            
            let shotType = 'shot_default';
            if (this.isHuman && window.gameState && window.gameState.customization && window.gameState.customization.equipped) {
                shotType = window.gameState.customization.equipped.shotEffect || 'shot_default';
            }

            if (shotType === 'shot_default') {
                const flash = this.scene.add.circle(this.x, this.y, 40, 0xffffff, 0.5).setDepth(200).setBlendMode('ADD');
                this.scene.uiCamera.ignore(flash);
                this.scene.tweens.add({ targets: flash, scale: 1.5, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
            } else {
                let config = {};
                if (shotType === 'shot_purple') {
                    config = { speed: { min: 40, max: 120 }, angle: { min: -110, max: -70 }, scale: { start: 0.3, end: 0 }, alpha: { start: 0.8, end: 0 }, lifespan: 600, quantity: 40, duration: 500, particleTint: 0xd946ef, blendMode: 'ADD', gravityY: -200 };
                } else if (shotType === 'shot_electric') {
                    config = { speed: { min: 100, max: 300 }, angle: { min: 0, max: 360 }, scaleX: { start: 0.5, end: 0 }, scaleY: { start: 0.05, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 200, frequency: 20, duration: 400, particleTint: 0xfde047, blendMode: 'ADD' };
                } else if (shotType === 'shot_ice') {
                    config = { speed: { min: 150, max: 400 }, angle: { min: 0, max: 360 }, scale: { start: 0.2, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: { min: 300, max: 700 }, quantity: 25, duration: 100, particleTint: 0xa5f3fc, blendMode: 'NORMAL', gravityY: 300 };
                } else if (shotType === 'shot_cyan') {
                    config = { speed: 0, scale: { start: 0.1, end: 0.8 }, alpha: { start: 0.6, end: 0 }, lifespan: 500, frequency: 150, duration: 600, particleTint: 0x00ffff, blendMode: 'ADD' };
                } else if (shotType === 'shot_gold') {
                    config = { speed: { min: 50, max: 150 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 800, quantity: 50, duration: 400, particleTint: 0xfbbf24, blendMode: 'ADD' };
                    const glow = this.scene.add.circle(this.x, this.y, 50, 0xfbbf24, 0.8).setDepth(200).setBlendMode('ADD');
                    this.scene.uiCamera.ignore(glow);
                    this.scene.tweens.add({ targets: glow, scale: 2, alpha: 0, duration: 400, onComplete: () => glow.destroy() });
                }
                const p = this.scene.add.particles(this.x, this.y, 'ball_basic', config);
                p.setDepth(205);
                this.scene.uiCamera.ignore(p);
                this.scene.time.delayedCall(1000, () => p.destroy());
            }
            
            // Add powerful shot trail
            if (this.scene.trailEmitter) {
                let trailColor = this.isLeftTeam ? 0xd946ef : 0x00ffff;
                if (this.isHuman && window.gameState && window.gameState.customization && window.gameState.customization.equipped) {
                    const trailType = window.gameState.customization.equipped.ballTrail;
                    if (trailType === 'trail_purple') trailColor = 0xd946ef;
                    else if (trailType === 'trail_cyan') trailColor = 0x00ffff;
                }
                this.scene.trailEmitter.setParticleTint(trailColor);
                this.scene.trailEmitter.startFollow(ball);
                this.scene.trailEmitter.start();
                this.scene.time.delayedCall(400, () => {
                    if (this.scene && this.scene.trailEmitter) this.scene.trailEmitter.stop();
                });
            }
        }
    }

    attemptTackle(ball) {
        this.tackleCooldown = 400; // Faster tackle responsiveness
        if (this.scene && this.scene.ballController && this.scene.ballController !== this && this.scene.ballController.isLeftTeam !== this.isLeftTeam) {
            const opp = this.scene.ballController;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, opp.x, opp.y);
            const tackleDist = this.isHuman ? 125 : 85; // Generous tackle hitbox for player!
            
            if (dist < tackleDist) {
                // Successful steal
                opp.hasPossession = false;
                opp.possessionTimer = 0;
                opp.shootCooldown = 600; // Stun opponent briefly
                
                this.hasPossession = true;
                this.possessionTimer = 600;
                this.scene.ballController = this;
                this.scene.ballState = 'CONTROLLED';
                this.scene.lastBallController = this;
                this.scene.teamStats[this.isLeftTeam ? 0 : 1].tackles++;

                if (this.scene.sparkEmitter) {
                    this.scene.sparkEmitter.emitParticleAt(ball.x, ball.y, 15);
                }
                
                if (this.isHuman && this.scene) {
                    if (this.scene.userPlayerStats) this.scene.userPlayerStats.tackles++;
                    if (this.scene.recordMatchRatingEvent) this.scene.recordMatchRatingEvent(0.25, "Top Çalma / Müdahale");
                }
                
                // Visual feedback for tackle
                this.scene.tweens.add({
                    targets: this,
                    scale: 1.15,
                    yoyo: true,
                    duration: 100
                });
            }
        }
    }

    passBall(ball, vx, vy) {
        if (!ball || !ball.body) return;
        const teammates = this.scene.players.filter(p => p !== this && p.isLeftTeam === this.isLeftTeam && !p.isGoalkeeper);
        if (teammates.length === 0) return this.shootBall(ball, 750);
        
        let target = null; let maxScore = -Infinity;
        const intFactor = Math.max(0.1, Math.min(1.0, (this.teamIntelligence || 0.5) * (0.6 + this.controllerId * 0.1)));
        
        let aimAngle = (vx !== undefined && vy !== undefined && (vx !== 0 || vy !== 0)) 
            ? Math.atan2(vy, vx) 
            : (this.isLeftTeam ? 0 : Math.PI);
            
        teammates.forEach(t => {
            const dx = t.x - this.x;
            const dy = t.y - this.y;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, t.x, t.y);
            const passAngleToTeammate = Math.atan2(dy, dx);
            
            let angleDiff = Math.abs(aimAngle - passAngleToTeammate);
            if (angleDiff > Math.PI) angleDiff = (Math.PI * 2) - angleDiff;
            
            let risk = 0;
            const enemies = this.scene.players.filter(p => p.isLeftTeam !== this.isLeftTeam);
            enemies.forEach(e => {
                const enemyDistToPassLine = Math.abs(Math.sin(passAngleToTeammate - Math.atan2(e.y - this.y, e.x - this.x)) * Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y));
                const enemyDistToMe = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
                
                if (enemyDistToMe < dist && enemyDistToPassLine < 150) {
                    risk += (180 - enemyDistToPassLine) * 60 * intFactor;
                }
            });
            
            let openSpaceBonus = 0;
            if (!this.isHuman) {
                let closestEnemyToTarget = Infinity;
                enemies.forEach(e => {
                    const d = Phaser.Math.Distance.Between(t.x, t.y, e.x, e.y);
                    if (d < closestEnemyToTarget) closestEnemyToTarget = d;
                });
                openSpaceBonus = closestEnemyToTarget * 12 * intFactor;
            }
            
            let angleScore = 0;
            if (this.isHuman) {
                angleScore = Math.max(0, (Math.PI/2 - angleDiff) * 2000);
            } else {
                const forwardAngle = this.isLeftTeam ? 0 : Math.PI;
                let forwardDiff = Math.abs(forwardAngle - passAngleToTeammate);
                if (forwardDiff > Math.PI) forwardDiff = (Math.PI * 2) - forwardDiff;
                
                // If high risk, heavily prefer safe back-passes
                if (risk > 4000) {
                    angleScore = (forwardDiff > Math.PI / 2) ? 1500 : 0; // Bonus for backward pass
                } else {
                    angleScore = Math.max(0, (Math.PI/2 - forwardDiff) * 1200); 
                    if (this.playStyle === 'POSSESSION') angleScore = 800; // More balanced passing
                }
            }
            
            const score = angleScore + openSpaceBonus - (dist * 0.5) - risk;
            
            if (score > maxScore) { maxScore = score; target = t; }
        });
        
        if (target && maxScore > -4000) {
            const errorFactor = (1.1 - this.stats.passing) * (1.1 - intFactor);
            const passErrorMargin = errorFactor * 0.4; 
            
            const tx = target.x + (target.body ? target.body.velocity.x * 0.4 : 0);
            const ty = target.y + (target.body ? target.body.velocity.y * 0.4 : 0);
            let finalAngle = Math.atan2(ty - this.y, tx - this.x);
            
            if (!this.isHuman) {
                finalAngle += Phaser.Math.FloatBetween(-passErrorMargin, passErrorMargin);
            }
            
            // Calculate force based on distance
            const force = Phaser.Math.Clamp(Phaser.Math.Distance.Between(this.x, this.y, tx, ty) * 3.5, 650, 1050) * (this.isHuman ? this.stats.passing : 1);
            
            let finalVx = Math.cos(finalAngle) * force;
            let finalVy = Math.sin(finalAngle) * force;
            
            // Momentum transfer for passes too
            finalVx += this.body.velocity.x * 0.3;
            finalVy += this.body.velocity.y * 0.3;
            
            this.scene.teamStats[this.isLeftTeam ? 0 : 1].passes++;
            if (this.isHuman && this.scene) {
                if (this.scene.userPlayerStats) this.scene.userPlayerStats.passes++;
                this.scene._pendingHumanPass = true;
            }
            ball.body.setVelocity(finalVx, finalVy);
            if (window.audioManager) window.audioManager.playSFX('kick', 1.0);
            this.hasPossession = false;
            if (this.scene) {
                this.scene.ballState = 'FREE';
                if (this.scene.ballController === this) this.scene.ballController = null;
            }
            this.shootCooldown = 400; 
            this.possessionTimer = 0;
            
            if (this.scene.trailEmitter) {
                let trailColor = this.isLeftTeam ? 0xd946ef : 0x00ffff;
                if (this.isHuman && window.gameState && window.gameState.customization && window.gameState.customization.equipped) {
                    const trailType = window.gameState.customization.equipped.ballTrail;
                    if (trailType === 'trail_purple') trailColor = 0xd946ef;
                    else if (trailType === 'trail_cyan') trailColor = 0x00ffff;
                }
                this.scene.trailEmitter.setParticleTint(trailColor);
                this.scene.trailEmitter.startFollow(ball);
                this.scene.trailEmitter.start();
                this.scene.time.delayedCall(200, () => this.scene.trailEmitter.stop());
            }
        } else {
            this.shootBall(ball, 950); 
        }
    }

    resetState(hx, hy) {
        if (hx !== undefined) this.x = hx;
        if (hy !== undefined) this.y = hy;
        
        if (this.body) {
            this.body.setVelocity(0, 0);
            this.body.setAcceleration(0, 0);
        }
        
        this.hasPossession = false;
        this.possessionTimer = 0;
        this.isHoldingBall = false;
        this.heldBallTimer = 0;
        this.dashCooldown = 0;
        this.tackleCooldown = 0;
        this.shootCooldown = 0;
        this.diveCooldown = 0;
        this.catchCooldown = 0;
        this.clearShotCharge();
        this.aiState = 'IDLE';
        this.aiTarget = {x: this.x, y: this.y};
        this.lastDecisionTime = 0;
        this.dashBoost = 0;
        this.stamina = this.maxStamina;
        this.isFatigued = false;
        this.isSprinting = false;

    }

    set playerName(val) {
        this._playerName = val;
        if (!this.nameTagText) {
            this.nameTagText = this.scene.add.text(0, -32, val, {
                font: '900 11px sans-serif',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            this.add(this.nameTagText);
        } else {
            this.nameTagText.setText(val);
        }
    }

    get playerName() {
        return this._playerName || '';
    }
}
