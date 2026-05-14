#!/usr/bin/env node
/**
 * Applies CORS configuration to Firebase Storage bucket.
 * Run: npm run apply-storage-cors
 *
 * Requires Google Cloud SDK (gcloud) or gsutil to be installed.
 * Install: https://cloud.google.com/sdk/docs/install
 *
 * You must be logged in: gcloud auth login
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function readBucketFromEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return null;
    const envRaw = fs.readFileSync(envPath, 'utf8');
    const match = envRaw.match(/^VITE_FIREBASE_STORAGE_BUCKET=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

const BUCKET = readBucketFromEnv() || 'semkat-hub.appspot.com';
const CORS_FILE = path.join(__dirname, '..', 'cors.json');

if (!fs.existsSync(CORS_FILE)) {
  console.error('cors.json not found at', CORS_FILE);
  process.exit(1);
}

const corsPath = path.resolve(CORS_FILE);
console.log('Applying CORS to gs://' + BUCKET + ' from', corsPath);

// Try gcloud storage first (newer), then gsutil
const tryGcloud = () => {
  try {
    execSync(`gcloud storage buckets update gs://${BUCKET} --cors-file="${corsPath}"`, {
      stdio: 'inherit',
    });
    return true;
  } catch (e) {
    return false;
  }
};

const tryGsutil = () => {
  try {
    execSync(`gsutil cors set "${corsPath}" gs://${BUCKET}`, {
      stdio: 'inherit',
    });
    return true;
  } catch (e) {
    return false;
  }
};

if (tryGcloud()) {
  console.log('\nCORS applied successfully. KML files should now load in the app.');
} else if (tryGsutil()) {
  console.log('\nCORS applied successfully. KML files should now load in the app.');
} else {
  console.error(`
Failed to apply CORS. Please run manually:

  gcloud storage buckets update gs://${BUCKET} --cors-file="${corsPath}"

Or with gsutil:

  gsutil cors set "${corsPath}" gs://${BUCKET}

Requirements:
- Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
- Log in: gcloud auth login
- Ensure you have permission to update the Storage bucket
`);
  process.exit(1);
}
