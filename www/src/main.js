// --- GLOBAL SAFE AREA UTILITY ---
window.getSafeArea = () => {
    const root = getComputedStyle(document.documentElement);
    return {
        safeLeft: parseInt(root.getPropertyValue('--sal')) || 0,
        safeRight: parseInt(root.getPropertyValue('--sar')) || 0,
        safeTop: parseInt(root.getPropertyValue('--sat')) || 0,
        safeBottom: parseInt(root.getPropertyValue('--sab')) || 0
    };
};

window.gameState = {
  careerDataMode: 'SAFE_PUBLIC_MODE', // REAL_DATA_MODE or SAFE_PUBLIC_MODE
  player: {
      name: "",
      onboardingComplete: false,
      username: "",
      level: 1,
      xp: 0,
      attributes: { speed: 50, dribbling: 50, shooting: 50, passing: 50, physical: 50, stamina: 50 },
      overall: 50,
      stats: { matches: 0, goals: 0, assists: 0, averageRating: 0, reputation: 50, cleanSheets: 0, hatTricks: 0, winStreak: 0, maxWinStreak: 0, cupsWon: 0, championships: 0, marketValue: 5000 }
  },
  career: {
    started: false,
    currentClubId: null,
    currentClub: null,
    contract: null,
    currentSeason: 1,
    currentWeek: 0,
    fixtures: [],
    standings: [],
    cups: [],
    transfers: [],
    completedMatches: [],
    playerCareerStats: { matches: 0, goals: 0, assists: 0, averageRating: "-", rewards: 0, trophyCount: 0 },
    activeView: 'season',
    ez: 1000,
    rating: 100,
    adsWatchedToday: 0,
    lastAdDate: new Date().toDateString()
  },
  activeMatch: null,
  customization: {
      equipped: {
          kit: 0,
          accessory: null,
          ball: 'ball_basic',
          goalAnimation: 'default_goal',
          expression: 'neutral'
      },
      unlockedAccessories: [],
      unlockedBalls: ['ball_basic'],
      unlockedGoalAnimations: ['default_goal'],
      unlockedPowers: ['fireball'],
      colors: [
          { primary: 0xe11d48, secondary: 0xffffff, accent: 0x000000 },
          { primary: 0x2563eb, secondary: 0xffffff, accent: 0x000000 }
      ]
  },
  playerDevelopment: {
  },
  socialMedia: {
      followers: 0,
      posts: []
  },
  achievements: {
      unlockedLeagues: ['Amateur'],
      cupsWon: 0
  },
  settings: {
      musicOn: true,
      sfxOn: true,
      brightness: 100,
      language: 'tr',
      accountLinked: false
  }
};

// Force landscape orientation if supported before Phaser initializes
if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape-primary').catch(err => {
        console.warn("Orientation lock failed:", err);
    });
}

const screenRatio = Math.max(window.innerWidth / window.innerHeight, window.innerHeight / window.innerWidth);
const gameWidth = Math.max(1280, Math.floor(720 * screenRatio));

const config = {
    type: Phaser.AUTO,
    width: gameWidth,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#0f172a',
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    fps: {
        target: 60,
        forceSetTimeOut: false
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        orientation: Phaser.Scale.Orientation.LANDSCAPE
    },
    input: {
        activePointers: 3
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: false,
            fps: 60 // Fixed physics FPS to 60 as requested for stability
        }
    },
    dom: {
        createContainer: true
    },
    scene: [
        BootScene,
        PreloadScene,
        SplashScene,
        OnboardingScene,
        MenuScene,
        CustomizationScene,
        BallShopScene,
        CareerWorldScene,
        KitSelectionScene,
        GameScene,
        SocialMediaScene,
        PostMatchScene,
        EndOfSeasonScene
    ]
};

// Load saved data
if (window.TeamDatabase && typeof window.TeamDatabase.init === 'function') window.TeamDatabase.init();
if (window.GameStateManager && typeof window.GameStateManager.init === 'function') window.GameStateManager.init();
if (window.SaveManager && typeof window.SaveManager.load === 'function') {
    window.SaveManager.load();
}

