# FURIO FC — Developer QA & Testing System Documentation

## Overview
The FURIO FC Developer QA Framework (`QAController.js`, `QAValidator.js`, `QAOverlay.js`) provides an in-game control panel and automated regression testing engine for validating all career, database, transfer, gameplay, and save systems.

## Activation
- **In-Game Toggle**: Press `Shift + D` when `window.QA_MODE = true` or in DEBUG builds.
- **Console Command**: Call `window.QAOverlay.toggle()` or `window.QAController.runFullRegression()`.

## Features
- **One-Click Fresh Career Test**: `QAController.startFreshCareerTest()` resets test state, creates player, generates 3 starting offers, signs contract, builds 90-match fixture schedule and standings, and opens Career Hub.
- **Victor Asimhen Test**: `QAValidator.validateVictorAsimhen()` verifies fictionalized player identity, ST position, single squad membership, profile resolution, and transfer execution.
- **Development Center Stat Sync**: `QAValidator.validateDevelopmentStats()` confirms attribute upgrades in `window.gameState.player.attributes` map directly to `Player.js` runtime physics.
- **Placeholder Scanner**: `QAValidator.scanForPlaceholders()` scans data structures for obsolete strings (`TESTUSER`, `OPP`, `RAKİP KULÜP`, etc.).
- **Storage Isolation**: QA testing uses `furiofc_qa_save` so real player saves (`furiofc_save`) are never overwritten.
