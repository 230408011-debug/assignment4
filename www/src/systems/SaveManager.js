const SaveManager = {
    SAVE_KEY: 'headSoccerSave',
    SAVE_VERSION: 9,

    validate(state) {
        if (!state) return false;
        if (!state.player || typeof state.player !== 'object') return false;
        if (!state.player.attributes || typeof state.player.attributes !== 'object') return false;
        if (!state.career || typeof state.career !== 'object') return false;
        if (typeof state.career.ez !== 'number') return false;

        // Strict career validation if started
        if (state.career.started) {
            if (!state.career.currentClubId) return false;
            if (!state.career.contract) return false;
            if (!state.career.currentLeagueId) return false;
            if (typeof state.career.currentSeason !== 'number') return false;
        }

        return true;
    },

    save() {
        try {
            if (!this.validate(window.gameState)) {
                console.error('SaveManager: Validation failed. Aborting save to prevent corruption.');
                return false;
            }

            window.gameState.saveVersion = this.SAVE_VERSION;
            const gameStateStr = JSON.stringify(window.gameState);
            
            // Safe backup writing (only backup if main is about to be overwritten successfully)
            const oldMain = localStorage.getItem(this.SAVE_KEY);
            if (oldMain) {
                localStorage.setItem(this.SAVE_KEY + '_backup', oldMain);
            }
            
            localStorage.setItem(this.SAVE_KEY, gameStateStr);
            return true;
        } catch (e) {
            console.error('SaveManager: Failed to save', e);
            return false;
        }
    },

    load() {
        let loaded = false;
        try {
            let raw = localStorage.getItem(this.SAVE_KEY);
            let parsed = null;
            
            if (raw) {
                try {
                    parsed = JSON.parse(raw);
                } catch(e) {
                    console.warn("Main save corrupted, attempting backup.");
                }
            }
            
            if (!parsed) {
                raw = localStorage.getItem(this.SAVE_KEY + '_backup');
                if (raw) {
                    try {
                        parsed = JSON.parse(raw);
                    } catch(e) {
                        console.error("Backup save also corrupted.");
                    }
                }
            }

            if (parsed) {
                const loadedVersion = parsed.saveVersion || 1;
                if (loadedVersion < 9) {
                    console.warn("Legacy save detected. Wiping to ensure a 100% clean career start for PUBLISHER VERSION.");
                    localStorage.removeItem(this.SAVE_KEY);
                    localStorage.removeItem(this.SAVE_KEY + '_backup');
                    localStorage.removeItem('headSoccerCareerData');
                    localStorage.removeItem('headSoccerCareerData_backup');
                    return false;
                }
                
                this.deepMerge(window.gameState, parsed);
                loaded = true;
                this.migrate(window.gameState);
            }
            // Migration path: Load legacy career data if available
            let careerRaw = localStorage.getItem('headSoccerCareerData');
            if (careerRaw && window.gameState && window.gameState.career) {
                try {
                    const parsedCareer = JSON.parse(careerRaw);
                    this.deepMerge(window.gameState.career, parsedCareer);
                    localStorage.removeItem('headSoccerCareerData');
                    localStorage.removeItem('headSoccerCareerData_backup');
                } catch(e) {}
            }

            this.validateCareerAfterLoad();
            return loaded;
        } catch (e) {
            console.error('SaveManager: Failed to load', e);
            return false;
        }
    },

    // Called after load to validate and repair career state
    validateCareerAfterLoad() {
        try {
            if (window.CareerManager && typeof window.CareerManager.validateAndRepairCareerState === 'function') {
                const career = window.gameState && window.gameState.career;
                if (career && (career.started || career.careerStarted) && career.currentClubId) {
                    console.log('[SaveManager] Running post-load career validation...');
                    window.CareerManager.validateAndRepairCareerState();
                }
            }
        } catch (e) {
            console.error('SaveManager: Career validation failed', e);
        }
    },

    migrate(state) {
        const loadedVersion = state.saveVersion || 1;
        
        if (loadedVersion < 6) {
            console.log(`SaveManager: Migrating save from v${loadedVersion} to v${this.SAVE_VERSION}`);
            
            // Migrate profile to player
            if (state.profile) {
                if (!state.player) state.player = {};
                this.deepMerge(state.player, state.profile);
                delete state.profile;
            }
            
            // Migrate legacy club keys to currentClubId
            if (state.career) {
                const legacyClub = state.career.currentClubId || state.career.selectedTeam || state.career.playerTeam || state.career.defaultClub || state.career.careerClub || state.career.oldClubId || (typeof state.career.currentClub === 'string' ? state.career.currentClub : (state.career.currentClub && state.career.currentClub.id));
                if (legacyClub) {
                    state.career.currentClubId = legacyClub;
                }
            }

            // Migrate careerWorld to career
            if (state.careerWorld) {
                const cwClub = state.careerWorld.currentClubId || state.careerWorld.selectedTeam || state.careerWorld.playerTeam || state.careerWorld.defaultClub || state.careerWorld.careerClub;
                if (cwClub) state.career.currentClubId = cwClub;
                if (state.careerWorld.contract) state.career.contract = state.careerWorld.contract;
                delete state.careerWorld;
            }

            // Migrate ballProgression to customization
            if (state.ballProgression) {
                if (!state.customization) state.customization = { equipped: {} };
                if (!state.customization.equipped) state.customization.equipped = {};
                if (state.ballProgression.unlockedBalls) state.customization.unlockedBalls = state.ballProgression.unlockedBalls;
                if (state.ballProgression.selectedBall) state.customization.equipped.ball = state.ballProgression.selectedBall;
                delete state.ballProgression;
            }

            // Migrate playerProfile and seasonProgress to career
            if (state.seasonProgress) {
                if (!state.career) state.career = {};
                
                // Ensure player.stats exists for playerProfile migration
                if (state.seasonProgress.playerProfile) {
                    if (!state.player) state.player = {};
                    if (!state.player.stats) state.player.stats = { matches: 0, goals: 0, assists: 0, averageRating: 0, reputation: 50, cleanSheets: 0, hatTricks: 0, winStreak: 0, maxWinStreak: 0, cupsWon: 0, championships: 0, marketValue: 5000 };
                    const pp = state.seasonProgress.playerProfile;
                    const stats = state.player.stats;
                    if (pp.totalMatches !== undefined) stats.matches = pp.totalMatches;
                    if (pp.totalGoals !== undefined) stats.goals = pp.totalGoals;
                    if (pp.totalAssists !== undefined) stats.assists = pp.totalAssists;
                    if (pp.avgRating !== undefined) stats.averageRating = pp.avgRating;
                    if (pp.reputation !== undefined) stats.reputation = pp.reputation;
                    if (pp.cleanSheets !== undefined) stats.cleanSheets = pp.cleanSheets;
                    if (pp.hatTricks !== undefined) stats.hatTricks = pp.hatTricks;
                    if (pp.winStreak !== undefined) stats.winStreak = pp.winStreak;
                    if (pp.maxWinStreak !== undefined) stats.maxWinStreak = pp.maxWinStreak;
                    if (pp.cupsWon !== undefined) stats.cupsWon = pp.cupsWon;
                    if (pp.championships !== undefined) stats.championships = pp.championships;
                }

                // Migrate season data
                if (state.seasonProgress.season !== undefined) state.career.currentSeason = state.seasonProgress.season;
                if (state.seasonProgress.currentMatchIndex !== undefined) state.career.currentWeek = state.seasonProgress.currentMatchIndex;
                if (state.seasonProgress.leagues) state.career.standings = state.seasonProgress.leagues;
                if (state.seasonProgress.fixtures) state.career.fixtures = state.seasonProgress.fixtures;
                if (state.seasonProgress.cups) state.career.cups = state.seasonProgress.cups;

                delete state.seasonProgress;
            }

            // Migrate pace to speed
            if (state.player && state.player.attributes) {
                const attrs = state.player.attributes;
                if (attrs.pace !== undefined) { attrs.speed = attrs.pace; delete attrs.pace; }
                if (attrs.power !== undefined) { attrs.shooting = attrs.power; delete attrs.power; }
                if (attrs.control !== undefined) { attrs.passing = attrs.control; delete attrs.control; }
                if (attrs.accuracy !== undefined) { attrs.physical = attrs.accuracy; delete attrs.accuracy; }
                
                // Recalculate overall
                state.player.overall = Math.round(
                    ((attrs.speed||50) + (attrs.shooting||50) + (attrs.passing||50) + (attrs.physical||50) + (attrs.dribbling||50) + (attrs.stamina||50)) / 6
                );
            }
            
            // Clean up teamColors
            if (state.teamColors) {
                delete state.teamColors;
            }
            
            // Migrate goalCelebration to goalAnimation (v5 to v6)
            if (state.customization && state.customization.equipped) {
                if (state.customization.equipped.goalCelebration) {
                    const oldAnim = state.customization.equipped.goalCelebration;
                    let newAnim = 'default_goal';
                    if (oldAnim === 'jump_celebration') newAnim = 'fire_burst';
                    else if (oldAnim === 'neon_dance_celebration') newAnim = 'neon_ring';
                    
                    state.customization.equipped.goalAnimation = newAnim;
                    delete state.customization.equipped.goalCelebration;
                    
                    if (!state.customization.unlockedGoalAnimations) {
                        state.customization.unlockedGoalAnimations = ['default_goal', newAnim];
                    } else if (!state.customization.unlockedGoalAnimations.includes(newAnim)) {
                        state.customization.unlockedGoalAnimations.push(newAnim);
                    }
                }
            }
            
            state.saveVersion = this.SAVE_VERSION;
            this.save();
        }
    },

    deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    },

    resetCareer() {
        if (!window.gameState) window.gameState = {};
        window.gameState.career = {
            currentClubId: null,
            currentLeagueId: null,
            currentOpponentId: null,
            currentFixtureId: null,
            careerStarted: false,
            hasChosenFirstClub: false,
            firstContractOffers: null,
            season: 1,
            ez: window.gameState.career ? (window.gameState.career.ez || 0) : 0 // preserve EZ if possible
        };
        this.save();
    }
};

window.SaveManager = SaveManager;
