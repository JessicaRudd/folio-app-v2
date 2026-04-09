import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, getDocFromServer, doc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Import the local config file provided by AI Studio
import firebaseAppletConfig from '../../firebase-applet-config.json';

// In production, these can be overridden by environment variables
// We use a safe check for import.meta.env which is common in Vite apps
const getEnv = (key: string) => {
  try {
    // Vite's import.meta.env is populated at build time
    const value = (import.meta as any).env?.[key];
    if (value && value !== 'undefined') return value;
    return undefined;
  } catch {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || firebaseAppletConfig.apiKey,
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || firebaseAppletConfig.authDomain,
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || firebaseAppletConfig.projectId,
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || firebaseAppletConfig.storageBucket,
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || firebaseAppletConfig.messagingSenderId,
  appId: getEnv('VITE_FIREBASE_APP_ID') || firebaseAppletConfig.appId,
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || firebaseAppletConfig.measurementId
};

console.log("Firebase Config at Runtime:", {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseAppletConfig.firestoreDatabaseId,
  authDomain: firebaseConfig.authDomain
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const databaseId = firebaseAppletConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseAppletConfig.firestoreDatabaseId;
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
