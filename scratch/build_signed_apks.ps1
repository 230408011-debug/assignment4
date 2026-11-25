$ErrorActionPreference = "Stop"

Write-Host "============================================================"
Write-Host "FURIO FC - SIGNED APK BUILD AND VERIFICATION PROCESS"
Write-Host "============================================================"

# 1. Clean build environment
Set-Location android
Write-Host "`nStep 1: Running gradlew clean..."
.\gradlew.bat clean
Set-Location ..

# 2. Sync web assets with Capacitor Android
Write-Host "`nStep 2: Running npx cap sync android..."
npx cap sync android

# 3. Assemble Debug, Release APK and AAB
Set-Location android
Write-Host "`nStep 3: Building Debug, Release APK and AAB..."
.\gradlew.bat assembleDebug assembleRelease bundleRelease
Set-Location ..

# 4. Copy signed artifacts to root
$releaseApkPath = "android\app\build\outputs\apk\release\app-release.apk"
$debugApkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
$releaseAabPath = "android\app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $releaseApkPath) {
    Copy-Item -Path $releaseApkPath -Destination "FURIO_FC_FINAL_RELEASE.apk" -Force
    Write-Host "SUCCESS: Copied $releaseApkPath to FURIO_FC_FINAL_RELEASE.apk"
} else {
    Write-Error "Release APK not found at $releaseApkPath!"
}

if (Test-Path $debugApkPath) {
    Copy-Item -Path $debugApkPath -Destination "FURIO_FC_FINAL_DEBUG.apk" -Force
    Write-Host "SUCCESS: Copied $debugApkPath to FURIO_FC_FINAL_DEBUG.apk"
}

if (Test-Path $releaseAabPath) {
    Copy-Item -Path $releaseAabPath -Destination "FURIO_FC_FINAL_RELEASE.aab" -Force
    Write-Host "SUCCESS: Copied $releaseAabPath to FURIO_FC_FINAL_RELEASE.aab"
}

# 5. Verify using apksigner and aapt2
$apksigner = "C:\Users\CN\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat"
$aapt2 = "C:\Users\CN\AppData\Local\Android\Sdk\build-tools\35.0.0\aapt2.exe"

Write-Host "`n============================================================"
Write-Host "[APKSIGNER VERIFY OUTPUT]"
Write-Host "============================================================"
& $apksigner verify --verbose --print-certs FURIO_FC_FINAL_RELEASE.apk

Write-Host "`n============================================================"
Write-Host "[AAPT2 BADGING METADATA]"
Write-Host "============================================================"
& $aapt2 dump badging FURIO_FC_FINAL_RELEASE.apk | Select-String -Pattern "package:|sdkVersion:|targetSdkVersion:"

# 6. Check ADB status
$adb = "C:\Users\CN\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if (Test-Path $adb) {
    Write-Host "`n============================================================"
    Write-Host "[ADB DEVICES CHECK]"
    Write-Host "============================================================"
    & $adb devices
}
