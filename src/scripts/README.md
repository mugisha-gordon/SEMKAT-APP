# Admin Creation Script

## Prerequisites

1. **Install firebase-admin**:
   ```bash
   npm install firebase-admin
   ```

2. **Get Firebase Service Account Key**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `scripts/service-account-key.json`

## Usage

Run the script:
```bash
node scripts/create-admin.cjs
```

**Note**: The script uses `.cjs` extension because the project uses ES modules.

This will create an admin user with:
- Email: gordonmigisha@gmail.com
- Password: Rukundo@2014
- Full Name: Administrator

## Security Note

⚠️ **Never commit the service account key to version control!**

Add to `.gitignore`:
```
scripts/service-account-key.json
```
