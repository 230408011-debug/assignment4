# FURIO FC 2025 LAST VERSION — Official Production Release Documentation

## Project & Release Identity
- **PROJECT NAME**: FURIO FC
- **RELEASE TITLE**: FURIO FC 2025 LAST VERSION
- **BUILD DATE**: 2026-09-13
- **VERSION NAME**: 1.0.0
- **VERSION CODE**: 2
- **PACKAGE ID / APPLICATION ID**: `com.furio.fc`
- **TARGET SDK**: Android 16 / API 36 (Compliant with Google Play 2026 policy)
- **MIN SDK**: API 24 (Android 7.0+)
- **FRAMEWORK**: Capacitor 8 + Phaser 3

---

## Master Systems Integrated
1. **2026 Football Database**: 12 Leagues, 120 Clubs, 360 Core 3v3 Players with fictionalized identities (e.g. Victor Asimhen, Erling Haalden).
2. **Player + Club Transfer System**: Real-time squad updates and stable `playerId` propagation.
3. **Club Strength & 2026 Realism**: Dynamic AI positioning, passing accuracy, tactical shape, and mistake rate scaling based on opponent club ratings.
4. **Gameplay AI & Physics**: Mapped Speed, Dribbling, Physical, Stamina, Shot, and Pass directly to movement physics, ball control tightness, shielding, and shot error margins.
5. **Career Initialization & Development Center**: Guaranteed 3 starting offers (range <= 78 OVR), double round-robin season scheduling, immediate league table generation, and instant gameplay stat refresh upon attribute upgrades.
6. **Developer QA & Testing Suite**: `QAController`, `QAValidator`, `QAOverlay` (accessible via Shift+D in debug mode or `window.QA_MODE = true`), and automated 16-point regression testing.

---

## Directory Structure
```
FURIO_FC_2025_LAST_VERSION_FINAL.zip
├── src/                    # Game source code (scenes, entities, systems)
├── android/                # Native Android Studio Gradle project
├── assets/                 # Game graphics, sound effects, audio ambience loops
├── database/               # 2026 Football Database (ClubDatabase.js)
├── builds/
│   ├── FURIO_FC_2025_LAST_VERSION_DEBUG.apk     # Debug QA build
│   ├── FURIO_FC_2025_LAST_VERSION_RELEASE.apk   # Unsigned Release APK
│   └── FURIO_FC_2025_LAST_VERSION_RELEASE.aab   # Google Play Release Bundle
├── tests/
│   ├── QA_SYSTEM.md                             # QA Control Panel documentation
│   ├── REGRESSION_REPORT.md                     # Automated regression test pass report
│   └── DATABASE_VALIDATION.md                   # 120-club / 360-player audit log
├── index.html
├── capacitor.config.json
├── package.json
└── README_RELEASE.md
```

---

## Build Instructions

### Prerequisites
- Node.js (v18+)
- Java JDK 17+ / Android Studio JBR (`JAVA_HOME`)
- Android SDK (API 36) (`ANDROID_HOME`)

### Web Assets Sync
```bash
npm install
npx cap sync android
```

### Building Android Artifacts
```bash
cd android
./gradlew assembleDebug      # Builds Debug APK (outputs to app/build/outputs/apk/debug/)
./gradlew assembleRelease    # Builds Release APK (outputs to app/build/outputs/apk/release/)
./gradlew bundleRelease      # Builds Release AAB (outputs to app/build/outputs/bundle/release/)
```
