import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  orderBy,
  Timestamp,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import type {
  UserDocument,
  CreateUserDocument,
  UpdateUserDocument,
  AppRole,
} from './types';
import { deletePropertiesByAgent } from './properties';
import { deleteVideosByUser } from './videos';
import { deleteAgentApplicationsByUser } from './agentApplications';

const COLLECTION_NAME = 'users';

/**
 * Get user document by user ID
 */
export async function getUserDocument(
  userId: string
): Promise<UserDocument | null> {
  const userRef = doc(db, COLLECTION_NAME, userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  return userSnap.data() as UserDocument;
}

export function subscribeToUserDocument(
  userId: string,
  callback: (doc: UserDocument | null) => void
): Unsubscribe {
  const userRef = doc(db, COLLECTION_NAME, userId);
  return onSnapshot(userRef, (snap) => {
    callback(snap.exists() ? (snap.data() as UserDocument) : null);
  });
}

/**
 * Create a new user document (called after Firebase Auth signup)
 */
export async function createUserDocument(
  userId: string,
  email: string,
  fullName?: string
): Promise<void> {
  const userRef = doc(db, COLLECTION_NAME, userId);
  const now = Timestamp.now();
  
  const userData: CreateUserDocument = {
    userId,
    email,
    role: 'user',
    createdAt: now,
    roles: {
      user: {
        createdAt: now,
      },
    },
    profile: {
      fullName: fullName || null,
      phone: null,
      avatarUrl: null,
      pushToken: null,
      pushPlatform: null,
      createdAt: now,
      updatedAt: now,
    },
  };
  
  await setDoc(userRef, userData);
}

/**
 * Update user document
 */
export async function updateUserDocument(
  userId: string,
  updates: UpdateUserDocument
): Promise<void> {
  const userRef = doc(db, COLLECTION_NAME, userId);
  
  // Handle profile updates separately to update updatedAt
  if (updates.profile) {
    const profileUpdates = { ...updates.profile, updatedAt: Timestamp.now() };
    const patch: Record<string, any> = {};

    for (const [k, v] of Object.entries(profileUpdates)) {
      patch[`profile.${k}`] = v;
    }

    const { profile, ...rest } = updates as any;
    await updateDoc(userRef, { ...rest, ...patch } as any);
    return;
  }
  
  await updateDoc(userRef, updates as any);
}

/**
 * Get user's role
 */
export async function getUserRole(userId: string): Promise<AppRole> {
  const user = await getUserDocument(userId);
  return user?.role || 'user';
}

/**
 * Update user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: AppRole,
  approvedBy: string
): Promise<void> {
  const userRef = doc(db, COLLECTION_NAME, userId);
  const user = await getUserDocument(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const now = Timestamp.now();
  const roles = { ...user.roles };
  
  // Add the new role to roles map
  if (newRole === 'admin') {
    roles.admin = {
      approvedBy,
      approvedAt: now,
    };
  } else if (newRole === 'agent') {
    roles.agent = {
      approvedBy,
      approvedAt: now,
    };
  }
  
  // If setting to user, ensure user role exists
  if (newRole === 'user' && !roles.user) {
    roles.user = {
      createdAt: user.createdAt,
    };
  }
  
  await updateDoc(userRef, {
    role: newRole,
    roles,
  });
}

/**
 * Get all users (admin only)
 */
export async function getAllUsers(): Promise<UserDocument[]> {
  const usersRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(usersRef);
  
  return snapshot.docs.map((doc) => ({
    userId: doc.id,
    ...doc.data(),
  })) as UserDocument[];
}

/**
 * Get all agents (admin only)
 */
export async function getAllAgents(limitCount?: number): Promise<UserDocument[]> {
  const usersRef = collection(db, COLLECTION_NAME);
  let q = query(usersRef, where('role', '==', 'agent'));
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    userId: doc.id,
    ...doc.data(),
  })) as UserDocument[];
}

/**
 * Subscribe to agents in real-time.
 * callback receives an array of UserDocument.
 */
export function subscribeToAgents(callback: (agents: UserDocument[]) => void, limitCount?: number) {
  const usersRef = collection(db, COLLECTION_NAME);
  let q = query(usersRef, where('role', '==', 'agent'));
  if (limitCount) q = query(q, limit(limitCount));
  const unsub = onSnapshot(q, (snap) => {
    const agents = snap.docs.map((d) => ({ userId: d.id, ...(d.data() as any) })) as UserDocument[];
    callback(agents);
  });
  return unsub;
}

/**
 * Get approved agents for public display
 */
export async function getApprovedAgents(limitCount?: number): Promise<UserDocument[]> {
  const usersRef = collection(db, COLLECTION_NAME);
  const qByRoles = limitCount
    ? query(usersRef, where('roles.agent', '==', true), limit(limitCount))
    : query(usersRef, where('roles.agent', '==', true));

  const qByRole = limitCount
    ? query(usersRef, where('role', '==', 'agent'), limit(limitCount))
    : query(usersRef, where('role', '==', 'agent'));

  const [snapByRoles, snapByRole] = await Promise.all([getDocs(qByRoles), getDocs(qByRole)]);

  const merged = new Map<string, UserDocument>();
  for (const docSnap of [...snapByRoles.docs, ...snapByRole.docs]) {
    merged.set(docSnap.id, {
      userId: docSnap.id,
      ...(docSnap.data() as any),
    } as UserDocument);
  }

  return Array.from(merged.values());
}

export async function getUserIdByEmail(email: string): Promise<string | null> {
  const usersRef = collection(db, COLLECTION_NAME);
  const q = query(usersRef, where('email', '==', email), limit(1));
  const snap = await getDocs(q);
  const first = snap.docs[0];
  return first ? first.id : null;
}

/**
 * Delete user and all associated data (admin only)
 * This deletes:
 * - User document from Firestore
 * - All properties (if agent)
 * - All videos
 * - Note: Firebase Auth user must be deleted separately using Admin SDK
 */
export async function deleteUserAndData(userId: string): Promise<void> {
  const user = await getUserDocument(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Delete all properties if user is an agent
  if (user.role === 'agent' || user.roles.agent) {
    await deletePropertiesByAgent(userId);
  }

  // Delete all videos
  await deleteVideosByUser(userId);

  // Delete agent applications (if any)
  try {
    await deleteAgentApplicationsByUser(userId);
  } catch {
    // Best-effort cleanup
  }

  // Delete notifications targeted to this user (best-effort)
  try {
    const notifsRef = collection(db, 'notifications');
    const batchSize = 200;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const snap = await getDocs(query(notifsRef, where('userId', '==', userId), limit(batchSize)));
      if (snap.empty) break;
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
  } catch {
    // Best-effort cleanup
  }

  // Delete user document
  const userRef = doc(db, COLLECTION_NAME, userId);
  await deleteDoc(userRef);
}
