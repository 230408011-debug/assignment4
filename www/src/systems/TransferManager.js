class TransferManager {
    constructor() {
        this.gs = window.GameStateManager;
        this.db = window.TeamDatabase;
    }

    processCpuTransfers() {
        if (!this.gs || !this.db) {
            this.gs = window.GameStateManager;
            this.db = window.TeamDatabase;
        }

        const data = this.gs.getCareerData();
        if (!data || !data.transferWindowOpen) return;

        console.log('[TransferManager] Processing CPU Transfers...');
        
        // Very lightweight CPU transfer logic to satisfy requirements without breaking existing architecture.
        // We will randomly select a few clubs to try to improve their weakest position.
        
        let allClubs = this.db.clubs.filter(c => c.id !== data.currentClubId);
        let activeClubs = [];
        
        // Pick 5 random clubs to attempt a transfer
        for(let i = 0; i < 5; i++) {
            let r = Math.floor(Math.random() * allClubs.length);
            activeClubs.push(allClubs[r]);
            allClubs.splice(r, 1);
        }

        activeClubs.forEach(club => {
            let clubStr = this.db.getClubStrength(club.id);
            
            // Find weakest position
            let weakest = 'st';
            let lowest = clubStr.attack;
            
            if (clubStr.defense < lowest) { weakest = 'mid'; lowest = clubStr.defense; }
            if (clubStr.goalkeeping < lowest) { weakest = 'gk'; lowest = clubStr.goalkeeping; }

            // Look for a replacement in other clubs
            let targetClub = this.db.clubs[Math.floor(Math.random() * this.db.clubs.length)];
            if (targetClub.id === club.id || targetClub.id === data.currentClubId) return;

            let targetStr = this.db.getClubStrength(targetClub.id);
            let targetPlayer = targetClub.squad[weakest];
            
            if (!targetPlayer) return;

            // Will the target club sell? Only if buyer has higher or equal reputation/tier
            if (clubStr.transferPower >= targetStr.reputation - 10) {
                // The player must actually be an upgrade
                if (targetPlayer.rating > lowest) {
                    // Do a simple swap for now to maintain 3v3 integrity across all DBs
                    let oldPlayer = club.squad[weakest];
                    
                    // Swap logic
                    club.squad[weakest] = targetPlayer;
                    targetClub.squad[weakest] = oldPlayer;
                    
                    // Log transfer
                    if (!data.transferHistory) data.transferHistory = [];
                    data.transferHistory.push({
                        player: targetPlayer.displayName,
                        from: targetClub.name,
                        to: club.name,
                        week: data.currentWeek
                    });

                    if (window.AnalyticsService) {
                        window.AnalyticsService.track('transfer_completed', {
                            from_club: targetClub.name,
                            to_club: club.name,
                            position: targetPlayer.position || 'ST',
                            player_rating: targetPlayer.rating || targetPlayer.overall || 60
                        });
                    }
                    
                    console.log(`[TransferManager] CPU Transfer: ${targetPlayer.displayName} from ${targetClub.name} to ${club.name}`);
                }
            }
        });
    }
}

window.TransferManager = new TransferManager();
