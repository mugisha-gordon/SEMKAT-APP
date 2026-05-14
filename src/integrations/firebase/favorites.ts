import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  limit,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './client';
import type { Property } from '@/types/property';

export interface FavoritePropertyDocument {
  id: string; // propertyId
  propertyId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  property: Property;
}

function favoritesCollection(userId: string) {
  return collection(db, 'users', userId, 'favorites');
}

function stripUndefined(value: any): any {
  if (value == null) return value;
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (typeof value === 'object') {
    const out: any = {};
    Object.keys(value).forEach((k) => {
      const v = (value as any)[k];
      if (v === undefined) return;
      out[k] = stripUndefined(v);
    });
    return out;
  }
  return value;
}

export async function saveFavoriteProperty(userId: string, property: Property): Promise<void> {
  const ref = doc(db, 'users', userId, 'favorites', property.id);
  const now = Timestamp.now();
  const safeProperty = stripUndefined(property) as Property;
  await setDoc(ref, {
    propertyId: property.id,
    createdAt: now,
    updatedAt: now,
    property: safeProperty,
  });
}

export async function removeFavoriteProperty(userId: string, propertyId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'favorites', propertyId);
  await deleteDoc(ref);
}

export function subscribeToFavoriteProperties(
  userId: string,
  callback: (favorites: FavoritePropertyDocument[]) => void,
  options?: { limit?: number },
  onError?: (error: any) => void
): Unsubscribe {
  const max = options?.limit ?? 60;
  const q = query(favoritesCollection(userId), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FavoritePropertyDocument, 'id'>),
      }));
      callback(items);
    },
    (error) => {
      console.error('Error subscribing to favorite properties:', error);
      onError?.(error);
    }
  );
}
