$root = 'c:\Users\CN\.gemini\antigravity-ide\scratch\head-soccer'
Set-Location $root

# 1. Copy fresh build outputs
if (Test-Path 'android\app\build\outputs\apk\release\app-release.apk') {
    Copy-Item 'android\app\build\outputs\apk\release\app-release.apk' 'FURIO_FC_FINAL_RELEASE.apk' -Force
} elseif (Test-Path 'android\app\build\outputs\apk\release\app-release-unsigned.apk') {
    Copy-Item 'android\app\build\outputs\apk\release\app-release-unsigned.apk' 'FURIO_FC_FINAL_RELEASE.apk' -Force
}
Copy-Item 'android\app\build\outputs\bundle\release\app-release.aab' 'FURIO_FC_FINAL_RELEASE.aab' -Force
Copy-Item 'android\app\build\outputs\apk\debug\app-debug.apk' 'FURIO_FC_FINAL_DEBUG.apk' -Force

# 2. Package Staging
$staging = 'C:\Users\CN\AppData\Local\Temp\furio_staging_updated'
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path "$staging\source" -Force | Out-Null
New-Item -ItemType Directory -Path "$staging\android" -Force | Out-Null
New-Item -ItemType Directory -Path "$staging\apk" -Force | Out-Null
New-Item -ItemType Directory -Path "$staging\aab" -Force | Out-Null
New-Item -ItemType Directory -Path "$staging\docs" -Force | Out-Null

Copy-Item 'src' "$staging\source\src" -Recurse -Force
Copy-Item 'assets' "$staging\source\assets" -Recurse -Force
Copy-Item 'index.html' "$staging\source\index.html" -Force
if (Test-Path 'style.css') { Copy-Item 'style.css' "$staging\source\style.css" -Force }
Copy-Item 'package.json' "$staging\source\package.json" -Force
Copy-Item 'capacitor.config.json' "$staging\source\capacitor.config.json" -Force
Copy-Item 'VERSION.txt' "$staging\source\VERSION.txt" -Force

Get-ChildItem 'android' | Where-Object { $_.Name -ne 'build' -and $_.Name -ne '.gradle' } | Copy-Item -Destination "$staging\android" -Recurse -Force

Copy-Item 'FURIO_FC_FINAL_RELEASE.apk' "$staging\apk\FURIO_FC_FINAL_RELEASE.apk" -Force
Copy-Item 'FURIO_FC_FINAL_DEBUG.apk' "$staging\apk\FURIO_FC_FINAL_DEBUG.apk" -Force
Copy-Item 'FURIO_FC_FINAL_RELEASE.aab' "$staging\aab\FURIO_FC_FINAL_RELEASE.aab" -Force
Copy-Item 'VERSION.txt' "$staging\docs\VERSION.txt" -Force

if (Test-Path 'FURIO_FC_FINAL_SOURCE.zip') { Remove-Item 'FURIO_FC_FINAL_SOURCE.zip' -Force }
if (Test-Path 'FURIO_FC_FINAL_PACKAGE.zip') { Remove-Item 'FURIO_FC_FINAL_PACKAGE.zip' -Force }

Compress-Archive -Path "$staging\source\*" -DestinationPath "$root\FURIO_FC_FINAL_SOURCE.zip" -Force
Compress-Archive -Path "$staging\*" -DestinationPath "$root\FURIO_FC_FINAL_PACKAGE.zip" -Force

Write-Host "RE-PACKAGING SUCCESS"
