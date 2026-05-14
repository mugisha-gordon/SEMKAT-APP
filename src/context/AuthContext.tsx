import { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { GoogleSignIn } from "@capawesome/capacitor-google-sign-in";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/integrations/firebase/client";
import { createUserDocument, getUserDocument } from "@/integrations/firebase/users";
import { getCurrentDomain, isDevelopmentDomain, getFirebaseDomainInstructions } from "@/utils/firebaseDomainHelper";

type Role = "admin" | "agent" | "user";

interface AuthContextValue {
  user: FirebaseUser | null;
  session: FirebaseUser | null; // Firebase doesn't have separate session object, using user
  role: Role | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Hard-coded admin email for application-level admin access
// NOTE: For production, prefer configuring admins via Firestore/ scripts (see ADMIN_SETUP.md)
const HARD_CODED_ADMIN_EMAIL = "adminsemkat@gmail.com";

const parseGoogleSignInError = (error: any, isNative = false): string | null => {
  // Handle if error is a string directly
  const errorStr = typeof error === 'string' ? error.toLowerCase() : '';
  const message = (error?.message || errorStr || "").toLowerCase();
  const code = String(error?.code || error?.errorCode || "");

  // Debug: Log the actual error structure to help diagnose issues
  if (error) {
    console.log(`[GoogleSignIn] ${isNative ? 'Native' : 'Web'} error:`, { 
      error, 
      message: error?.message, 
      code: error?.code, 
      errorCode: error?.errorCode,
      typeof: typeof error 
    });
  }

  // Return null for user cancellations - these should not be shown as errors
  // This includes native plugin errors like "user cancelled sign-in flow"
  // Check for exact match first, then partial matches
  const exactCancellationMessages = [
    "user cancelled sign-in flow",
    "user canceled sign-in flow",
    "sign in cancelled",
    "sign-in cancelled",
    "sign in canceled",
    "sign-in canceled"
  ];
  
  if (exactCancellationMessages.includes(message)) {
    return null; // Exact cancellation match
  }
  
  if (
    message.includes("cancel") ||
    message.includes("canceled") ||
    message.includes("cancelled") ||
    message.includes("user cancelled") ||
    message.includes("user canceled") ||
    message.includes("sign-in flow") || // catches "user cancelled sign-in flow"
    message.includes("popup closed by user") ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request" ||
    code === "signInCanceled" ||
    code === "sign_in_canceled" ||
    code === "SIGN_IN_CANCELLED" ||
    code === "cancelled"
  ) {
    return null; // User cancelled - no error message
  }
  
  // Error 12501 on Android usually means SHA-1 mismatch or missing server_client_id
  // This is a CONFIGURATION error, not a user cancellation
  if (code === "12501" || (isNative && message.includes("12501"))) {
    return "Google Sign-In configuration error (code 12501). Please verify: 1) SHA-1 fingerprint in Firebase Console matches the app signing certificate from Google Play Console, 2) server_client_id is set in android/app/src/main/res/values/strings.xml, 3) google-services.json is up to date.";
  }

  // Handle popup blocked specifically
  if (
    code === "auth/popup-blocked" ||
    message.includes("popup blocked") ||
    message.includes("popup window blocked")
  ) {
    return "Popups are blocked. Please enable popups for this site in your browser settings.";
  }

  if (message.includes("10") || code === "10") {
    return isNative 
      ? "Google Sign-In failed. Please check: 1) SHA-1/SHA-256 fingerprints in Firebase match your signing keystore, 2) Web Client ID is configured, 3) google-services.json is up to date."
      : "Google sign-in configuration error (code 10). Please verify Firebase SHA keys and Web client ID.";
  }

  // Native-specific configuration errors
  if (isNative && (
    message.includes("developer error") ||
    message.includes("developer_error") ||
    code === "developer_error" ||
    message.includes("configuration") && message.includes("invalid")
  )) {
    return "Google Sign-In configuration error. Please verify: 1) SHA-1 fingerprint in Firebase Console matches your app signing certificate, 2) Web Client ID (VITE_GOOGLE_WEB_CLIENT_ID) is set correctly, 3) google-services.json is downloaded from Firebase and placed in android/app/";
  }

  if (message.includes("network")) {
    return "Google sign-in failed due to a network issue. Check your internet and try again.";
  }

  // Handle unauthorized domain error
  if (
    code === "auth/unauthorized-domain" ||
    message.includes("unauthorized domain") ||
    message.includes("domain is not authorized")
  ) {
    const currentDomain = getCurrentDomain();
    const instructions = getFirebaseDomainInstructions(currentDomain);
    
    // Store instructions in localStorage for display in UI
    try {
      localStorage.setItem('firebase_domain_error', JSON.stringify(instructions));
    } catch (e) {
      // ignore storage errors
    }
    
    return instructions.quickFix;
  }

  // Handle browser compatibility issues
  if (
    message.includes("third-party cookies") ||
    message.includes("third party cookies") ||
    message.includes("storage access")
  ) {
    return "Browser settings are blocking third-party cookies. Please enable them for this site and try again.";
  }

  // For native platforms, provide more helpful error messages
  if (isNative) {
    if (message.includes("token") || message.includes("idtoken") || message.includes("credential")) {
      return "Google Sign-In failed to get a valid token. Please check: 1) google-services.json is correctly placed in android/app/, 2) Web Client ID is set in environment variables, 3) Try clearing app data and retry.";
    }
    return "Google Sign-In failed. If this persists, please check: 1) Your internet connection, 2) SHA-1 fingerprint in Firebase Console matches your app, 3) Reinstall the app and try again.";
  }

  return error?.message || "Google sign-in failed. Please try again.";
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nativeGoogleInitPromiseRef = useState<{ current: Promise<void> | null }>({ current: null })[0];

  const isNativePlatform = () => {
    return Capacitor.isNativePlatform();
  };

  const deriveRoleFromUserDoc = (userDoc: any): Role => {
    const docRole = userDoc?.role;
    if (docRole === 'admin' || docRole === 'agent' || docRole === 'user') {
      return docRole;
    }
    return 'user';
  };

  const ensureNativeGoogleInitialized = async (): Promise<void> => {
    if (!isNativePlatform()) return;
    if (nativeGoogleInitPromiseRef.current) {
      await nativeGoogleInitPromiseRef.current;
      return;
    }

    const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
    console.log("[GoogleSignIn] Initializing with Web Client ID:", webClientId ? "Set" : "NOT SET");
    
    if (!webClientId) {
      console.warn("[GoogleSignIn] VITE_GOOGLE_WEB_CLIENT_ID is not set. Native Google Sign-In may fail.");
    }
    
    const initPromise = GoogleSignIn.initialize({
      // `serverClientId` is required on Android for stable idToken retrieval.
      ...(webClientId ? ({ serverClientId: webClientId } as any) : {}),
      ...(webClientId ? ({ clientId: webClientId } as any) : {}),
      scopes: ["email", "profile"],
    } as any).then(() => {
      console.log("[GoogleSignIn] Plugin initialized successfully");
    }).catch((err: any) => {
      console.error("[GoogleSignIn] Plugin initialization failed:", err);
      throw err;
    });

    nativeGoogleInitPromiseRef.current = initPromise;
    await initPromise;
  };

  useEffect(() => {
    // Initialize native Google sign-in once so auth stays in-app on Android/iOS.
    if (isNativePlatform()) {
      ensureNativeGoogleInitialized().catch((err) => {
        console.error("GoogleSignIn initialize failed:", err);
        nativeGoogleInitPromiseRef.current = null;
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);

      if (firebaseUser) {
        try {
          // If this is the hard-coded admin email, ALWAYS treat as admin (highest priority)
          if (firebaseUser.email === HARD_CODED_ADMIN_EMAIL) {
            setRole("admin");
            // Ensure user document exists and has admin role
            try {
              let userDoc = await getUserDocument(firebaseUser.uid);
              if (!userDoc) {
                // Create admin user document if it doesn't exist
                await createUserDocument(
                  firebaseUser.uid,
                  firebaseUser.email || "",
                  firebaseUser.displayName || "Admin"
                );
                // Update to admin role
                const { updateUserRole } = await import("@/integrations/firebase/users");
                await updateUserRole(firebaseUser.uid, "admin", firebaseUser.uid);
              } else if (userDoc.role !== "admin") {
                // Update existing user to admin role
                const { updateUserRole } = await import("@/integrations/firebase/users");
                await updateUserRole(firebaseUser.uid, "admin", firebaseUser.uid);
              }
            } catch (error) {
              console.error("Error ensuring admin role in Firestore:", error);
              // Still set role to admin in app even if Firestore update fails
            }
            setLoading(false);
            return;
          }

          // For non-admin users, check Firestore document
          let userDoc = await getUserDocument(firebaseUser.uid);

          if (!userDoc) {
            // User exists in Auth but not in Firestore - create document
            try {
              await createUserDocument(
                firebaseUser.uid,
                firebaseUser.email || "",
                firebaseUser.displayName || undefined
              );
              // Fetch the newly created document so we have a consistent shape
              userDoc = await getUserDocument(firebaseUser.uid);
            } catch (error) {
              console.error("Error creating user document:", error);
            }
          }

          if (userDoc) {
            const detectedRole = deriveRoleFromUserDoc(userDoc);
            console.log('User role detected:', { 
              email: firebaseUser.email, 
              uid: firebaseUser.uid, 
              role: detectedRole,
              docRole: userDoc.role 
            });
            setRole(detectedRole);
          } else {
            console.log('No user document found, defaulting to user role:', firebaseUser.email);
            setRole("user");
          }
        } catch (error) {
          console.error("Error resolving user role:", error);
          setError("Firebase connection error. Please check your internet connection and try again.");
          // Fallback: check email even on error
          if (firebaseUser.email === HARD_CODED_ADMIN_EMAIL) {
            setRole("admin");
          } else {
            setRole("user");
          }
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: undefined };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Create user document in Firestore
      await createUserDocument(userCredential.user.uid, email, fullName);
      return { error: undefined };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signOut = async () => {
    // Ensure onboarding intro shows on next cold-launch after sign-out
    try {
      localStorage.setItem("semkat_show_onboarding_on_next_open", "true");
    } catch (e) {
      // ignore storage errors
    }
    if (isNativePlatform()) {
      try {
        await GoogleSignIn.signOut();
      } catch (e) {
        // Best-effort native Google session cleanup
      }
    }
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = async () => {
    try {
      if (isNativePlatform()) {
        try {
          console.log("[GoogleSignIn] Starting native sign-in flow...");
          await ensureNativeGoogleInitialized();
          console.log("[GoogleSignIn] Plugin initialized, calling signIn...");
          
          const res: any = await GoogleSignIn.signIn();
          console.log("[GoogleSignIn] Sign-in response:", res);
          
          const idToken =
            res?.idToken ||
            res?.authentication?.idToken ||
            res?.authentication?.id_token ||
            res?.serverAuthCode;
            
          if (!idToken) {
            console.error("[GoogleSignIn] No idToken in response:", res);
            throw new Error(
              "Native Google sign-in returned no token. Verify google-services.json, SHA-1/SHA-256 fingerprints, and server_client_id in strings.xml."
            );
          }

          console.log("[GoogleSignIn] Got idToken, authenticating with Firebase...");
          const credential = GoogleAuthProvider.credential(idToken);
          const userCred = await signInWithCredential(auth, credential);
          console.log("[GoogleSignIn] Firebase auth successful:", userCred.user.email);
          
          const userDoc = await getUserDocument(userCred.user.uid);
          if (!userDoc) {
            await createUserDocument(
              userCred.user.uid,
              userCred.user.email || "",
              userCred.user.displayName || undefined
            );
          }
          return { error: undefined };
        } catch (pluginError: any) {
          // Allow retry if initialize/sign-in failed once.
          nativeGoogleInitPromiseRef.current = null;
          console.error("[GoogleSignIn] Error during sign-in:", pluginError);
          const error = parseGoogleSignInError(pluginError, true); // isNative = true
          return { error: error || undefined };
        }
      }

      // Web/browser flow: popup only
      console.log("[GoogleSignIn] Starting web sign-in flow...");
      try {
        const provider = new GoogleAuthProvider();
        // Add email and profile scopes for proper user info
        provider.addScope('email');
        provider.addScope('profile');

        // Sign in with popup - no redirect fallback
        console.log("[GoogleSignIn] Opening Google sign-in popup...");
        const result = await signInWithPopup(auth, provider);
        console.log("[GoogleSignIn] Web sign-in successful:", result.user.email);
        
        const userDoc = await getUserDocument(result.user.uid);
        if (!userDoc) {
          await createUserDocument(
            result.user.uid,
            result.user.email || "",
            result.user.displayName || undefined
          );
        }
        return { error: undefined };
      } catch (webError: any) {
        console.error("[GoogleSignIn] Web sign-in error:", {
          code: webError?.code,
          message: webError?.message,
          customData: webError?.customData
        });
        const parsedError = parseGoogleSignInError(webError, false);
        return { error: parsedError || undefined };
      }

    } catch (error: any) {
      console.error("[GoogleSignIn] Unexpected error:", error);
      const parsedError = parseGoogleSignInError(error, false);
      return { error: parsedError || undefined };
    }
  };

  const value: AuthContextValue = {
    user,
    session: user, // Firebase uses user object as session
    role,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

