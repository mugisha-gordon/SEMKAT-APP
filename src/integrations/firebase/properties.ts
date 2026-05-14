import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  onSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, ensureAuthReady } from './client';
import type { PropertyType, PropertyStatus } from '@/types/property';

 function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
   const out: Record<string, any> = {};
   for (const [k, v] of Object.entries(obj)) {
     if (v !== undefined) out[k] = v;
   }
   return out as Partial<T>;
 }

export interface PropertyDocument {
  id: string;
  agentId: string; // Firebase Auth UID of the agent (or admin)
  postedByRole?: 'agent' | 'admin';
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: string;
  location: {
    region: string;
    district: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  size: {
    value: number;
    unit: 'acres' | 'sqft' | 'sqm' | 'hectares';
  };
  images: string[];
  illustration2D?: string; // URL for 2D floor plan/diagram
  illustration3D?: string; // URL for 3D virtual tour/panorama
  kmlUrl?: string; // URL for estate tour boundaries/paths
  description: string;
  features: string[];
  hasTitle: boolean;
  isFeatured?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  installmentPayment?: {
    enabled: boolean;
    depositPercentage?: number;
    numberOfInstallments?: number;
    installmentAmount?: number;
    terms?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePropertyDocument {
  agentId: string;
  postedByRole?: 'agent' | 'admin';
  title: string;
  type: PropertyType;
  status: PropertyStatus;
  price: number;
  currency: string;
  location: {
    region: string;
    district: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  size: {
    value: number;
    unit: 'acres' | 'sqft' | 'sqm' | 'hectares';
  };
  images: string[];
  illustration2D?: string; // URL for 2D floor plan/diagram
  illustration3D?: string; // URL for 3D virtual tour/panorama
  kmlUrl?: string; // URL for estate tour boundaries/paths
  description: string;
  features: string[];
  hasTitle: boolean;
  isFeatured?: boolean;
  bedrooms?: number;
  bathrooms?: number;
  installmentPayment?: {
    enabled: boolean;
    depositPercentage?: number;
    numberOfInstallments?: number;
    installmentAmount?: number;
    terms?: string;
  };
}

const COLLECTION_NAME = 'properties';

/**
 * Get all properties (public - can be filtered)
 */
export async function getProperties(
  filters?: {
    type?: PropertyType;
    status?: PropertyStatus;
    agentId?: string;
    minPrice?: number;
    maxPrice?: number;
    district?: string;
    limit?: number;
  }
): Promise<PropertyDocument[]> {
  const propertiesRef = collection(db, COLLECTION_NAME);
  let q = query(propertiesRef, orderBy('createdAt', 'desc'));

  if (filters?.agentId) {
    q = query(q, where('agentId', '==', filters.agentId));
  }

  if (filters?.type) {
    q = query(q, where('type', '==', filters.type));
  }

  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }

  if (filters?.limit) {
    q = query(q, limit(filters.limit));
  }

  const snapshot = await getDocs(q);
  let properties = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PropertyDocument[];

  // Client-side filtering for price and district (Firestore doesn't support range queries easily without indexes)
  if (filters?.minPrice !== undefined) {
    properties = properties.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters?.maxPrice !== undefined) {
    properties = properties.filter((p) => p.price <= filters.maxPrice!);
  }
  if (filters?.district) {
    properties = properties.filter((p) =>
      p.location.district.toLowerCase().includes(filters.district!.toLowerCase())
    );
  }

  return properties;
}

export function subscribeToProperties(
  filters: {
    type?: PropertyType;
    status?: PropertyStatus;
    agentId?: string;
    limit?: number;
  } | undefined,
  callback: (properties: PropertyDocument[]) => void
): Unsubscribe {
  const propertiesRef = collection(db, COLLECTION_NAME);
  let q = query(propertiesRef);

  if (filters?.agentId) {
    q = query(q, where('agentId', '==', filters.agentId));
  }
  if (filters?.type) {
    q = query(q, where('type', '==', filters.type));
  }
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters?.limit) {
    q = query(q, limit(filters.limit));
  }

  return onSnapshot(q, (snapshot) => {
    const properties = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<PropertyDocument, 'id'>),
    })) as PropertyDocument[];

