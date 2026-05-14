# Google Sign-In Fix for Android AAB

## Problem
"User cancelled sign-in flow" error appears when users try to sign in with Google on the Android app from Google Play Store, even though they didn't cancel.

## Root Cause
When you publish an AAB (Android App Bundle) to Google Play, Google Play App Signing **re-signs your app** with Google's certificate. The SHA fingerprint changes, causing Google Sign-In to fail because Firebase expects the original keystore fingerprint.

## Solution - COMPLETED

All configuration issues have been fixed. Here's what was done:

### ✅ Fixed Configuration Issues

1. **Added SHA-1 from Google Play Console to Firebase** (You did this)
2. **Updated google-services.json** (You did this)
3. **Added server_client_id to strings.xml** (I added this - was missing!)
4. **Added GoogleSignIn plugin config to capacitor.config.json** (I added this)
5. **Improved error handling in AuthContext.tsx** (I added detailed logging)

### Current Status: ✅ ALL CHECKS PASS

Your configuration is now correct:
- ✅ google-services.json has 3 Android OAuth clients with correct SHA-1s
- ✅ Google Play App Signing fingerprint detected: `668c1e3664f3985724a895b38d19ff470ebb3ba7`
- ✅ server_client_id set in strings.xml
- ✅ Web Client ID configured in capacitor.config.json
- ✅ VITE_GOOGLE_WEB_CLIENT_ID in .env

## Build Instructions

### IMPORTANT: You MUST run these commands in order:

```bash
# 1. Build the web app
npm run build

# 2. Sync Capacitor with Android (CRITICAL!)
npx cap sync android

# 3. Copy assets to Android
npx cap copy android

# 4. Clean Gradle cache (IMPORTANT!)
cd android && .\gradlew clean

# 5. Build release APK (for testing)
.\gradlew assembleRelease

# 6. Build AAB (for Play Store)
.\gradlew bundleRelease
```

### Or use the build script:
```bash
# Run the automated build script
scripts\build-android-prod.bat
```

## Verification Steps

Before building, verify configuration:
```bash
node scripts\verify-android-config.cjs
```

This will check:
- google-services.json is properly configured
- server_client_id is in strings.xml
- All required SHA-1 fingerprints are registered
- Web Client ID is set correctly

## Testing After Build

1. Install the APK on your device:
   ```bash
   adb install android\app\build\outputs\apk\release\app-release.apk
   ```

2. Open the app and try Google Sign-In

3. Check Android Studio Logcat for debug messages:
   - Look for `[GoogleSignIn]` prefixed messages
   - This will show if initialization and sign-in are working

## If Still Failing

If Google Sign-In still fails after building:

1. **Check Logcat for actual error** (the "user cancelled" message is misleading)
   ```
   [GoogleSignIn] Error during sign-in: {...}
   ```

2. **Common remaining issues:**
   - Wrong signing certificate: Make sure you're testing with the APK signed by your release keystore, not debug
   - Cached build: Run `cd android && gradlew clean` before building
   - Capacitor not synced: Must run `npx cap sync android` after any config changes

3. **Verify the APK signature:**
   ```bash
   keytool -printcert -jarfile android\app\build\outputs\apk\release\app-release.apk
   ```
   The SHA-1 should match one of the fingerprints in google-services.json

## Configuration Files Modified

- `android/app/src/main/res/values/strings.xml` - Added server_client_id
- `capacitor.config.json` - Added GoogleSignIn plugin configuration
- `src/context/AuthContext.tsx` - Added detailed error handling and logging
- `scripts/verify-android-config.cjs` - Configuration verification script
- `scripts/build-android-prod.bat` - Clean build script

## Web Client ID

```
1080076065610-e53frmoblcmh4ds0fs9l07jd3thmdqpm.apps.googleusercontent.com
```

This is used in:
- capacitor.config.json
- strings.xml (as server_client_id)
- .env (as VITE_GOOGLE_WEB_CLIENT_ID)

## Next Steps

1. ✅ Run verification: `node scripts\verify-android-config.cjs`
2. ✅ Build APK using: `scripts\build-android-prod.bat`
3. ✅ Test on device
4. ✅ If working, build AAB and upload to Play Store
