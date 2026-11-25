class PurchaseManager {
    constructor() {
        this.isInitialized = false;
        
        // This is a production abstraction.
        // In a real Play Console setup, this would wrap Google Play Billing via Capacitor plugin.
        this.products = [
            { id: 'furio_ez_small', name: '10.000 EZ', price: '₺19.99', type: 'consumable', reward: 10000 },
            { id: 'furio_ez_medium', name: '50.000 EZ', price: '₺79.99', type: 'consumable', reward: 50000 },
            { id: 'furio_ez_large', name: '120.000 EZ', price: '₺149.99', type: 'consumable', reward: 120000 }
        ];
    }

    initialize() {
        console.log("[PurchaseManager] Initialized.");
        this.isInitialized = true;
    }

    getProducts() {
        return this.products;
    }

    async purchase(productId) {
        if (window.PRODUCTION_MODE) {
            console.error("[PurchaseManager] SECURE IAP is NOT IMPLEMENTED. Real purchases are disabled in production to prevent mock exploits.");
            return { success: false, reason: "NOT_IMPLEMENTED" };
        }

        console.log(`[PurchaseManager] Mock Purchase Initiated for ${productId}`);
        
        return new Promise((resolve) => {
            // Fake delay for UI mock in development
            setTimeout(() => {
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    resolve({ success: true, reward: product.reward });
                } else {
                    resolve({ success: false, reason: "PRODUCT_NOT_FOUND" });
                }
            }, 1500);
        });
    }
}

window.PurchaseManager = new PurchaseManager();


class AnalyticsManager {
    constructor() {
        this.isInitialized = false;
    }

    initialize() {
        console.log("[AnalyticsManager] Initialized.");
        this.isInitialized = true;
        
        // Global Error Tracking
        window.onerror = (message, source, lineno, colno, error) => {
            this.logEvent('gameplay_error', {
                message: message,
                source: source,
                line: lineno
            });
        };
    }

    logEvent(eventName, params = {}) {
        if (!this.isInitialized) return;
        
        // In production, this would route to Firebase Analytics or similar
        // For now, we securely log it (except in production where debug is suppressed)
        if (!window.PRODUCTION_MODE) {
            console.log(`[Analytics] Event: ${eventName}`, params);
        }
        
        // MOCK: Bridge to native analytics if plugin existed
        // if (window.Capacitor && window.Capacitor.Plugins.FirebaseAnalytics) ...
    }
}

window.AnalyticsManager = new AnalyticsManager();
