# Firebase Domain Authorization Fix

## Problem
You're seeing the error: `Firebase: Error (auth/unauthorized-domain)`

This error occurs when your current domain (e.g., localhost:8081) is not authorized in Firebase Authentication settings.

## Quick Fix

### Step 1: Go to Firebase Console
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Authentication** in the left sidebar
4. Click on **Settings** tab

### Step 2: Add Your Domain
1. Scroll down to **"Authorized domains"** section
2. Click **"Add domain"**
3. Add your current domain (shown in the error message)
4. Click **Save**

### Step 3: Common Development Domains
For local development, add these domains:
- `localhost:8080`
- `localhost:8081` 
- `localhost:3000`
- `localhost:5173`
- `127.0.0.1:8080`
- `127.0.0.1:8081`

### Step 4: Refresh and Test
1. Refresh your application page
2. Try signing in with Google again

## Why This Happens

Firebase Authentication requires explicit domain authorization for security reasons. This prevents unauthorized websites from using your Firebase project credentials.

## Production Deployment

For production deployments, make sure to add:
- Your production domain (e.g., `yourdomain.com`)
- Any subdomains (e.g., `www.yourdomain.com`)
- Custom domains if using services like Netlify, Vercel, etc.

## Troubleshooting

### Still Getting the Error?
1. **Check spelling**: Ensure the domain matches exactly (including port)
2. **Clear cache**: Clear browser cache and localStorage
3. **Wait a minute**: Sometimes Firebase takes a few minutes to propagate changes
4. **Check environment**: Verify you're editing the correct Firebase project

### Network Issues
If you're on a corporate network, sometimes firewalls can interfere with Firebase authentication. Try:
- Using a different network
- Checking if other Firebase services work
- Contacting your IT department

## Automated Fix

The application now includes automatic detection and helpful instructions for domain issues. Look for the orange error card that provides:
- Step-by-step instructions
- Quick links to Firebase Console
- Copy-paste ready domain names
- One-click refresh option

## Security Notes

- Never add `*` or wildcard domains in production
- Only add domains you trust and control
- Regularly review authorized domains list
- Remove unused development domains when deploying

## Need Help?

If you're still having issues:
1. Check the browser console for additional error details
2. Verify your Firebase project configuration
3. Ensure your API key is correct and not restricted
4. Contact your Firebase administrator

---

**Remember**: This is a one-time setup for each development environment. Once configured, you won't need to do this again unless you change domains.
