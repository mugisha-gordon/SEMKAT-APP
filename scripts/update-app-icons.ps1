# PowerShell script to update all app icons and splash screens with the SK logo
# Run this after any changes to assets/semkat-logo.png

$ErrorActionPreference = "Stop"
$logoSource = "$PSScriptRoot\..\assets\semkat-logo.png"
$publicDir = "$PSScriptRoot\..\public"

if (-not (Test-Path $logoSource)) {
    Write-Error "Logo not found at $logoSource"
    exit 1
}

Write-Host "Updating app icons with SK logo..."

# 1. Update public/ favicon and web icons
Copy-Item $logoSource "$publicDir\favicon.ico" -Force
Write-Host "  - Updated favicon.ico"

# 2. Update Android splash screens
$splashDirs = @(
    "android\app\src\main\res\drawable",
    "android\app\src\main\res\drawable-land-mdpi",
    "android\app\src\main\res\drawable-land-hdpi",
    "android\app\src\main\res\drawable-land-xhdpi",
    "android\app\src\main\res\drawable-land-xxhdpi",
    "android\app\src\main\res\drawable-land-xxxhdpi",
    "android\app\src\main\res\drawable-port-mdpi",
    "android\app\src\main\res\drawable-port-hdpi",
    "android\app\src\main\res\drawable-port-xhdpi",
    "android\app\src\main\res\drawable-port-xxhdpi",
    "android\app\src\main\res\drawable-port-xxxhdpi"
)

foreach ($dir in $splashDirs) {
    $fullPath = Join-Path "$PSScriptRoot\.." $dir
    if (Test-Path $fullPath) {
        Copy-Item $logoSource "$fullPath\splash.png" -Force
        Write-Host "  - Updated $dir\splash.png"
    }
}

# 3. Update Android app icons
$iconDirs = @(
    "android\app\src\main\res\mipmap-mdpi",
    "android\app\src\main\res\mipmap-hdpi",
    "android\app\src\main\res\mipmap-xhdpi",
    "android\app\src\main\res\mipmap-xxhdpi",
    "android\app\src\main\res\mipmap-xxxhdpi"
)

foreach ($dir in $iconDirs) {
    $fullPath = Join-Path "$PSScriptRoot\.." $dir
    if (Test-Path $fullPath) {
        Copy-Item $logoSource "$fullPath\ic_launcher.png" -Force
        Copy-Item $logoSource "$fullPath\ic_launcher_round.png" -Force
        Copy-Item $logoSource "$fullPath\ic_launcher_foreground.png" -Force
        Write-Host "  - Updated $dir icons"
    }
}

# 4. Update Android icon background color to match app theme
$colorsFile = "$PSScriptRoot\..\android\app\src\main\res\values\ic_launcher_background.xml"
$colorsContent = "<?xml version=`"1.0`" encoding=`"utf-8`"?>`n<resources>`n    <color name=`"ic_launcher_background`">#0c1324</color>`n</resources>`n"
Set-Content -Path $colorsFile -Value $colorsContent -NoNewline
Write-Host "  - Updated icon background color to #0c1324"

Write-Host ""
Write-Host "All app icons updated successfully!"
Write-Host "Rebuild the Android app to see changes:"
Write-Host "  cd android && ./gradlew assembleRelease"
