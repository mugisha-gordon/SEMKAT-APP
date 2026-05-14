import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';

export type NotificationType = 'info' | 'success' | 'warning';

export interface NotificationDocument {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  readAt?: Timestamp;

  // Actor metadata (who triggered the notification)
  actorId?: string;

  // Targeting
  audience: 'all' | 'user';
  userId?: string;
  targetPath?: string;
  dismissedBy?: string[];
}

const COLLECTION_NAME = 'notifications';

export async function createNotification(input: {
  title: string;
  description: string;
  type: NotificationType;
  audience: 'all' | 'user';
  userId?: string;
  actorId?: string;
  targetPath?: string;
}): Promise<string> {
  const ref = collection(db, COLLECTION_NAME);
  const payload: any = {
    title: input.title,
    description: input.description,
    type: input.type,
    audience: input.audience,
    userId: input.audience === 'user' ? input.userId : undefined,
    actorId: input.actorId,
    targetPath: input.targetPath,
    dismissedBy: [],
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
  if (payload.userId === undefined) delete payload.userId;
  if (payload.actorId === undefined) delete payload.actorId;
  if (payload.targetPath === undefined) delete payload.targetPath;
  const r = await addDoc(ref, payload);
  return r.id;
}

export async function getNotificationsForUser(userId: string, options?: { limit?: number }): Promise<NotificationDocument[]> {
  const ref = collection(db, COLLECTION_NAME);
  const max = options?.limit ?? 50;

  const [userSnap, allSnap] = await Promise.all([
    getDocs(query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(max))),
    getDocs(query(ref, where('audience', '==', 'all'), orderBy('createdAt', 'desc'), limit(max))),
  ]);

  const byId = new Map<string, NotificationDocument>();

  for (const snap of [userSnap, allSnap]) {
    snap.docs.forEach((d) => {
      byId.set(d.id, { id: d.id, ...(d.data() as Omit<NotificationDocument, 'id'>) });
    });
  }

  return Array.from(byId.values())
    .filter((n) => !(n.dismissedBy || []).includes(userId))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}

export async function getNotification(notificationId: string): Promise<NotificationDocument | null> {
  const ref = doc(db, COLLECTION_NAME, notificationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<NotificationDocument, 'id'>) };
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, notificationId);
  await updateDoc(ref, {
    readAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function markAllNotificationsAsRead(notifications: NotificationDocument[]): Promise<void> {
  const unread = notifications.filter((n) => !n.readAt);
  await Promise.all(unread.map((n) => markNotificationAsRead(n.id)));
}

export async function dismissNotificationForUser(notificationId: string, userId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, notificationId);
  await updateDoc(ref, {
    dismissedBy: arrayUnion(userId),
    updatedAt: Timestamp.now(),
  });
}

export async function dismissAllNotificationsForUser(
  notifications: NotificationDocument[],
  userId: string
): Promise<void> {
  await Promise.all(notifications.map((n) => dismissNotificationForUser(n.id, userId)));
}

export function subscribeToNotificationsForUser(
  userId: string,
  callback: (notifications: NotificationDocument[]) => void,
  options?: { limit?: number }
): Unsubscribe {
  const ref = collection(db, COLLECTION_NAME);
  const max = options?.limit ?? 50;

  const qUser = query(ref, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(max));
  const qAll = query(ref, where('audience', '==', 'all'), orderBy('createdAt', 'desc'), limit(max));

  let userItems: NotificationDocument[] = [];
  let allItems: NotificationDocument[] = [];

  const emit = () => {
    const byId = new Map<string, NotificationDocument>();
    for (const item of [...userItems, ...allItems]) {
      byId.set(item.id, item);
    }
    callback(
      Array.from(byId.values()).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
        .filter((n) => !(n.dismissedBy || []).includes(userId))
    );
  };

  const unsubUser = onSnapshot(qUser, (snapshot) => {
    userItems = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<NotificationDocument, 'id'>),
    }));
    emit();
  });

  const unsubAll = onSnapshot(qAll, (snapshot) => {
    allItems = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<NotificationDocument, 'id'>),
    }));
    emit();
  });

  return () => {
    unsubUser();
    unsubAll();
  };
}
