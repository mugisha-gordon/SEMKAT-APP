#!/usr/bin/env node
/**
 * Pre-build verification script for Android Google Sign-In
 * Run this before building APK/AAB to catch configuration issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Android Google Sign-In configuration...\n');

let errors = [];
let warnings = [];

// 1. Check google-services.json exists and has correct package name
const googleServicesPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json');
if (fs.existsSync(googleServicesPath)) {
  console.log('✅ google-services.json exists');
  const content = fs.readFileSync(googleServicesPath, 'utf8');
  const json = JSON.parse(content);
  
  const clients = json.client || [];
  const semkatHubClient = clients.find(c => c.client_info?.android_client_info?.package_name === 'com.semkathub.app');
  
  if (semkatHubClient) {
    console.log('✅ Package "com.semkathub.app" found in google-services.json');
    
    // Check oauth_clients
    const oauthClients = semkatHubClient.oauth_client || [];
    const webClient = oauthClients.find(c => c.client_type === 3);
    const androidClients = oauthClients.filter(c => c.client_type === 1);
    
    if (webClient) {
      console.log(`✅ Web Client ID found: ${webClient.client_id}`);
    } else {
      errors.push('❌ Web Client ID (client_type: 3) not found in google-services.json');
    }
    
    console.log(`✅ ${androidClients.length} Android OAuth client(s) found:`);
    androidClients.forEach((c, i) => {
      console.log(`   ${i + 1}. SHA-1: ${c.android_info?.certificate_hash || 'N/A'}`);
    });
    
    // Check for Play App Signing fingerprint
    const playSigningFingerprints = [
      '668c1e3664f3985724a895b38d19ff470ebb3ba7' // from your updated google-services.json
    ];
    
    const hasPlaySigning = androidClients.some(c => 
      playSigningFingerprints.includes(c.android_info?.certificate_hash)
    );
    
    if (hasPlaySigning) {
      console.log('✅ Google Play App Signing fingerprint detected');
    } else {
      warnings.push('⚠️  Google Play App Signing fingerprint may be missing. If publishing to Play Store, add the SHA-1 from Play Console → Setup → App integrity.');
    }
    
  } else {
    errors.push('❌ Package "com.semkathub.app" not found in google-services.json');
  }
} else {
  errors.push('❌ google-services.json not found at android/app/google-services.json');
}

// 2. Check strings.xml has server_client_id
const stringsPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsPath)) {
  const content = fs.readFileSync(stringsPath, 'utf8');
  if (content.includes('server_client_id')) {
    const match = content.match(/<string name="server_client_id">([^<]+)<\/string>/);
    if (match) {
      console.log(`✅ server_client_id in strings.xml: ${match[1]}`);
    } else {
      warnings.push('⚠️  server_client_id found in strings.xml but could not parse value');
    }
  } else {
    errors.push('❌ server_client_id not found in strings.xml - REQUIRED for Capacitor Google Sign-In');
  }
} else {
  errors.push('❌ strings.xml not found');
}

// 3. Check capacitor.config.json
const capacitorConfigPath = path.join(__dirname, '..', 'capacitor.config.json');
if (fs.existsSync(capacitorConfigPath)) {
  const content = fs.readFileSync(capacitorConfigPath, 'utf8');
  const json = JSON.parse(content);
  
  if (json.plugins?.GoogleSignIn) {
    console.log('✅ GoogleSignIn plugin configured in capacitor.config.json');
    if (json.plugins.GoogleSignIn.clientId) {
      console.log(`✅ clientId: ${json.plugins.GoogleSignIn.clientId}`);
    } else {
      warnings.push('⚠️  GoogleSignIn.clientId not set in capacitor.config.json');
    }
  } else {
    warnings.push('⚠️  GoogleSignIn plugin not configured in capacitor.config.json');
  }
} else {
  warnings.push('⚠️  capacitor.config.json not found');
}

// 4. Check build.gradle has google-services plugin
const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradlePath)) {
  const content = fs.readFileSync(buildGradlePath, 'utf8');
  if (content.includes('com.google.gms.google-services')) {
    console.log('✅ google-services plugin applied in build.gradle');
  } else {
    errors.push('❌ google-services plugin not applied in build.gradle');
  }
  
  // Check for signing config
  if (content.includes('signingConfigs.release')) {
    console.log('✅ Release signing config found in build.gradle');
  } else {
    warnings.push('⚠️  No release signing config found - AAB will use debug signing');
  }
} else {
  errors.push('❌ build.gradle not found');
}

// 5. Check .env file for VITE_GOOGLE_WEB_CLIENT_ID
const envPath = path.join(__dirname, '..', '.env');
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envProdPath = path.join(__dirname, '..', '.env.production');

let envFound = false;
for (const envFile of [envPath, envLocalPath, envProdPath]) {
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    if (content.includes('VITE_GOOGLE_WEB_CLIENT_ID')) {
      const match = content.match(/VITE_GOOGLE_WEB_CLIENT_ID=([^\n]+)/);
      if (match && match[1]) {
        console.log(`✅ VITE_GOOGLE_WEB_CLIENT_ID found in ${path.basename(envFile)}: ${match[1]}`);
        envFound = true;
      }
    }
  }
}

if (!envFound) {
  warnings.push('⚠️  VITE_GOOGLE_WEB_CLIENT_ID not found in .env files. This is needed for runtime initialization.');
}

// Print results
console.log('\n' + '='.repeat(60));
console.log('RESULTS:');
console.log('='.repeat(60));

if (errors.length === 0 && warnings.length === 0) {
  console.log('🎉 All checks passed! You can build the APK/AAB now.');
  console.log('\n📋 Build commands:');
  console.log('   npm run build');
  console.log('   npx cap sync android');
  console.log('   cd android && ./gradlew assembleRelease');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix before building):');
    errors.forEach(e => console.log(`   ${e}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (should fix for production):');
    warnings.forEach(w => console.log(`   ${w}`));
  }
  
  console.log('\n🔧 Fix the above issues, then run this script again.');
  process.exit(1);
}
