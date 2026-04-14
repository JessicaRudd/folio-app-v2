import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// In Google Cloud environments, initialize with no arguments to use default credentials and project.
if (!admin.apps.length) {
  admin.initializeApp();
}

export const adminApp = admin.app();
export const auth = admin.auth(adminApp);
export const db = getFirestore(adminApp, process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)');
