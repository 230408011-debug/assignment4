$root = 'c:\Users\CN\.gemini\antigravity-ide\scratch\head-soccer'
Set-Location $root

$files = @(
    'FURIO_FC_FINAL_SOURCE.zip',
    'FURIO_FC_FINAL_RELEASE.apk',
    'FURIO_FC_FINAL_RELEASE.aab',
    'FURIO_FC_FINAL_PACKAGE.zip',
    'FURIO_FC_FINAL_DEBUG.apk'
)

foreach ($f in $files) {
    if (Test-Path $f) {
        $item = Get-Item $f
        $hash = (Get-FileHash $f -Algorithm SHA256).Hash
        Write-Host "FILE: $($item.FullName)"
        Write-Host "SIZE: $($item.Length) bytes ($([math]::Round($item.Length/1MB, 2)) MB)"
        Write-Host "CREATED: $($item.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss'))"
        Write-Host "SHA256: $hash"
        Write-Host "--------------------------------------------------"
    } else {
        Write-Host "MISSING: $f"
    }
}