// Analytics Service Initialization
if (window.AnalyticsService && typeof window.AnalyticsService.init === 'function') {
    window.AnalyticsService.init();
}

// QA System Initialization (Disabled in release builds by default)
window.QA_MODE = window.QA_MODE || false;
if (window.QAOverlay && typeof window.QAOverlay.init === 'function') {
    window.QAOverlay.init();
}

if (typeof Phaser === 'undefined') {
    const log = document.getElementById('error-log');
    if (log) {
        log.style.display = 'block';
        log.innerText = "CRITICAL ERROR: Phaser could not be loaded.\nCheck your internet connection.\nOr open console for details.";
    }
    throw new Error("Phaser not loaded");
}

const container = document.getElementById('game-container');
if (container) {
    container.innerHTML = '';
}

if (window.phaserGame) {
    window.phaserGame.destroy(true);
    window.phaserGame = null;
}
window.phaserGame = new Phaser.Game(config);

// Refresh scale manager after size or orientation changes to keep canvas centered/fitted
let resizeTimeout;
const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Reset scroll offsets when orientation changes or keyboard hides
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;

        if (window.phaserGame && window.phaserGame.scale) {
            window.phaserGame.scale.refresh();
            
            // Notify active scenes that viewport changed
            window.phaserGame.scene.scenes.forEach(scene => {
                if (scene.sys.isActive() && typeof scene.onViewportResize === 'function') {
                    scene.onViewportResize();
                }
            });
        }
    }, 100);
};

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 300);
});

// Web and native lifecycle events can overlap. Resume once both are active.
let nativeAppActive = true;
let backgroundScenes = [];
let previousMute;
function updateAppLifecycle() {
    const game = window.phaserGame;
    if (document.hidden || !nativeAppActive) {
        if (previousMute !== undefined) return;
        backgroundScenes = game.scene.getScenes(true);
        backgroundScenes.forEach(scene => {
            scene.resetMatchInput?.();
            scene.sys.pause();
        });
        previousMute = game.sound.mute;
        game.sound.mute = true;
        return;
    }

    if (previousMute !== undefined) {
        backgroundScenes.forEach(scene => {
            if (scene.scene.isPaused()) scene.sys.resume();
        });
        game.sound.mute = previousMute;
        previousMute = undefined;
        backgroundScenes = [];
    }
}
document.addEventListener('visibilitychange', updateAppLifecycle);

