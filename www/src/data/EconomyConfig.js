/**
 * EconomyConfig.js - Centralized Economy & Player Progression Configuration for Furio FC
 * Balanced progression curve:
 * - First attribute step (~3-4 matches)
 * - Complete 100 max attribute progression (~25-35 matches)
 * - Rewarded Ads & IAP hook interfaces
 */
const EconomyConfig = {
    version: '1.0.0',

    // Attribute Step Upgrade Costs (Target: ~2,500 EZ total per stat to reach 100)
    attributeUpgradeCosts: {
        50: 240, // 50 -> 60 (approx 3-4 matches)
        60: 360, // 60 -> 70 (approx 4-5 matches)
        70: 480, // 70 -> 80 (approx 6 matches)
        80: 620, // 80 -> 90 (approx 7-8 matches)
        90: 800  // 90 -> 100 (approx 10 matches)
    },

    getUpgradeCost(currentValue) {
        const val = Number(currentValue) || 50;
        if (val < 60) return this.attributeUpgradeCosts[50];
        if (val < 70) return this.attributeUpgradeCosts[60];
        if (val < 80) return this.attributeUpgradeCosts[70];
        if (val < 90) return this.attributeUpgradeCosts[80];
        if (val < 100) return this.attributeUpgradeCosts[90];
        return 0; // Maxed out
    },

    // Match Performance Rewards
    matchRewards: {
        winBonus: 50,
        drawBonus: 25,
        lossBonus: 15,
        goalBonus: 12,
        assistBonus: 8,
        cleanSheetBonus: 20,
        motmBonus: 25,
        // XP Rewards
        xpWin: 50,
        xpDraw: 25,
        xpLoss: 15,
        xpGoal: 15,
        xpAssist: 10,
        xpMotm: 25
    },

    calculateMatchReward(stats = {}) {
        const r = this.matchRewards;
        const isWin = Boolean(stats.isWin);
        const isDraw = Boolean(stats.isDraw);
        const goals = Number(stats.goals) || 0;
        const assists = Number(stats.assists) || 0;
        const cleanSheet = Boolean(stats.cleanSheet);
        const isMotm = Boolean(stats.isMotm);

        let ez = isWin ? r.winBonus : (isDraw ? r.drawBonus : r.lossBonus);
        ez += goals * r.goalBonus;
        ez += assists * r.assistBonus;
        if (cleanSheet) ez += r.cleanSheetBonus;
        if (isMotm) ez += r.motmBonus;

        let xp = isWin ? r.xpWin : (isDraw ? r.xpDraw : r.xpLoss);
        xp += goals * r.xpGoal;
        xp += assists * r.xpAssist;
        if (isMotm) xp += r.xpMotm;

        return {
            ezEarned: ez,
            xpEarned: xp,
            breakdown: {
                matchResult: isWin ? r.winBonus : (isDraw ? r.drawBonus : r.lossBonus),
                goals: goals * r.goalBonus,
                assists: assists * r.assistBonus,
                cleanSheet: cleanSheet ? r.cleanSheetBonus : 0,
                motm: isMotm ? r.motmBonus : 0
            }
        };
    },

    // Rewarded Ad Hooks (Ready for SDK integration)
    rewardedAd: {
        enabled: true,
        rewardEZ: 100,
        dailyLimit: 5,
        cooldownSeconds: 60,
        canWatch(careerData) {
            if (!this.enabled) return false;
            const watched = (careerData && careerData.adsWatchedToday) || 0;
            return watched < this.dailyLimit;
        }
    },

    // In-App Purchase (IAP) Product Catalog Hooks
    iapProducts: [
        { id: 'furio_ez_starter', name: 'Başlangıç Paketi', ezAmount: 1000, priceUsd: 0.99 },
        { id: 'furio_ez_pro', name: 'Pro Futbolcu Paketi', ezAmount: 3500, priceUsd: 2.99 },
        { id: 'furio_ez_elite', name: 'Yıldız Oyuncu Paketi', ezAmount: 10000, priceUsd: 7.99 }
    ]
};

window.EconomyConfig = EconomyConfig;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EconomyConfig;
}
