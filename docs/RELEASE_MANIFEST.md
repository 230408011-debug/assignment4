# RELEASE MANIFEST

* version: 0.9.0
* build date: 2026-08-13
* platforms: HTML5 Web, Android (Capacitor)
* final source location: `src/`
* web build location: `www/` (synchronized precisely with `src/`)
* Android project location: `android/`
* important dependencies: Phaser 3.x, Capacitor 8.5.0
* build instructions:
    * **Web:** Run local server pointing to root.
    * **Android:** Run `npx cap sync`, then `npx cap open android`. Build via Android Studio.
* final test status: 🟢 PASS (Zero Release Blockers)
* known issues: NONE
* deleted legacy systems: Purged old `FURIO_FC_PUBLISHER_READY_CANDIDATE.zip`. Removed all duplicated test scenes. ZERO active `SeasonEngine` dependencies.
* final ZIP contents: Contains `src`, `assets`, `www`, `android`, `docs`, `index.html`, `README.md`, `VERSION.txt`, `package.json`, `capacitor.config.json` (Excludes `node_modules`, `.git`, `.zip` caches, `.gradle`, and duplicate `src/src`).
