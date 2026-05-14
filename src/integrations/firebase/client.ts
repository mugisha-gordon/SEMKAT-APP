import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { firebaseConfig } from './config';

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp;
const apps = getApps();
const hasDefaultApp = apps.some((a) => a.name === '[DEFAULT]');
if (hasDefaultApp) {
  app = getApp();
} else {
  // If something else initialized a named app first (e.g. Admin secondary app),
  // we still want a proper default app for the main client SDK usage.
  app = initializeApp(firebaseConfig);
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ensure auth persists across refresh/navigation in the browser
setPersistence(auth, browserLocalPersistence).catch(() => {
  // ignore persistence errors (e.g. in restricted environments)
});

// Optionally connect to local Firebase emulators for development
// For safety, emulators are only used when VITE_FIREBASE_USE_EMULATORS === 'true'
// and we are NOT in a production build.
const useEmulators =
  import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true" && !import.meta.env.PROD;
if (useEmulators) {
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "localhost";

  // Avoid double-connecting during HMR / repeated imports
  const g = globalThis as any;
  if (!g.__SEMKAThubFirebaseEmulatorsConnected) {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8081);
    connectStorageEmulator(storage, host, 9199);
    g.__SEMKAThubFirebaseEmulatorsConnected = true;
  }
}

// Export app instance for advanced usage
export { app };

/**
 * Ensure Firebase Auth is ready and has a valid user token.
 * Useful on native builds where UI/auth timing can race writes.
 */
export async function ensureAuthReady(timeoutMs: number = 8000): Promise<void> {
  if (auth.currentUser) {
    await auth.currentUser.getIdToken();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        unsub();
      } catch {
        // ignore
      }
      reject(new Error("Authentication session is not ready. Please try again."));
    }, timeoutMs);

    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) return;
        clearTimeout(timer);
        try {
          await user.getIdToken();
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          try {
            unsub();
          } catch {
            // ignore
          }
        }
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
