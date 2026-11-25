const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function packageDelivery() {
    const deliveryDir = path.resolve('delivery');
    fs.mkdirSync(deliveryDir, { recursive: true });

    const artifactDir = 'C:/Users/CN/.gemini/antigravity-ide/brain/df6b8d69-90ad-41c3-a07b-4f10cc20996a';

    const relApkSrc = path.resolve('android/app/build/outputs/apk/release/app-release.apk');
    const dbgApkSrc = path.resolve('android/app/build/outputs/apk/debug/app-debug.apk');

    const relApkDest = path.join(deliveryDir, 'furio-fc-v0.9.4-release.apk');
    const dbgApkDest = path.join(deliveryDir, 'furio-fc-v0.9.4-debug.apk');

    if (fs.existsSync(relApkSrc)) {
        fs.copyFileSync(relApkSrc, relApkDest);
        fs.copyFileSync(relApkSrc, path.join(artifactDir, 'furio-fc-v0.9.4-release.apk'));
        console.log(`Copied Release APK to ${relApkDest} (${(fs.statSync(relApkDest).size / 1024 / 1024).toFixed(2)} MB)`);
    }

    if (fs.existsSync(dbgApkSrc)) {
        fs.copyFileSync(dbgApkSrc, dbgApkDest);
        fs.copyFileSync(dbgApkSrc, path.join(artifactDir, 'furio-fc-v0.9.4-debug.apk'));
        console.log(`Copied Debug APK to ${dbgApkDest} (${(fs.statSync(dbgApkDest).size / 1024 / 1024).toFixed(2)} MB)`);
    }

    fs.copyFileSync('CHANGELOG.md', path.join(deliveryDir, 'CHANGELOG.md'));
    fs.copyFileSync('CHANGELOG.md', path.join(artifactDir, 'CHANGELOG.md'));

    fs.copyFileSync('scratch/TRADEMARK_AUDIT_REPORT.md', path.join(deliveryDir, 'TRADEMARK_AUDIT_REPORT.md'));

    console.log('Creating ZIP archive of source code (excluding node_modules and build caches)...');
    
    // Create staging directory for clean zip
    const stageDir = path.resolve('delivery/source-stage');
    if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
    fs.mkdirSync(stageDir, { recursive: true });

    // Copy core dirs and files
    const itemsToCopy = ['src', 'assets', 'www', 'index.html', 'package.json', 'capacitor.config.json', 'CHANGELOG.md', 'scratch'];
    for (const item of itemsToCopy) {
        if (fs.existsSync(item)) {
            const dest = path.join(stageDir, item);
            fs.cpSync(item, dest, { recursive: true });
        }
    }

    // Copy android project structure without build / .gradle caches
    const androidStage = path.join(stageDir, 'android');
    fs.mkdirSync(androidStage, { recursive: true });
    const androidItems = ['app', 'build.gradle', 'gradle.properties', 'settings.gradle', 'gradlew', 'gradlew.bat', 'gradle', 'variables.gradle', 'capacitor.settings.gradle'];
    for (const item of androidItems) {
        const srcP = path.join('android', item);
        if (fs.existsSync(srcP)) {
            const destP = path.join(androidStage, item);
            if (item === 'app') {
                // Copy app excluding build
                fs.mkdirSync(destP, { recursive: true });
                const appChildren = fs.readdirSync(srcP);
                for (const c of appChildren) {
                    if (c !== 'build' && c !== '.cxx') {
                        fs.cpSync(path.join(srcP, c), path.join(destP, c), { recursive: true });
                    }
                }
            } else {
                fs.cpSync(srcP, destP, { recursive: true });
            }
        }
    }

    const zipDest = path.resolve('delivery/furio-fc-v0.9.4-source.zip');
    if (fs.existsSync(zipDest)) fs.unlinkSync(zipDest);

    // Use PowerShell Compress-Archive
    execSync(`powershell -Command "Compress-Archive -Path '${stageDir}/*' -DestinationPath '${zipDest}' -Force"`);
    console.log(`Successfully created source zip package: ${zipDest} (${(fs.statSync(zipDest).size / 1024 / 1024).toFixed(2)} MB)`);

    // Also copy zip to artifact directory
    fs.copyFileSync(zipDest, path.join(artifactDir, 'furio-fc-v0.9.4-source.zip'));

    // Clean up staging
    fs.rmSync(stageDir, { recursive: true, force: true });

    console.log('All delivery deliverables generated successfully!');
}

packageDelivery();
