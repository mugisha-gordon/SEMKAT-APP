# Check SHA fingerprints for Google Sign-In troubleshooting
# Run this to verify your keystore matches Firebase configuration

$keystorePath = "C:/Users/Dell/Desktop/semkat-release/semkat.jks"
$storePassword = "Rukundo@2014"

Write-Host "Checking SHA fingerprints for Google Sign-In..." -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $keystorePath)) {
    Write-Host "ERROR: Keystore not found at $keystorePath" -ForegroundColor Red
    Write-Host "Please verify the path in android/app/build.gradle"
    exit 1
}

# Get SHA-1 fingerprint
Write-Host "=== SHA-1 Fingerprint (required for Firebase) ===" -ForegroundColor Yellow
try {
    $sha1Output = keytool -list -v -keystore $keystorePath -alias "semkat-key" -storepass $storePassword 2>&1 | Select-String "SHA1"
    if ($sha1Output) {
        $sha1 = ($sha1Output -split ":")[1].Trim().Replace(":", "").ToLower()
        Write-Host "SHA-1: $sha1" -ForegroundColor Green
        Write-Host ""
        Write-Host "This SHA-1 MUST be registered in Firebase Console:" -ForegroundColor Cyan
        Write-Host "1. Go to https://console.firebase.google.com"
        Write-Host "2. Select your project (semkat-hub)"
        Write-Host "3. Click gear icon -> Project settings"
        Write-Host "4. Scroll to 'Your apps' -> Android app"
        Write-Host "5. Click 'Add fingerprint' and enter: $sha1"
        Write-Host ""
        Write-Host "Currently registered fingerprints in google-services.json:" -ForegroundColor Yellow
        Write-Host "  - 9876c4703ca5c8e0a7de9c573601c7452846d4f5"
        Write-Host "  - dfe8fd6baaee1e12ccb297a4ec2dbf09b00b8587"
        Write-Host ""
        
        if ($sha1 -eq "9876c4703ca5c8e0a7de9c573601c7452846d4f5" -or $sha1 -eq "dfe8fd6baaee1e12ccb297a4ec2dbf09b00b8587") {
            Write-Host "✓ SHA-1 matches registered fingerprint!" -ForegroundColor Green
        } else {
            Write-Host "✗ SHA-1 DOES NOT MATCH! This is likely why Google Sign-In fails." -ForegroundColor Red
            Write-Host "Add this fingerprint to Firebase Console immediately." -ForegroundColor Red
        }
    } else {
        Write-Host "Could not extract SHA-1. Trying alternative method..." -ForegroundColor Yellow
        keytool -list -v -keystore $keystorePath -storepass $storePassword | findstr "SHA1"
    }
} catch {
    Write-Host "Error getting SHA-1: $_" -ForegroundColor Red
}

# Get SHA-256 fingerprint  
Write-Host ""
Write-Host "=== SHA-256 Fingerprint (recommended) ===" -ForegroundColor Yellow
try {
    $sha256Output = keytool -list -v -keystore $keystorePath -alias "semkat-key" -storepass $storePassword 2>&1 | Select-String "SHA256"
    if ($sha256Output) {
        $sha256 = ($sha256Output -split ":")[1].Trim().Replace(":", "").ToLower()
        Write-Host "SHA-256: $sha256" -ForegroundColor Green
        Write-Host "Also add this to Firebase Console if not already present." -ForegroundColor Cyan
    } else {
        keytool -list -v -keystore $keystorePath -storepass $storePassword | findstr "SHA256"
    }
} catch {
    Write-Host "Error getting SHA-256: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "If SHA-1 doesn't match:" -ForegroundColor Yellow
Write-Host "1. Add the correct SHA-1 to Firebase Console (see steps above)"
Write-Host "2. Download the new google-services.json"
Write-Host "3. Replace android/app/google-services.json with the new file"
Write-Host "4. Rebuild the AAB: cd android && ./gradlew bundleRelease"
Write-Host ""
Write-Host "For debugging:" -ForegroundColor Yellow
Write-Host "- Check Android Studio Logcat for exact error details"
Write-Host "- The 'user cancelled sign-in flow' error is misleading"
Write-Host "- Real error is often: 'DEVELOPER_ERROR' or SHA mismatch"
