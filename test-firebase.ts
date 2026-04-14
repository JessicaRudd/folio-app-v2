import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.PROJECT_ID;
const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

console.log("Test Script Initialization:");
console.log("- Using Project ID:", projectId || "Discovered from environment");
console.log("- Using Database ID:", databaseId);

admin.initializeApp();

const db = getFirestore(admin.app(), databaseId === '(default)' ? undefined : databaseId);

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
