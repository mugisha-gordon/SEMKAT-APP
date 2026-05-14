# KML File Display - CORS Setup

KML files (estate tours) are loaded from Firebase Storage. Browsers block cross-origin requests unless CORS is configured. **Run this once** to fix "Access blocked by CORS policy" errors.

## One-time setup

From the project root:

```bash
npm run apply-storage-cors
```

This applies the `cors.json` configuration to your Firebase Storage bucket.

### If the script fails

Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install), then run:

```bash
gcloud auth login
gcloud storage buckets update gs://semkat-hub.firebasestorage.app --cors-file=cors.json
```

Or with gsutil:
```bash
gsutil cors set cors.json gs://semkat-hub.firebasestorage.app
```

### Verify

After applying CORS, open a property with a KML file attached. The estate tour map should load without errors.
