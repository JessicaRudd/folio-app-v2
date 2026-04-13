import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseAppletConfig from './firebase-applet-config.json' assert { type: 'json' };

const envProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
const projectId = envProjectId || firebaseAppletConfig.projectId;

const databaseId = firebaseAppletConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseAppletConfig.firestoreDatabaseId;

console.log("Test Script Initialization:");
console.log("- Env Project ID:", envProjectId);
console.log("- Config Project ID:", firebaseAppletConfig.projectId);
console.log("- Using Project ID:", projectId);
console.log("- Using Database ID:", databaseId || "(default)");

admin.initializeApp({
  projectId: 'folio-app-492702',
});

const db = getFirestore();

async function test() {
  try {
    console.log("Attempting to list collections...");
    const collections = await db.listCollections();
    console.log("Collections found:", collections.map(c => c.id));
    
    console.log("Attempting to read 'waitlist' collection...");
    const snapshot = await db.collection('waitlist').limit(1).get();
    console.log("Waitlist read successful. Docs found:", snapshot.size);
  } catch (err: any) {
    console.error("Test failed with error:");
    console.error("Message:", err.message);
    console.error("Code:", err.code);
    console.error("Details:", err.details);
  }
}

test();
