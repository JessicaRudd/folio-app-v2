import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';

if (!admin.apps.length) {
  const projectId = firebaseAppletConfig.projectId;

  admin.initializeApp({
    projectId: projectId
  });
  
  console.log("Firebase Admin initialized for project:", projectId);
}

// Use the database ID from the config, or undefined for (default)
const databaseId = firebaseAppletConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseAppletConfig.firestoreDatabaseId;
export const db = getFirestore(databaseId);
export const auth = admin.auth();

console.log("Firestore Admin instance created for database:", databaseId || "(default)");
