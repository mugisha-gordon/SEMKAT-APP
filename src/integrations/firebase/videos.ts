import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
  increment,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, ensureAuthReady } from './client';

 function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
   const out: Record<string, any> = {};
   for (const [k, v] of Object.entries(obj)) {
     if (v !== undefined) out[k] = v;
   }
   return out as Partial<T>;
 }

export interface VideoDocument {
  id: string;
  userId: string; // Firebase Auth UID (agent or user)
  title: string;
  location: string;
  videoUrl: string;
  coverUrl?: string;
  description?: string;
  likes: number;
  comments: number;
  likedBy: string[]; // Array of user IDs who liked
  role: 'agent' | 'user';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateVideoDocument {
  userId: string;
  title: string;
  location: string;
  videoUrl: string;
  coverUrl?: string;
  description?: string;
  role: 'agent' | 'user';
}

export interface VideoCommentDocument {
  id: string;
  videoId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
}

const COLLECTION_NAME = 'videos';

/**
 * Get all videos (public feed)
 */
export async function getVideos(filters?: {
  userId?: string;
  role?: 'agent' | 'user';
  limit?: number;
}): Promise<VideoDocument[]> {
  const videosRef = collection(db, COLLECTION_NAME);
  let q = query(videosRef, orderBy('createdAt', 'desc'));

  if (filters?.userId) {
    q = query(q, where('userId', '==', filters.userId));
  }

  if (filters?.role) {
    q = query(q, where('role', '==', filters.role));
  }

  if (filters?.limit) {
    q = query(q, limit(filters.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as VideoDocument[];
}

/**
 * Add a comment to a video (stored under videos/{videoId}/comments)
 */
export async function addVideoComment(videoId: string, userId: string, content: string): Promise<string> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Comment cannot be empty');
  }

  const videoRef = doc(db, COLLECTION_NAME, videoId);
  const videoSnap = await getDoc(videoRef);
  const videoOwnerId = videoSnap.exists() ? (videoSnap.data() as any)?.userId : null;
  const videoTitle = videoSnap.exists() ? (videoSnap.data() as any)?.title : '';

  const commentsRef = collection(db, COLLECTION_NAME, videoId, 'comments');
  const docRef = await addDoc(commentsRef, {
    userId,
    content: trimmed,
    createdAt: Timestamp.now(),
  });
  await updateDoc(videoRef, {
    comments: increment(1),
    updatedAt: Timestamp.now(),
  });

  // Notify the video owner (if someone else commented)
  if (videoOwnerId && videoOwnerId !== userId) {
    const notifRef = doc(collection(db, 'notifications'));
    await setDoc(notifRef, {
      title: 'New comment',
      description: videoTitle ? `Someone commented on your video: ${videoTitle}` : 'Someone commented on your video.',
      type: 'success',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      audience: 'user',
      userId: videoOwnerId,
      actorId: userId,
      targetPath: `/explore?video=${encodeURIComponent(videoId)}&focus=comments&comment=${encodeURIComponent(docRef.id)}`,
    });
  }

  return docRef.id;
}

/**
 * Subscribe to comments for a video
 */
export function subscribeToVideoComments(
  videoId: string,
  callback: (comments: VideoCommentDocument[]) => void
): () => void {
  const commentsRef = collection(db, COLLECTION_NAME, videoId, 'comments');
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      videoId,
      ...(d.data() as Omit<VideoCommentDocument, 'id' | 'videoId'>),
    })) as VideoCommentDocument[];
    callback(data);
  });
}

/**
 * Get a single video by ID
 */
export async function getVideo(videoId: string): Promise<VideoDocument | null> {
  const videoRef = doc(db, COLLECTION_NAME, videoId);
  const videoSnap = await getDoc(videoRef);

  if (!videoSnap.exists()) {
    return null;
  }

  return {
    id: videoSnap.id,
    ...videoSnap.data(),
  } as VideoDocument;
}

