import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  limit as limitFn,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./client";
import type { AgentApplicationDocument, CreateAgentApplicationDocument, UpdateAgentApplicationDocument } from "./types";
import { createNotification } from "./notifications";
import { getUserIdByEmail } from "./users";

const COLLECTION_NAME = "agentApplications";
const ADMIN_EMAIL = "adminsemkat@gmail.com";

// Create / apply (alias for compatibility)
export async function applyForAgent(userId: string, data: CreateAgentApplicationDocument): Promise<string> {
  const ref = collection(db, COLLECTION_NAME);
  const payload = {
    ...data,
    userId,
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    notes: null,
    createdAt: serverTimestamp() as unknown as Timestamp,
  };
  const r = await addDoc(ref, payload);

  try {
    const adminId = await getUserIdByEmail(ADMIN_EMAIL);
    if (adminId) {
      await createNotification({
        audience: 'user',
        userId: adminId,
        type: 'info',
        title: 'New agent application',
        description: `${data.fullName} submitted an agent application.`,
        targetPath: '/admin',
      });
    }
  } catch {
    // ignore notification failures
  }

  return r.id;
}
export const createAgentApplication = applyForAgent;

// Query applications (optional filters)
export async function getAgentApplications(userId?: string, status?: "pending" | "approved" | "rejected", limit?: number): Promise<AgentApplicationDocument[]> {
  const ref = collection(db, COLLECTION_NAME);
  // Avoid composite indexes by not mixing where(...) with orderBy(...)
  let q: any;
  if (userId) {
    q = query(ref, where("userId", "==", userId));
  } else if (status) {
    q = query(ref, where("status", "==", status));
  } else {
    q = query(ref, orderBy("createdAt", "desc"));
  }
  if (limit) q = query(q, limitFn(limit));
  const snap = await getDocs(q);
  let items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AgentApplicationDocument[];
  if (userId && status) {
    items = items.filter((i) => i.status === status);
  }
  items.sort((a: any, b: any) => {
    const at = a?.createdAt?.toMillis?.() || 0;
    const bt = b?.createdAt?.toMillis?.() || 0;
    return bt - at;
  });
  return items;
}

export async function getAgentApplication(applicationId: string): Promise<AgentApplicationDocument | null> {
  const ref = doc(db, COLLECTION_NAME, applicationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as AgentApplicationDocument;
}

export async function approveAgentApplication(applicationId: string, adminId: string, notes?: string | null): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, applicationId);
  await updateDoc(ref, { status: "approved", reviewedBy: adminId, reviewedAt: serverTimestamp(), notes: notes || null });
}

export async function rejectAgentApplication(applicationId: string, adminId: string, notes?: string | null): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, applicationId);
  await updateDoc(ref, { status: "rejected", reviewedBy: adminId, reviewedAt: serverTimestamp(), notes: notes || null });
}

export function subscribeToAgentApplications(callback: (apps: AgentApplicationDocument[]) => void, status?: "pending" | "approved" | "rejected", limit?: number) {
  const ref = collection(db, COLLECTION_NAME);
  // Avoid composite indexes by not mixing where(...) with orderBy(...)
  let q: any = status ? query(ref, where("status", "==", status)) : query(ref, orderBy("createdAt", "desc"));
  if (limit) q = query(q, limitFn(limit));
  const unsub = onSnapshot(q, (snap) => {
    const apps = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as AgentApplicationDocument[];
    apps.sort((a: any, b: any) => {
      const at = a?.createdAt?.toMillis?.() || 0;
      const bt = b?.createdAt?.toMillis?.() || 0;
      return bt - at;
    });
    callback(apps);
  });
  return unsub;
}

export async function deleteAgentApplicationsByUser(userId: string): Promise<void> {
  const ref = collection(db, COLLECTION_NAME);
  const batchSize = 200;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await getDocs(query(ref, where('userId', '==', userId), limitFn(batchSize)));
    if (snap.empty) break;
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
}

