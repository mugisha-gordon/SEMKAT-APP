import { Timestamp } from 'firebase/firestore';

// Role type
export type AppRole = 'admin' | 'agent' | 'user';

// User document structure
export interface UserDocument {
  userId: string; // Firebase Auth UID (also document ID)
  email: string;
  role: AppRole; // Primary role for quick access
  roles: {
    admin?: {
      approvedBy: string;
      approvedAt: Timestamp;
    };
    agent?: {
      approvedBy: string;
      approvedAt: Timestamp;
    };
    user: {
      createdAt: Timestamp;
    };
  };
  profile: {
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    pushToken?: string | null;
    pushPlatform?: string | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  createdAt: Timestamp;
}

// Agent Application document structure
export interface AgentApplicationDocument {
  id: string; // Document ID
  userId: string; // Firebase Auth UID
  fullName: string;
  phone: string;
  email: string;
  company: string | null;
  licenseNumber: string | null;
  experienceYears: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null; // Firebase Auth UID
  reviewedAt: Timestamp | null;
  notes: string | null;
  createdAt: Timestamp;
}

// Helper type for creating user documents
export type CreateUserDocument = Omit<UserDocument, 'roles'> & {
  roles: {
    user: {
      createdAt: Timestamp;
    };
  };
};

// Helper type for updating user documents
export type UpdateUserDocument = Partial<Omit<UserDocument, 'userId' | 'createdAt' | 'roles' | 'profile'>> & {
  profile?: Partial<UserDocument['profile']>;
};

// Helper type for creating agent applications
export type CreateAgentApplicationDocument = Omit<
  AgentApplicationDocument,
  'id' | 'userId' | 'status' | 'reviewedBy' | 'reviewedAt' | 'notes' | 'createdAt'
>;

// Helper type for updating agent applications
export type UpdateAgentApplicationDocument = Partial<
  Omit<AgentApplicationDocument, 'id' | 'userId' | 'createdAt'>
>;
