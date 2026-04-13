import firebaseAppletConfig from '../../firebase-applet-config.json';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Try to get project ID from environment first, fallback to config
// We capture the original env project ID before we might have modified it
const envProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
const projectId = envProjectId || firebaseAppletConfig.projectId;
const databaseId = firebaseAppletConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseAppletConfig.firestoreDatabaseId;

console.log("Firebase Admin Initialization Details:");
console.log("- Original Env Project ID:", envProjectId);
console.log("- Config Project ID:", firebaseAppletConfig.projectId);
console.log("- Final Project ID:", projectId);
console.log("- Database ID:", databaseId || "(default)");

// Force environment variables for underlying Google Cloud SDKs if we have a project ID
if (projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.GCLOUD_PROJECT = projectId;
  process.env.PROJECT_ID = projectId;
}

// Initialize the default app if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
    credential: admin.credential.applicationDefault()
  });
  console.log("Firebase Admin initialized default app with projectId:", projectId);
}

export const adminApp = admin.app();
export const auth = admin.auth(adminApp);

// Use getFirestore for consistent database targeting
export const db = getFirestore(adminApp, databaseId);

console.log("Firestore Admin instance initialized. Project:", projectId, "Database:", databaseId || "(default)");
