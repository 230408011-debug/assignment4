class TeamDatabase {
    constructor() {
        // Will be populated from window.ClubDatabase in init()
        this.clubs = [];
        this.leagues = {};
        this.competitions = {};
    }

    init() {
        if (window.ClubDatabase) {
            this.clubs = window.ClubDatabase.clubs || [];
            this.leagues = window.ClubDatabase.leagues || {};
            this.competitions = window.ClubDatabase.competitions || {};
        }
        this.players = [];
        this.enrichPlayerData();
        console.log(`TeamDatabase initialized with ${this.clubs.length} clubs and ${this.players.length} active players`);
    }

    enrichPlayerData() {
        this.clubs.forEach(club => {
            if (Array.isArray(club.squad)) {
                // Move the full 18-player array to roster
                club.roster = club.squad;
                
                // Pick the best 3 players for the 3v3 format
                const gks = club.roster.filter(p => p.position === 'GK').sort((a,b) => b.overall - a.overall);
                const mids = club.roster.filter(p => p.position === 'MID' || p.position === 'DEF' || p.position === 'CB').sort((a,b) => b.overall - a.overall);
                const atts = club.roster.filter(p => p.position === 'ATT' || p.position === 'ST').sort((a,b) => b.overall - a.overall);
                
                const topGk = gks[0] || club.roster[0];
                const topMid = mids[0] || club.roster[1];
                const topAtt = atts[0] || club.roster[2];

                // Reconstruct the legacy object
                club.squad = {
                    gk: topGk,
                    mid: topMid,
                    st: topAtt
                };
            }

            const positions = ['gk', 'mid', 'st'];
            positions.forEach(pos => {
                if (club.squad && club.squad[pos]) {
                    const p = club.squad[pos];

                    let role = 'Starter';
                    if (pos === 'st') role = 'Star Player';
                    if (pos === 'mid') role = 'Playmaker';
                    if (pos === 'gk') role = 'Goalkeeper';

                    const baseRating = p.overall || p.rating || 60;
                    const ratingScale = (val, offset) => Math.min(99, Math.max(20, val + offset));

                    const playerObj = {
                        id: p.id || `p_${club.id}_${pos}`,
                        displayName: p.displayName || p.name || (p.firstName ? `${p.firstName} ${p.lastName}` : 'Unknown'),
                        clubId: club.id,
                        position: pos.toUpperCase(),
                        role: role,
                        rating: baseRating,
                        overall: baseRating,
                        pace: p.speed || p.pace || ratingScale(baseRating, pos === 'st' ? 5 : (pos === 'gk' ? -30 : 0)),
                        shooting: p.shot || p.shooting || ratingScale(baseRating, pos === 'st' ? 8 : (pos === 'gk' ? -40 : 2)),
                        passing: p.pass || p.passing || ratingScale(baseRating, pos === 'mid' ? 8 : (pos === 'gk' ? -10 : 0)),
                        dribbling: p.dribble || p.dribbling || ratingScale(baseRating, pos === 'mid' ? 5 : (pos === 'st' ? 3 : -20)),
                        defense: p.physical || p.defense || ratingScale(baseRating, pos === 'mid' ? 3 : (pos === 'st' ? -15 : 0)),
                        goalkeeperSkill: pos === 'gk' ? (p.overall || ratingScale(baseRating, 5)) : 15,
                        nationality: p.nationality || club.country || 'Unknown'
                    };
                    
                    // Replace the raw object with the enriched schema
                    club.squad[pos] = playerObj;
                    this.players.push(playerObj);
                }
            });
            // Calculate and set club overall
            if (club.squad && club.squad.st) {
                club.overall = Math.round(((club.squad.gk.overall || 60) + (club.squad.mid.overall || 60) + (club.squad.st.overall || 60)) / 3);
            } else {
                club.overall = 60;
            }
        });
    }

    getClub(clubId) {
        if (!clubId) return this.getFallbackClub();
        const club = this.clubs.find(c => c.id === clubId);
        if (!club) {
            console.warn(`TeamDatabase: Club ${clubId} not found, using fallback`);
            return this.getFallbackClub(clubId);
        }
        return club;
    }

    getTeamName(clubId) {
        return this.getClub(clubId).name;
    }

    getClubStrength(clubId) {
        const club = this.getClub(clubId);
        if (!club) return { overall: 60, attack: 60, defense: 60, midfield: 60, form: 70 };

        // Real-time calculation based on the current enriched squad
        let gk = club.squad.gk || { rating: 60, form: 70 };
        let cb = club.squad.mid || { rating: 60, form: 70 }; // We mapped CB to the mid slot in the previous update
        let st = club.squad.st || { rating: 60, form: 70 };

        let currentAttack = st.rating;
        let currentDefense = cb.rating;
        let currentMidfield = Math.round((cb.rating + st.rating) / 2);
        let currentGK = gk.rating;

        // Squad strength
        let squadStrength = (currentGK + currentDefense + currentAttack) / 3;

        // Blended with club's base overall (60% XI, 40% Base)
        let baseOverall = club.overall || 70;
        let dynamicOverall = Math.round((squadStrength * 0.6) + (baseOverall * 0.4));

        // Form (average of core 3)
        let teamForm = Math.round(((gk.form || 70) + (cb.form || 70) + (st.form || 70)) / 3);

        return {
            overall: dynamicOverall,
            attack: currentAttack,
            defense: currentDefense,
            midfield: currentMidfield,
            goalkeeping: currentGK,
            form: teamForm,
            reputation: club.reputation || 60,
            financialPower: club.financialPower || 60,
            youthDevelopment: club.youthDevelopment || 60,
            transferPower: club.transferPower || 60
        };
    }

    getShortName(clubId) {
        const club = this.getClub(clubId);
        return club.shortName || club.name.substring(0, 3).toUpperCase();
    }

    getAbbreviation(clubId) {
        const club = this.getClub(clubId);
        return club.abbreviation || club.shortName || club.name.substring(0, 3).toUpperCase();
    }

    getPrimaryColor(clubId) {
        return this.getClub(clubId).primaryColor || 0xef4444;
    }

    getSecondaryColor(clubId) {
        return this.getClub(clubId).secondaryColor || 0x000000;
    }

    getFallbackClub(id = 'generic') {
        if (this.clubs && this.clubs.length > 0) {
            const hash = String(id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const idx = hash % this.clubs.length;
            return this.clubs[idx];
        }
        const cleanName = String(id).replace(/_/g, ' ').toUpperCase();
        return {
            id: id,
            name: cleanName,
            shortName: cleanName.substring(0, 3).toUpperCase(),
            country: "Unknown",
            tier: "BASIC",
            overall: 65,
            strength: 65,
            primaryColor: 0x2563eb,
            secondaryColor: 0xffffff,
            squad: {
                gk: { displayName: 'Kaleci', position: 'GK', rating: 65, overall: 65 },
                mid: { displayName: 'Orta Saha', position: 'MID', rating: 65, overall: 65 },
                st: { displayName: 'Forvet', position: 'ST', rating: 65, overall: 65 }
            }
        };
    }

    getImportantPlayer(clubId) {
        const club = this.getClub(clubId);
        if (!club) return { name: 'Yıldız Oyuncu', position: 'ST', overall: 65, role: 'Yıldız Oyuncu' };
        
        let squadList = [];
        if (window.CareerManager && typeof window.CareerManager.getOrInitSquad === 'function') {
            const sq = window.CareerManager.getOrInitSquad(clubId);
            if (sq && Array.isArray(sq.starting) && sq.starting.length > 0) {
                squadList = [...sq.starting, ...(sq.bench || [])];
            }
        }
        
        if (squadList.length === 0 && club.squad) {
            if (Array.isArray(club.squad)) squadList = club.squad;
            else squadList = [club.squad.st, club.squad.mid || club.squad.def, club.squad.gk].filter(Boolean);
        }

        if (squadList.length === 0 && club.roster && club.roster.length > 0) {
            squadList = club.roster;
        }

        if (squadList.length > 0) {
            const sorted = [...squadList].sort((a,b) => (b.overall || b.rating || 0) - (a.overall || a.rating || 0));
            const best = sorted[0];
            return {
                name: this.getPlayerSafeName(best),
                position: best.position || 'ST',
                overall: best.overall || best.rating || club.overall || 65,
                role: 'Yıldız Oyuncu'
            };
        }

        return {
            name: club.name + ' Star',
            position: 'ST',
            overall: club.overall || 65,
            role: 'Yıldız Oyuncu'
        };
    }

    getLeague(leagueId) {
        if (!leagueId) return this.getFallbackLeague();
        const aliasMap = {
            'turkiye': 'turkey',
            'eng': 'england',
            'spa': 'spain',
            'esp': 'spain',
            'ita': 'italy',
            'ger': 'germany',
            'fra': 'france',
            'tur': 'turkey',
            'ned': 'netherlands',
            'net': 'netherlands',
            'por': 'portugal',
            'bel': 'belgium',
            'sco': 'scotland',
            'aut': 'austria',
            'aus': 'austria',
            'swi': 'switzerland',
            'sui': 'switzerland'
        };
        const targetId = aliasMap[leagueId.toLowerCase()] || leagueId;
        if (this.leagues[targetId]) return this.leagues[targetId];
        return this.getFallbackLeague();
    }

    getLeagueFlag(leagueId) {
        const league = this.getLeague(leagueId);
        return league.flag || '🌐';
    }

    getFallbackLeague() {
        return {
            id: 'generic_league',
            name: "Süper Lig",
            shortName: "TUR",
            country: "Türkiye",
            flag: "🇹🇷",
            tier: 3
        };
    }

    getClubsByLeague(leagueId) {
        if (!leagueId) return [];
        const leagueObj = this.getLeague(leagueId);
        const targetId = leagueObj ? leagueObj.id : leagueId;
        return this.clubs.filter(c => (c.league || c.leagueId) === targetId || (c.league || c.leagueId) === leagueId);
    }

    getRandomFirstContractOffers(count = 3) {
        // Sort clubs by overall ascending to find lower-strength clubs
        const sortedByStrength = [...this.clubs].sort((a,b) => (a.overall || 60) - (b.overall || 60));
        
        // Select from bottom 40% (lower strength clubs) or clubs with overall <= 78
        let eligibleClubs = sortedByStrength.filter(c => (c.overall || 60) <= 78);
        if (eligibleClubs.length < count * 2) {
            eligibleClubs = sortedByStrength.slice(0, Math.max(10, Math.floor(sortedByStrength.length * 0.4)));
        }
        
        // Weighting distribution: lower overall gets higher weight
        const minOvr = Math.min(...eligibleClubs.map(c => c.overall || 60));
        const weightedPool = [];
        eligibleClubs.forEach(c => {
            const ovr = c.overall || 60;
            let weight = Math.max(1, 12 - Math.floor((ovr - minOvr) / 2));
            for (let i = 0; i < weight; i++) {
                weightedPool.push(c);
            }
        });
        
        // Shuffle the pool
        const shuffledPool = [...weightedPool].sort(() => 0.5 - Math.random());
        
        // Pick unique clubs, try to get from different leagues
        const selectedClubs = [];
        const usedLeagues = new Set();
        const usedClubIds = new Set();
        
        for (const club of shuffledPool) {
            if (!usedClubIds.has(club.id) && !usedLeagues.has(club.league)) {
                selectedClubs.push(club);
                usedLeagues.add(club.league);
                usedClubIds.add(club.id);
            }
            if (selectedClubs.length >= count) break;
        }
        
        // Fill if we don't have enough (ignoring league uniqueness)
        if (selectedClubs.length < count) {
            for (const club of shuffledPool) {
                if (!usedClubIds.has(club.id)) {
                    selectedClubs.push(club);
                    usedClubIds.add(club.id);
                }
                if (selectedClubs.length >= count) break;
            }
        }
        
        if (window.AnalyticsService) {
            window.AnalyticsService.trackOnce('first_offer_received', {
                offers_count: selectedClubs.length
            }, 'first_offer_received');
        }

        const objectivesPool = [
            'İlk 8',
            'Küme Düşme Hattından Uzak Dur',
            'Kupada Çeyrek Final',
            '5 Gol At',
            'Ort. Puan > 6.8'
        ];

        return selectedClubs.map((club, idx) => {
            const league = this.getLeague(club.league);
            const signingBonus = Math.floor(Math.random() * 31) * 10 + 200; // 200-500 EZ
            const matchBonus = Math.floor(Math.random() * 31) + 20; // 20-50 EZ
            const goalBonus = Math.floor(Math.random() * 16) + 10; // 10-25 EZ
            const assistBonus = Math.floor(Math.random() * 11) + 10; // 10-20 EZ
            const objectiveBonus = Math.floor(Math.random() * 51) * 10 + 200; // 200-700 EZ
            const objective = objectivesPool[idx % objectivesPool.length];
            
            let role = 'Rotasyon';
            if (club.overall <= 60) role = 'İlk 11 Başlangıç';
            else if (club.overall <= 65) role = 'Düzenli Oynayan';
            
            return {
                id: 'offer_' + club.id + '_' + Date.now() + '_' + idx,
                clubId: club.id,
                clubName: club.name,
                shortName: club.shortName,
                leagueId: club.league,
                leagueName: league ? league.name : 'National League',
                country: club.country || (league ? league.country : 'Global'),
                tier: club.tier,
                strength: club.overall || 60,
                prestige: club.reputation || club.prestige || 35,
                role: role,
                contractLength: '1 Sezon',
                seasons: 1,
                signingBonus: signingBonus,
                matchBonus: matchBonus,
                goalBonus: goalBonus,
                assistBonus: assistBonus,
                objectiveBonus: objectiveBonus,
                objective: objective,
                difficulty: club.overall <= 60 ? 'Zor' : 'Orta',
                primaryColor: club.primaryColor,
                secondaryColor: club.secondaryColor
            };
        });
    }

    getPlayerSafeName(playerInfo) {
        if (!playerInfo) return 'Player';
        return playerInfo.displayName || playerInfo.name || playerInfo.safeName || playerInfo.realName || 'Player';
    }
}

window.TeamDatabase = new TeamDatabase();
