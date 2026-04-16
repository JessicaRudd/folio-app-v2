import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// In Google Cloud environments, initialize with no arguments to use default credentials and project.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.GOOGLE_CLOUD_PROJECT
  });
}

export const adminApp = admin.app();
console.log("Firebase Admin Initialized for Project:", adminApp.options.projectId || "process.env.GCLOUD_PROJECT = " + process.env.GCLOUD_PROJECT);
export const auth = admin.auth(adminApp);
let dbId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)';
if (dbId === 'default') dbId = '(default)';
console.log("Firestore target database:", dbId);
export const db = getFirestore(adminApp, dbId);
