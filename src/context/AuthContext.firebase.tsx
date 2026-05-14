// Firebase Auth Context - Migration version
// This file shows the Firebase implementation. 
// To migrate: Replace src/context/AuthContext.tsx with this file's content.

import { createContext, useContext, useEffect, useState } from "react";
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
import { Capacitor } from "@capacitor/core";
import { auth } from "@/integrations/firebase/client";
import { createUserDocument, getUserDocument, getUserRole } from "@/integrations/firebase/users";

type Role = "admin" | "agent" | "user";

interface AuthContextValue {
  user: FirebaseUser | null;
  session: FirebaseUser | null; // Firebase doesn't have separate session object, using user
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch role from Firestore
  const fetchUserRole = async (userId: string) => {
    try {
      const userRole = await getUserRole(userId);
      setRole(userRole);
    } catch (error) {
      console.error('Error fetching role:', error);
      setRole('user'); // Default role
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Check if user document exists, create if not (for existing users)
        const userDoc = await getUserDocument(firebaseUser.uid);
        if (!userDoc) {
          // User exists in Auth but not in Firestore - create document
          try {
            await createUserDocument(
              firebaseUser.uid,
              firebaseUser.email || '',
              firebaseUser.displayName || undefined
            );
            setRole('user');
          } catch (error) {
            console.error('Error creating user document:', error);
            setRole('user');
          }
        } else {
          await fetchUserRole(firebaseUser.uid);
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
    await firebaseSignOut(auth);
  };

  const signInWithGoogle = async () => {
    try {
      // Use native Capacitor Google Auth on Android/iOS, fallback to popup on web
      const platformIsWeb = Capacitor.getPlatform && Capacitor.getPlatform() === 'web';

      if (!platformIsWeb) {
        // Dynamic import to avoid bundler issues on web
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        // Call native sign-in
        const res: any = await GoogleAuth.signIn();
        const idToken = res?.authentication?.idToken || res?.idToken;
        if (!idToken) throw new Error('No idToken from Google native sign-in');
        const credential = GoogleAuthProvider.credential(idToken);
        const userCred = await signInWithCredential(auth, credential);
        const userDoc = await getUserDocument(userCred.user.uid);
        if (!userDoc) {
          await createUserDocument(
            userCred.user.uid,
            userCred.user.email || '',
            userCred.user.displayName || undefined
          );
        }
      } else {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const userDoc = await getUserDocument(result.user.uid);
        if (!userDoc) {
          await createUserDocument(
            result.user.uid,
            result.user.email || '',
            result.user.displayName || undefined
          );
        }
      }

      return { error: undefined };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const value: AuthContextValue = {
    user,
    session: user, // Firebase uses user object as session
    role,
    loading,
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
