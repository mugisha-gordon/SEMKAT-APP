# Admin Script Setup Instructions

## Quick Setup

The script `create-admin.cjs` is ready to use. Follow these steps:

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the **gear icon** (⚙️) → **Project settings**
4. Go to the **Service Accounts** tab
5. Click **Generate new private key**
6. A JSON file will download
7. Save it as `scripts/service-account-key.json` in your project directory

### 2. Install Dependencies (if needed)

The script requires `firebase-admin`. Install it:
```bash
npm install firebase-admin
```

### 3. Run the Script

```bash
node scripts/create-admin.cjs
```

### 4. Verify

After running the script, you should see:
```
User created: <UID>
✅ Admin user document created successfully!
Email: gordonmigisha@gmail.com
Password: Rukundo@2014
UID: <UID>
```

You can now log in to the application with:
- **Email**: `gordonmigisha@gmail.com`
- **Password**: `Rukundo@2014`

## Security Note

⚠️ **Never commit `service-account-key.json` to version control!**

The file is already added to `.gitignore`, but make sure it's not committed:
```bash
git check-ignore scripts/service-account-key.json  # Should output the file path
```

## Troubleshooting

### Error: "service-account-key.json not found"
- Make sure the file is saved as `scripts/service-account-key.json` (not in a subdirectory)
- Check the file name matches exactly (case-sensitive)

### Error: "require is not defined"
- The script is already using `.cjs` extension which is correct
- If you see this error, make sure you're running: `node scripts/create-admin.cjs` (not `.js`)

### Error: "auth/email-already-exists"
- The user already exists in Firebase Auth
- You can either:
  - Log in with the existing credentials
  - Delete the user from Firebase Console and run the script again

### Error: "Permission denied" or authentication errors
- Make sure the service account key is from the correct Firebase project
- Regenerate the key if needed
- Ensure Firestore and Authentication are enabled in your Firebase project
