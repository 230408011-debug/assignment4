# Furio FC

**Version:** 0.9.4 (Closed Beta)

**Platforms:** Web (HTML5/Canvas), Android (Capacitor)  

## Project Structure
- `src/` - The authoritative source code for all game logic, scenes, and managers.
- `assets/` - Game assets (images, audio).
- `www/` - The synchronized web directory used for Android builds via Capacitor.
- `android/` - The complete Android project workspace.

## How to Run (Web)
1. Ensure you have a local web server (e.g. `python -m http.server 8080` or `npx serve`).
2. Serve the root directory or the `www/` directory.
3. Open `http://localhost:8080/` in your browser.

## How to Build (Android)
1. Install the repository dependencies with `npm ci`.
2. Build and sync the web assets with `npm run build` and `npx cap sync android`.
3. With JDK 21 and Android SDK 36 installed, open `android/` in Android Studio or run `./gradlew assembleDebug` from that directory. On Windows, use `gradlew.bat assembleDebug`.
4. Find the test APK at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Career Match Objectives

The kit screen previews the optional objective and bonus for each fixture. Completed passes, ball recoveries, shots on target and goals rotate with the season schedule. The match HUD tracks progress. A completed objective adds 12 EZ and 20 XP alongside the normal match rewards.

## Tests

Run `npm test` for gameplay checks and career regressions covering save recovery, away results, and objective rewards.

## Controls
**PC Controls:**
- Arrow Keys or WASD to move.
- Hold `Z` or `Space` to charge a shot, then release to shoot. Without the ball, the same keys attempt a tackle.
- `X` to pass.
- `F` to tackle or dash, depending on possession.
- `C` / `Shift` to Sprint.

**Mobile Controls:**
- Floating joystick on the left side of the pitch.
- On-screen Pass/Shoot/Sprint action buttons (right side).

## Known Issues
- Very rare edge cases where ball collision near the posts might clip slightly at high framerates.
- Initial scene load may flicker a single black frame depending on browser caching speed.