// --- SHARED NAVIGATION BACK FUNCTION ---
window.navigateBack = function() {
    if (!window.phaserGame) return;
    const activeScenes = window.phaserGame.scene.getScenes(true);
    if (activeScenes.length === 0) return;
    const currentScene = activeScenes[activeScenes.length - 1]; // topmost active scene
    const sceneKey = currentScene.scene.key;

    console.log("[NAV] navigateBack from:", sceneKey);

    // If avatar picker is open inside settings, close it first
    const avatarPicker = document.getElementById('cyber-avatar-picker');
    if (avatarPicker) {
        avatarPicker.remove();
        return;
    }

    // Close any open DOM settings or shop overlays first
    const shopOverlay = document.getElementById('cyber-shop-overlay');
    if (shopOverlay) {
        shopOverlay.remove();
        return;
    }

    const settingsOverlay = document.getElementById('cyber-settings-overlay');
    if (settingsOverlay) {
        settingsOverlay.remove();
        return; // Settings was open, just close it
    }

    // Close any active Phaser modal container on the current scene (like Achievements, Shop, Spin, etc.)
    if (currentScene.activeModal) {
        if (currentScene._shopOpen !== undefined) {
            currentScene._shopOpen = false;
        }
        if (typeof currentScene.activeModal.destroy === 'function') {
            currentScene.activeModal.destroy();
        }
        currentScene.activeModal = null;
        return;
    }

    switch (sceneKey) {
        case 'GameScene':
            if (typeof currentScene.showPauseMenu === 'function') {
                currentScene.showPauseMenu();
            }
            break;

        case 'CareerWorldScene':
            if (currentScene.activeTab === 'gelisim') {
                currentScene.activeTab = 'season';
                currentScene.createTabBar();
                currentScene.renderTab('season');
            } else if (currentScene.activeTab === 'fixtures' || currentScene.activeTab === 'table' ||
                       currentScene.activeTab === 'cups' || currentScene.activeTab === 'transfers') {
                currentScene.activeTab = 'season';
                currentScene.createTabBar();
                currentScene.renderTab('season');
            } else {
                currentScene.cameras.main.fadeOut(300);
                currentScene.time.delayedCall(300, () => currentScene.scene.start('MenuScene'));
            }
            break;

        case 'KitSelectionScene':
            currentScene.cameras.main.fadeOut(300);
            currentScene.time.delayedCall(300, () => currentScene.scene.start('CareerWorldScene'));
            break;

        case 'CustomizationScene':
            // Cancel any unsaved previews
            if (currentScene.equippedAtStart && window.gameState && window.gameState.customization) {
                window.gameState.customization.equipped = { ...currentScene.equippedAtStart };
            }
            currentScene.cameras.main.fadeOut(300);
            currentScene.time.delayedCall(300, () => currentScene.scene.start('MenuScene'));
            break;

        case 'BallShopScene':
            currentScene.cameras.main.fadeOut(300);
            currentScene.time.delayedCall(300, () => currentScene.scene.start('MenuScene'));
            break;

        case 'SocialMediaScene':
            currentScene.cameras.main.fadeOut(300);
            currentScene.time.delayedCall(300, () => {
                // Return to PostMatch if came from there, otherwise CareerWorldScene
                const target = (currentScene._returnScene) ? currentScene._returnScene : 'CareerWorldScene';
                currentScene.scene.start(target);
            });
            break;

        case 'PostMatchScene':
            currentScene.cameras.main.fadeOut(300);
            currentScene.time.delayedCall(300, () => currentScene.scene.start('CareerWorldScene'));
            break;

        case 'EndOfSeasonScene':
            currentScene.cameras.main.fadeOut(300);
            currentScene.time.delayedCall(300, () => currentScene.scene.start('CareerWorldScene'));
            break;

        case 'MenuScene':
            // On main menu, show exit confirmation
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                // Use Phaser-based confirmation instead of window.confirm for better UX
                if (typeof currentScene.showExitConfirmation === 'function') {
                    currentScene.showExitConfirmation();
                } else {
                    if (window.confirm("Oyundan çıkmak istiyor musunuz?")) {
                        window.Capacitor.Plugins.App.exitApp();
                    }
                }
            }
            break;

        default:
            // Any unknown scene → go to MenuScene
            if (currentScene.scene && typeof currentScene.scene.start === 'function') {
                currentScene.cameras.main.fadeOut(300);
                currentScene.time.delayedCall(300, () => currentScene.scene.start('MenuScene'));
            }
            break;
    }
};

// --- MOBILE (CAPACITOR) BACK BUTTON HANDLER ---
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    const App = window.Capacitor.Plugins.App;
    App.removeAllListeners('backButton').then(() => {
        App.addListener('backButton', () => {
            window.navigateBack();
        });
    });
    
    App.addListener('appStateChange', ({ isActive }) => {
        nativeAppActive = isActive;
        updateAppLifecycle();
    });
} else {
    // Browser popstate fallback
    window.history.pushState({ page: 1 }, "FURIO FC", "");
    window.addEventListener('popstate', () => {
        window.history.pushState({ page: 1 }, "FURIO FC", "");
        window.navigateBack();
    });
}

// Reset window scroll offset globally when text inputs/keyboard get dismissed on mobile WebViews
document.addEventListener('focusout', (e) => {
    if (e && e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
    }
});
