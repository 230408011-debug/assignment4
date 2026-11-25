class ProfileManager {
    static init() {
        if (!window.PlayerName) {
            window.PlayerName = window.gameState?.player?.name || "Acemi Oyuncu";
        }
        if (!window.ProfileEmitter) {
            window.ProfileEmitter = new Phaser.Events.EventEmitter();
        }
    }

    static changeName(newName) {
        ProfileManager.init();
        
        // Validation
        if (!newName || typeof newName !== 'string') {
            return { success: false, message: Localization.translate('INVALID_NAME') || "Invalid name" };
        }
        
        // Trim and remove special characters (allow alphanumeric, spaces, and turkish chars)
        let cleanedName = newName.trim().replace(/[^a-zA-Z0-9 ğüşıöçĞÜŞİÖÇ]/g, '');
        
        if (cleanedName.length === 0) {
            return { success: false, message: Localization.translate('INVALID_NAME') || "Invalid name" };
        }
        
        if (cleanedName.length > 12) {
            cleanedName = cleanedName.substring(0, 12);
        }

        // Update Global Variable
        window.PlayerName = cleanedName;
        
        // Update Game State & Save
        if (window.gameState && window.gameState.player) {
            window.gameState.player.name = cleanedName;
            if (window.SaveManager) window.SaveManager.save();
        }
        
        // Emit Event
        window.ProfileEmitter.emit('nameChanged', cleanedName);
        
        return { success: true };
    }

    // Binds a text object so it automatically updates when name changes
    static bindName(textObject, prefix = '', suffix = '') {
        ProfileManager.init();
        
        // Initial set
        textObject.setText(prefix + window.PlayerName + suffix);

        // Event listener
        const callback = (newName) => {
            if (textObject.active) {
                textObject.setText(prefix + newName + suffix);
            } else {
                // Cleanup if the text object is destroyed
                window.ProfileEmitter.off('nameChanged', callback);
            }
        };

        window.ProfileEmitter.on('nameChanged', callback);
        
        return textObject;
    }
}

// Global Exports
window.ProfileManager = ProfileManager;
window.PlayerName = window.PlayerName || "Acemi Oyuncu";
window.ProfileEmitter = window.ProfileEmitter || (typeof Phaser !== 'undefined' ? new Phaser.Events.EventEmitter() : null);
