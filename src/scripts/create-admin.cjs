// This script uses CommonJS (require) - .cjs extension is required because package.json has "type": "module"
// Make sure you have service-account-key.json in the scripts directory

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: service-account-key.json not found in scripts directory!');
  console.error('\nTo get the service account key:');
  console.error('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.error('2. Click "Generate new private key"');
  console.error('3. Save the JSON file as scripts/service-account-key.json');
  console.error('\nAlternatively, you can create the admin user manually via Firebase Console.');
  console.error('See ADMIN_SETUP.md for manual setup instructions.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdmin() {
  const email = 'adminsemkat@gmail.com';
  const password = 'admin@semkat';
  const fullName = 'Administrator';

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    console.log('User created:', userRecord.uid);

    // Create user document in Firestore
    const userRef = db.collection('users').doc(userRecord.uid);
    await userRef.set({
      userId: userRecord.uid,
      email: email,
      role: 'admin',
      roles: {
        admin: {
          approvedBy: userRecord.uid,
          approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        user: {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      },
      profile: {
        fullName: fullName,
        phone: null,
        avatarUrl: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('\n✅ Admin user document created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('UID:', userRecord.uid);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin:', error.message);
    if (error.code === 'auth/email-already-exists') {
      console.error('\nThe user already exists. You can:');
      console.error('1. Login with the credentials');
      console.error('2. Or delete the user from Firebase Console and run this script again');
    }
    process.exit(1);
  }
}

createAdmin();
