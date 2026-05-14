@echo off
REM Clean build script for Android production release
REM This ensures all changes are properly synced before building

echo ============================================
echo SEMKAT Android Production Build
echo ============================================
echo.

REM Step 1: Clean previous builds
echo [1/6] Cleaning previous builds...
call rmdir /s /q android\app\build 2>nul
call rmdir /s /q dist 2>nul
call rmdir /s /q build 2>nul

REM Step 2: Build web app
echo.
echo [2/6] Building web app...
call npm run build
if errorlevel 1 (
    echo ERROR: Web build failed!
    exit /b 1
)

REM Step 3: Clean Capacitor android folder and sync
echo.
echo [3/6] Syncing Capacitor with Android...
call npx cap sync android
if errorlevel 1 (
    echo ERROR: Capacitor sync failed!
    exit /b 1
)

REM Step 4: Copy web assets to Android
echo.
echo [4/6] Copying web assets...
call npx cap copy android
if errorlevel 1 (
    echo ERROR: Capacitor copy failed!
    exit /b 1
)

REM Step 5: Clean Gradle cache
echo.
echo [5/6] Cleaning Gradle cache...
cd android
call .\gradlew clean
cd ..

REM Step 6: Build release APK
echo.
echo [6/6] Building release APK...
cd android
call .\gradlew assembleRelease --refresh-dependencies
if errorlevel 1 (
    echo ERROR: APK build failed!
    cd ..
    exit /b 1
)
cd ..

echo.
echo ============================================
echo BUILD COMPLETE!
echo ============================================
echo APK location: android\app\build\outputs\apk\release\app-release.apk
echo.
echo Next steps:
echo 1. Install the APK on your device
echo 2. Test Google Sign-In
echo 3. If it works, build AAB with: cd android ^&^& .\gradlew bundleRelease
echo.
