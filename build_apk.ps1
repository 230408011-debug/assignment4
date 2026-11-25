$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = 'C:\Users\CN\AppData\Local\Android\Sdk'

Write-Host "Syncing Capacitor..."
npx cap sync android

Write-Host "Building APK..."
Set-Location android
.\gradlew.bat assembleDebug
