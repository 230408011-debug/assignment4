class AudioManager {
    constructor(scene) {
        this.scene = scene;
        this.sound = scene.sound;
        
        // Volumes (0 to 1)
        this.volumes = {
            master: 0.8,
            music: 0.25,
            sfx: 0.4,
            crowd: 0.22
        };
        
        this.loadSettings();
        
        // Internal state
        this.currentBGM = null;
        this.currentAmbience = null;
        this.audioUnlocked = false;
        
        // Categories for grouping
        this.sounds = {
            bgm: {},
            ambience: {},
            sfx: {}
        };
        
        this.initUnlockListener();
    }
    
    initUnlockListener() {
        const unlockAudio = () => {
            if (this.audioUnlocked) return;
            this.audioUnlocked = true;
            if (this.sound.context && this.sound.context.state === 'suspended') {
                this.sound.context.resume();
            }
            document.removeEventListener('pointerdown', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };
        document.addEventListener('pointerdown', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
    }
    
    loadSettings() {
        if (window.gameState && window.gameState.settings) {
            const s = window.gameState.settings;
            if (s.masterVolume !== undefined) this.volumes.master = s.masterVolume / 100;
            if (s.musicVolume !== undefined) this.volumes.music = s.musicVolume / 100;
            if (s.sfxVolume !== undefined) this.volumes.sfx = s.sfxVolume / 100;
            if (s.crowdVolume !== undefined) this.volumes.crowd = s.crowdVolume / 100;
        }
        this.applyVolumes();
    }
    
    applyVolumes() {
        if (!this.sound) return;
        
        // Master volume
        this.sound.volume = this.volumes.master;
        
        // Update active looping sounds
        if (this.currentBGM) {
            this.currentBGM.setVolume(this.volumes.music);
        }
        if (this.currentAmbience) {
            this.currentAmbience.setVolume(this.volumes.crowd);
        }
    }
    
    setVolumes(master, music, sfx, crowd) {
        if (master !== undefined) this.volumes.master = master / 100;
        if (music !== undefined) this.volumes.music = music / 100;
        if (sfx !== undefined) this.volumes.sfx = sfx / 100;
        if (crowd !== undefined) this.volumes.crowd = crowd / 100;
        
        this.applyVolumes();
        
        // Save to game state
        if (window.gameState && window.gameState.settings) {
            window.gameState.settings.masterVolume = Math.round(this.volumes.master * 100);
            window.gameState.settings.musicVolume = Math.round(this.volumes.music * 100);
            window.gameState.settings.sfxVolume = Math.round(this.volumes.sfx * 100);
            window.gameState.settings.crowdVolume = Math.round(this.volumes.crowd * 100);
            
            if (window.saveManager) window.saveManager.save();
        }
    }
    
    // --- Playback Methods ---
    
    playBGM(key, fadeIn = 1000) {
        if (!this.audioUnlocked) return;
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`[AudioManager] BGM key "${key}" is not loaded in cache.`);
            return;
        }
        
        if (this.currentBGM && this.currentBGM.key === key && this.currentBGM.isPlaying) return;
        
        if (this.currentBGM) {
            this.stopBGM(500);
        }
        
        this.currentBGM = this.sound.add(key, { loop: true, volume: 0 });
        this.currentBGM.play();
        
        this.scene.tweens.add({
            targets: this.currentBGM,
            volume: this.volumes.music,
            duration: fadeIn
        });
    }
    
    stopBGM(fadeOut = 1000) {
        if (this.currentBGM && this.currentBGM.isPlaying) {
            const bgm = this.currentBGM;
            this.currentBGM = null;
            
            this.scene.tweens.add({
                targets: bgm,
                volume: 0,
                duration: fadeOut,
                onComplete: () => {
                    bgm.stop();
                    bgm.destroy();
                }
            });
        }
    }
    
    playAmbience(key, fadeIn = 2000) {
        if (!this.audioUnlocked) return;
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`[AudioManager] Ambience key "${key}" is not loaded in cache.`);
            return;
        }
        
        if (this.currentAmbience && this.currentAmbience.key === key && this.currentAmbience.isPlaying) return;
        
        if (this.currentAmbience) {
            this.stopAmbience(1000);
        }
        
        this.currentAmbience = this.sound.add(key, { loop: true, volume: 0 });
        this.currentAmbience.play();
        
        this.scene.tweens.add({
            targets: this.currentAmbience,
            volume: this.volumes.crowd,
            duration: fadeIn
        });
    }
    
    stopAmbience(fadeOut = 1000) {
        if (this.currentAmbience && this.currentAmbience.isPlaying) {
            const amb = this.currentAmbience;
            this.currentAmbience = null;
            
            this.scene.tweens.add({
                targets: amb,
                volume: 0,
                duration: fadeOut,
                onComplete: () => {
                    amb.stop();
                    amb.destroy();
                }
            });
        }
    }
    
    duckAmbience(duration = 3000, duckTo = 0.05) {
        if (this.currentAmbience && this.currentAmbience.isPlaying) {
            const targetVolume = this.volumes.crowd;
            
            // Fade down quickly
            this.scene.tweens.add({
                targets: this.currentAmbience,
                volume: duckTo,
                duration: 500,
                onComplete: () => {
                    // Fade back up slowly after duration
                    this.scene.time.delayedCall(duration, () => {
                        if (this.currentAmbience) {
                            this.scene.tweens.add({
                                targets: this.currentAmbience,
                                volume: targetVolume,
                                duration: 2000
                            });
                        }
                    });
                }
            });
        }
    }
    
    playSFX(key, volumeScale = 1.0) {
        if (!this.audioUnlocked) return;
        if (!this.scene.cache.audio.exists(key)) {
            console.warn(`[AudioManager] SFX key "${key}" is not loaded in cache.`);
            return;
        }
        
        // Check for quick repeat limits on UI clicks or kicks
        const now = Date.now();
        if (this.sounds.sfx[key] && (now - this.sounds.sfx[key].lastPlayed) < 100) {
            return; // Prevent extreme stacking
        }
        
        const snd = this.sound.add(key, { volume: this.volumes.sfx * volumeScale });
        
        if (!this.sounds.sfx[key]) this.sounds.sfx[key] = {};
        this.sounds.sfx[key].lastPlayed = now;
        
        snd.play();
        
        snd.once('complete', () => {
            snd.destroy();
        });
        
        return snd;
    }
    
    pauseAll() {
        this.sound.pauseAll();
    }
    
    resumeAll() {
        this.sound.resumeAll();
    }
}
window.AudioManager = AudioManager;
