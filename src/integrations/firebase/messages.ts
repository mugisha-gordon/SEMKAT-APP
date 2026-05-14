import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import { createNotification } from './notifications';

export interface MessageDocument {
  id: string;
  conversationId: string; // Combination of user IDs sorted alphabetically
  senderId: string; // Firebase Auth UID
  receiverId: string; // Firebase Auth UID
  content: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface ConversationDocument {
  id: string;
  participantIds: string[]; // [userId, agentId] sorted
  lastMessage: string;
  lastMessageAt: Timestamp;
  lastMessageSenderId: string;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateMessageDocument {
  senderId: string;
  receiverId: string;
  content: string;
}

const MESSAGES_COLLECTION = 'messages';
const CONVERSATIONS_COLLECTION = 'conversations';

/**
 * Generate conversation ID from two user IDs (sorted)
 */
function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

/**
 * Get or create a conversation
 */
async function getOrCreateConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  const conversationId = getConversationId(userId1, userId2);
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);

  if (conversationSnap.exists()) {
    // Backfill legacy conversations that might be missing required fields.
    const data = conversationSnap.data() as Partial<ConversationDocument> | undefined;
    const participants = [userId1, userId2].sort();
    const needsParticipants =
      !data?.participantIds || !Array.isArray(data.participantIds) || data.participantIds.length !== 2;
    const needsUnread =
      !data?.unreadCount ||
      typeof data.unreadCount !== 'object' ||
      data.unreadCount == null ||
      data.unreadCount[userId1] == null ||
      data.unreadCount[userId2] == null;

    if (needsParticipants || needsUnread) {
      // Use merge so we don't overwrite existing conversation metadata.
      await setDoc(
        conversationRef,
        {
          participantIds: participants,
          unreadCount: {
            ...(data?.unreadCount || {}),
            [userId1]: (data?.unreadCount as any)?.[userId1] ?? 0,
            [userId2]: (data?.unreadCount as any)?.[userId2] ?? 0,
          },
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    }
    return conversationId;
  }

  // Create new conversation
  await setDoc(conversationRef, {
    id: conversationId,
    participantIds: [userId1, userId2].sort(),
    lastMessage: '',
    lastMessageAt: Timestamp.now(),
    lastMessageSenderId: userId1,
    unreadCount: {
      [userId1]: 0,
      [userId2]: 0,
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return conversationId;
}

/**
 * Send a message
 */
export async function sendMessage(
  data: CreateMessageDocument
): Promise<string> {
  const conversationId = await getOrCreateConversation(data.senderId, data.receiverId);

  // Create message
  const messagesRef = collection(db, MESSAGES_COLLECTION);
  const messageData = {
    conversationId,
    senderId: data.senderId,
    receiverId: data.receiverId,
    content: data.content,
    read: false,
    createdAt: Timestamp.now(),
  };

  const docRef = await addDoc(messagesRef, messageData);

  // Update conversation
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);
  const conversation = (conversationSnap.data() as ConversationDocument) || ({} as ConversationDocument);
  const unread = (conversation as any)?.unreadCount || {};

  await updateDoc(conversationRef, {
    lastMessage: data.content,
    lastMessageAt: Timestamp.now(),
    lastMessageSenderId: data.senderId,
    unreadCount: {
      ...unread,
      [data.receiverId]: ((unread as any)[data.receiverId] || 0) + 1,
    },
    updatedAt: Timestamp.now(),
  });

  // Create a notification for the receiver (do not fail sending if notification fails)
  try {
    await createNotification({
      title: 'New message',
      description: data.content.length > 80 ? `${data.content.slice(0, 77)}...` : data.content,
      type: 'info',
      audience: 'user',
      userId: data.receiverId,
      actorId: data.senderId,
      targetPath: `/messages?user=${encodeURIComponent(data.senderId)}`,
    });
  } catch {
    // ignore notification failures
  }

  return docRef.id;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  userId1: string,
  userId2: string,
  limitCount: number = 50
): Promise<MessageDocument[]> {
  const conversationId = getConversationId(userId1, userId2);
  const messagesRef = collection(db, MESSAGES_COLLECTION);

  // Firestore security rules require queries to be scoped to the current user.
  // Fetch both directions and merge client-side.
  const [sentSnap, receivedSnap] = await Promise.all([
    getDocs(query(messagesRef, where('conversationId', '==', conversationId), where('senderId', '==', userId1))),
    getDocs(query(messagesRef, where('conversationId', '==', conversationId), where('receiverId', '==', userId1))),
  ]);

  const byId = new Map<string, MessageDocument>();
  for (const snap of [sentSnap, receivedSnap]) {
    snap.docs.forEach((d) => {
      byId.set(d.id, { id: d.id, ...(d.data() as any) } as MessageDocument);
    });
  }

  const items = Array.from(byId.values()).sort((a: any, b: any) => {
    const at = a?.createdAt?.toMillis?.() || 0;
    const bt = b?.createdAt?.toMillis?.() || 0;
    return at - bt;
  });

  if (items.length > limitCount) {
    return items.slice(items.length - limitCount);
  }

  return items;
}

/**
 * Get conversations for a user
 */
export async function getConversations(userId: string): Promise<ConversationDocument[]> {
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(
    conversationsRef,
    where('participantIds', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ConversationDocument[];
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  userId1: string,
  userId2: string,
  currentUserId: string
): Promise<void> {
  const conversationId = getConversationId(userId1, userId2);
  const messagesRef = collection(db, MESSAGES_COLLECTION);
  const q = query(
    messagesRef,
    where('conversationId', '==', conversationId),
    where('receiverId', '==', currentUserId),
    where('read', '==', false)
  );

  const snapshot = await getDocs(q);

  // If there are no unread messages, only update the conversation if its unreadCount is > 0.
  // This avoids a write->snapshot->write loop.
  if (snapshot.empty) {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    if (!conversationSnap.exists()) return;
    const conversation = conversationSnap.data() as ConversationDocument;
    const currentUnread = conversation?.unreadCount?.[currentUserId] || 0;
    if (currentUnread <= 0) return;
    await updateDoc(conversationRef, {
      unreadCount: {
        ...conversation.unreadCount,
        [currentUserId]: 0,
      },
    });
    return;
  }

  const updatePromises = snapshot.docs.map((doc) => updateDoc(doc.ref, { read: true }));
  await Promise.all(updatePromises);

  // Update conversation unread count (only after we actually marked messages as read)
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
  const conversationSnap = await getDoc(conversationRef);
  if (conversationSnap.exists()) {
    const conversation = conversationSnap.data() as ConversationDocument;
    const currentUnread = conversation?.unreadCount?.[currentUserId] || 0;
    if (currentUnread > 0) {
      await updateDoc(conversationRef, {
        unreadCount: {
          ...conversation.unreadCount,
          [currentUserId]: 0,
        },
      });
    }
  }
}

/**
 * Subscribe to messages in real-time
 */
export function subscribeToMessages(
  userId1: string,
  userId2: string,
  callback: (messages: MessageDocument[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const conversationId = getConversationId(userId1, userId2);
  const messagesRef = collection(db, MESSAGES_COLLECTION);

  // Firestore rules require scoping to current user, so subscribe to both directions.
  let sentItems: MessageDocument[] = [];
  let receivedItems: MessageDocument[] = [];

  const emit = () => {
    const byId = new Map<string, MessageDocument>();
    for (const item of [...sentItems, ...receivedItems]) {
      byId.set(item.id, item);
    }
    const merged = Array.from(byId.values()).sort((a: any, b: any) => {
      const at = a?.createdAt?.toMillis?.() || 0;
      const bt = b?.createdAt?.toMillis?.() || 0;
      return at - bt;
    });
    callback(merged);
  };

  const unsubSent = onSnapshot(
    query(messagesRef, where('conversationId', '==', conversationId), where('senderId', '==', userId1)),
    (snapshot) => {
      sentItems = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MessageDocument[];
      emit();
    },
    (error) => {
      onError?.(error);
    }
  );

  const unsubReceived = onSnapshot(
    query(messagesRef, where('conversationId', '==', conversationId), where('receiverId', '==', userId1)),
    (snapshot) => {
      receivedItems = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MessageDocument[];
      emit();
    },
    (error) => {
      onError?.(error);
    }
  );

  return () => {
    unsubSent();
    unsubReceived();
  };
}

/**
 * Subscribe to conversations in real-time
 */
export function subscribeToConversations(
  userId: string,
  callback: (conversations: ConversationDocument[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const conversationsRef = collection(db, CONVERSATIONS_COLLECTION);
  const q = query(
    conversationsRef,
    where('participantIds', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
    const conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ConversationDocument[];

    conversations.sort((a, b) => {
      const at = (a.lastMessageAt as any)?.toMillis?.() ?? 0;
      const bt = (b.lastMessageAt as any)?.toMillis?.() ?? 0;
      return bt - at;
    });

    callback(conversations);
    },
    (error) => {
      onError?.(error);
    }
  );
}