/**
 * Create a new video (agent or user)
 */
export async function createVideo(data: CreateVideoDocument): Promise<string> {
  await ensureAuthReady();

  // Validate required fields
  if (!data.userId || !data.title || !data.location || !data.videoUrl) {
    throw new Error('Missing required fields: userId, title, location, and videoUrl are required');
  }

  if (!data.role || (data.role !== 'agent' && data.role !== 'user')) {
    throw new Error('Invalid role: must be "agent" or "user"');
  }

  try {
    const videosRef = collection(db, COLLECTION_NAME);
    const videoData: any = {
      ...stripUndefined(data as any),
      likes: 0,
      comments: 0,
      likedBy: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Extra guard in case callers pass undefined optional fields explicitly
    if (videoData.description === undefined) {
      delete videoData.description;
    }
    if (videoData.coverUrl === undefined) {
      delete videoData.coverUrl;
    }

    const docRef = await addDoc(videosRef, videoData);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating video document:', error);
    throw new Error(`Failed to create video: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Update a video (owner or admin)
 */
export async function updateVideo(
  videoId: string,
  updates: Partial<CreateVideoDocument>
): Promise<void> {
  const videoRef = doc(db, COLLECTION_NAME, videoId);
  const payload: any = {
    ...stripUndefined(updates as any),
    updatedAt: Timestamp.now(),
  };

  if (payload.description === undefined) {
    delete payload.description;
  }
  if (payload.coverUrl === undefined) {
    delete payload.coverUrl;
  }

  await updateDoc(videoRef, payload);
}

/**
 * Delete a video (owner or admin)
 */
export async function deleteVideo(videoId: string): Promise<void> {
  const videoRef = doc(db, COLLECTION_NAME, videoId);
  await deleteDoc(videoRef);
}

/**
 * Toggle like on a video
 */
export async function toggleVideoLike(
  videoId: string,
  userId: string
): Promise<{ liked: boolean; likes: number }> {
  const videoRef = doc(db, COLLECTION_NAME, videoId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(videoRef);
    if (!snap.exists()) {
      throw new Error('Video not found');
    }

    const video = { id: snap.id, ...(snap.data() as any) } as VideoDocument;
    const likedBy = video.likedBy || [];
    const isLiked = likedBy.includes(userId);

    if (isLiked) {
      const newLikedBy = likedBy.filter((id) => id !== userId);
      const nextLikes = Math.max(0, (video.likes || 0) - 1);
      tx.update(videoRef, {
        likedBy: newLikedBy,
        likes: nextLikes,
        updatedAt: Timestamp.now(),
      });
      return { liked: false, likes: nextLikes };
    }

    const newLikedBy = [...likedBy, userId];
    const nextLikes = (video.likes || 0) + 1;
    tx.update(videoRef, {
      likedBy: newLikedBy,
      likes: nextLikes,
      updatedAt: Timestamp.now(),
    });

    // Notify the video owner about a new like
    if (video.userId && video.userId !== userId) {
      const notifRef = doc(collection(db, 'notifications'));
      tx.set(notifRef, {
        title: 'New like',
        description: video.title ? `Someone liked your video: ${video.title}` : 'Someone liked your video.',
        type: 'success',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        audience: 'user',
        userId: video.userId,
        actorId: userId,
        targetPath: `/explore?video=${encodeURIComponent(videoId)}`,
      } as any);
    }
    return { liked: true, likes: nextLikes };
  });
}

/**
 * Delete all videos by a user (admin only)
 */
export async function deleteVideosByUser(userId: string): Promise<void> {
  // Use a simple where(...) query without orderBy to avoid composite index requirements.
  // Delete in batches until none remain.
  const videosRef = collection(db, COLLECTION_NAME);
  const batchSize = 200;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await getDocs(query(videosRef, where('userId', '==', userId), limit(batchSize)));
    if (snap.empty) break;
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
}
