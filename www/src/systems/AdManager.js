class AdManager {
    constructor() {
        this.isInitialized = false;
        this.rewardedAdLoaded = false;
        this.adId = 'ca-app-pub-3940256099942544/5224354917'; // Google Test Rewarded Ad Unit ID
        
        // Ensure Capacitor AdMob is available
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            this.AdMob = window.Capacitor.Plugins.AdMob;
        } else {
            this.AdMob = null;
        }
    }

    async initialize() {
        if (!this.AdMob) return;
        
        try {
            await this.AdMob.initialize({
                requestTrackingAuthorization: true,
                testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // example test device hash
                initializeForTesting: true, // Remove in production if using real ads
            });
            
            // Listeners
            this.AdMob.addListener('rewardedAdLoaded', (info) => {
                this.rewardedAdLoaded = true;
                if (window.AnalyticsManager) window.AnalyticsManager.logEvent('ad_loaded', { type: 'rewarded' });
            });
            
            this.AdMob.addListener('rewardedAdFailedToLoad', (info) => {
                this.rewardedAdLoaded = false;
                if (window.AnalyticsManager) window.AnalyticsManager.logEvent('ad_failed_to_load', { type: 'rewarded', error: info.error.message });
            });
            
            this.AdMob.addListener('rewardedAdShowed', (info) => {
                this.rewardedAdLoaded = false; // Reset state
                if (window.AnalyticsManager) window.AnalyticsManager.logEvent('ad_showed', { type: 'rewarded' });
            });
            
            this.AdMob.addListener('rewardedAdDismissed', (info) => {
                if (window.AnalyticsManager) window.AnalyticsManager.logEvent('ad_dismissed', { type: 'rewarded' });
                this.loadRewardedAd(); // Preload next ad
            });
            
            this.isInitialized = true;
            this.loadRewardedAd(); // Initial load
            
        } catch (e) {
            console.error("AdMob Initialization Failed:", e);
        }
    }

    async loadRewardedAd() {
        if (!this.isInitialized || !this.AdMob) return;
        try {
            await this.AdMob.prepareRewardVideoAd({
                adId: this.adId,
                isTesting: true,
                margin: 0
            });
        } catch (e) {
            console.error("Failed to prepare rewarded ad:", e);
        }
    }

    // Returns a Promise that resolves with TRUE if reward was given, FALSE otherwise.
    async showRewardedAd() {
        if (!this.isInitialized || !this.AdMob) {
            console.warn("[AdManager] AdMob plugin not available or not initialized. Offline/Web mode?");
            return false;
        }
        
        if (!this.rewardedAdLoaded) {
            console.warn("[AdManager] Rewarded ad not loaded yet.");
            // Try loading again for next time
            this.loadRewardedAd();
            return false;
        }

        return new Promise((resolve) => {
            let rewardGranted = false;
            
            const rewardListener = this.AdMob.addListener('rewardedVideoAdReward', (rewardItem) => {
                rewardGranted = true;
                if (window.AnalyticsManager) window.AnalyticsManager.logEvent('ad_rewarded', { type: 'rewarded', amount: rewardItem.amount });
            });
            
            const dismissListener = this.AdMob.addListener('rewardedAdDismissed', () => {
                // Cleanup one-time listeners
                rewardListener.remove();
                dismissListener.remove();
                
                resolve(rewardGranted);
            });
            
            this.AdMob.showRewardVideoAd().catch(e => {
                console.error("Failed to show rewarded ad:", e);
                rewardListener.remove();
                dismissListener.remove();
                resolve(false);
            });
        });
    }
}

window.AdManager = new AdManager();