    properties.sort((a, b) => {
      const at = (a.createdAt as any)?.toMillis?.() ?? 0;
      const bt = (b.createdAt as any)?.toMillis?.() ?? 0;
      return bt - at;
    });
    callback(properties);
  });
}

export async function getAgentPropertyCounts(agentId: string): Promise<{
  totalListings: number;
  activeListings: number;
}> {
  const propertiesRef = collection(db, COLLECTION_NAME);

  const totalQuery = query(propertiesRef, where('agentId', '==', agentId));
  const activeQuery = query(
    propertiesRef,
    where('agentId', '==', agentId),
    where('status', '==', 'available')
  );

  const [totalSnap, activeSnap] = await Promise.all([
    getCountFromServer(totalQuery),
    getCountFromServer(activeQuery),
  ]);

  return {
    totalListings: totalSnap.data().count,
    activeListings: activeSnap.data().count,
  };
}

/**
 * Get a single property by ID
 */
export async function getProperty(propertyId: string): Promise<PropertyDocument | null> {
  const propertyRef = doc(db, COLLECTION_NAME, propertyId);
  const propertySnap = await getDoc(propertyRef);

  if (!propertySnap.exists()) {
    return null;
  }

  return {
    id: propertySnap.id,
    ...propertySnap.data(),
  } as PropertyDocument;
}

/**
 * Create a new property (agent only)
 */
export async function createProperty(data: CreatePropertyDocument): Promise<string> {
  await ensureAuthReady();

  const propertiesRef = collection(db, COLLECTION_NAME);
  // Remove undefined optional fields to avoid Firestore errors
  const sanitized: any = {
    ...stripUndefined(data as any),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (sanitized.illustration2D === undefined) {
    delete sanitized.illustration2D;
  }
  if (sanitized.illustration3D === undefined) {
    delete sanitized.illustration3D;
  }
  if (sanitized.kmlUrl === undefined) {
    delete sanitized.kmlUrl;
  }
  if (sanitized.installmentPayment === undefined) {
    delete sanitized.installmentPayment;
  }

  // Common optional fields that can be explicitly undefined
  if (sanitized.bedrooms === undefined) {
    delete sanitized.bedrooms;
  }
  if (sanitized.bathrooms === undefined) {
    delete sanitized.bathrooms;
  }
  if (sanitized.isFeatured === undefined) {
    delete sanitized.isFeatured;
  }

  // Nested optional fields
  if (sanitized.installmentPayment && typeof sanitized.installmentPayment === 'object') {
    sanitized.installmentPayment = stripUndefined(sanitized.installmentPayment);
    if (sanitized.installmentPayment.terms === undefined) {
      delete sanitized.installmentPayment.terms;
    }
  }

  const docRef = await addDoc(propertiesRef, sanitized);
  return docRef.id;
}

/**
 * Update a property (agent who owns it, or admin)
 */
export async function updateProperty(
  propertyId: string,
  updates: Partial<CreatePropertyDocument>
): Promise<void> {
  const propertyRef = doc(db, COLLECTION_NAME, propertyId);
  const payload: any = {
    ...stripUndefined(updates as any),
    updatedAt: Timestamp.now(),
  };

  if (payload.installmentPayment && typeof payload.installmentPayment === 'object') {
    payload.installmentPayment = stripUndefined(payload.installmentPayment);
    if (payload.installmentPayment.terms === undefined) {
      delete payload.installmentPayment.terms;
    }
  }

  await updateDoc(propertyRef, payload);
}

/**
 * Delete a property (agent who owns it, or admin)
 */
export async function deleteProperty(propertyId: string): Promise<void> {
  const propertyRef = doc(db, COLLECTION_NAME, propertyId);
  await deleteDoc(propertyRef);
}

/**
 * Delete all properties by an agent (admin only)
 */
export async function deletePropertiesByAgent(agentId: string): Promise<void> {
  // Use a simple where(...) query without orderBy to avoid composite index requirements.
  // Delete in batches until none remain.
  const propertiesRef = collection(db, COLLECTION_NAME);
  const batchSize = 200;

  // Keep looping until the query returns no documents.
  // This avoids needing pagination cursors and orderBy.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await getDocs(query(propertiesRef, where('agentId', '==', agentId), limit(batchSize)));
    if (snap.empty) break;
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
}
