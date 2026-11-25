# Furio FC

**Version:** 0.9.0 (Closed Beta)  
**Build Date:** 2026-08-13  
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
1. Ensure dependencies are installed via `npm install`.
2. Sync the web assets to the Android project using `npx cap sync`.
3. Open the Android project in Android Studio using `npx cap open android`.
4. Build the APK using Android Studio's standard Build process.

## Controls
**PC Controls:**
- Arrow Keys or WASD to move.
- `Z` / `Space` to Shoot.
- `X` to Pass.
- `C` / `Shift` to Sprint.

**Mobile Controls:**
- On-screen DOM virtual joystick (left side).
- On-screen Pass/Shoot/Sprint action buttons (right side).

## Known Issues
- Very rare edge cases where ball collision near the posts might clip slightly at high framerates.
- Initial scene load may flicker a single black frame depending on browser caching speed.
