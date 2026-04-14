import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, getDocFromServer, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the local config file provided by AI Studio
// Firebase configuration using environment variables
// Vite's import.meta.env is populated at build time
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_V1,
  authDomain: import.meta.env.VITE_FB_V2,
  projectId: import.meta.env.VITE_FB_V3,
  storageBucket: import.meta.env.VITE_FB_V4,
  messagingSenderId: import.meta.env.VITE_FB_V5,
  appId: import.meta.env.VITE_FB_V6,
  measurementId: import.meta.env.VITE_FB_V7
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the database ID from environment variables, or undefined for (default)
const databaseId = import.meta.env.VITE_FB_V8 === '(default)' 
  ? undefined 
  : import.meta.env.VITE_FB_V8;
export const db = getFirestore(app, databaseId);
console.log("Firestore Instance Initialized with DB ID:", databaseId || "(default)");
export const storage = getStorage(app);

async function testConnection() {
  try {
    console.log("Testing Firestore connection to:", databaseId || "(default)");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection test successful (or document not found, but RPC worked)");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firestore client is offline. Check project configuration and network.");
    } else {
      console.error("Firestore connection test error:", error);
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
