# FURIO FC — Automated Regression Test Report

## Execution Summary
- **TEST DATE**: 2026-09-13
- **TOTAL CHECKS**: 16 / 16
- **PASS COUNT**: 16 / 16 (100% PASS)
- **STATUS**: ALL SYSTEMS GREEN

---

## Detailed Test Matrix

| # | Category | Description | Status |
|---|---|---|---|
| 1 | DATABASE | 120 Clubs, 12 Leagues, 360 Core Players verified | PASS |
| 2 | PLAYERS | Unique player IDs & valid 3v3 positions (GK/MID/ST) | PASS |
| 3 | CLUBS | Unique club IDs, league references, ratings (OVR 55-92) | PASS |
| 4 | LEAGUES | 12 unique leagues registered | PASS |
| 5 | SQUADS | All 120 clubs contain valid 3v3 core rosters | PASS |
| 6 | CAREER START | Fresh career initialization creates valid state | PASS |
| 7 | OFFERS | 3 lower-strength starting club offers (OVR <= 78) generated | PASS |
| 8 | FIXTURES | Double round-robin schedule generated per league | PASS |
| 9 | STANDINGS | League table generated with all league clubs | PASS |
| 10 | MATCH PREVIEW | Opponent key player & league info resolved from IDs | PASS |
| 11 | MATCH INTRO | Team names & stadium resolved dynamically | PASS |
| 12 | GAMEPLAY | Controlled career player + real teammates vs real opponent squad | PASS |
| 13 | DEVELOPMENT | RPG attribute upgrades map 1-to-1 to Player.js physics | PASS |
| 14 | TRANSFERS | `currentClubId` updates, player ID stable, squad rosters update | PASS |
| 15 | SAVE/LOAD | Complete career state persisted and loaded cleanly | PASS |
| 16 | PLACEHOLDERS | No obsolete placeholders (`TESTUSER`, `OPP`, `RAKİP KULÜP`) | PASS |
