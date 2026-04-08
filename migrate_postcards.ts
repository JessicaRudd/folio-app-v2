import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  console.log('Starting migration...');
  const foliosSnap = await getDocs(collection(db, 'folios'));
  const foliosMap = new Map();
  foliosSnap.forEach(doc => {
    foliosMap.set(doc.id, doc.data());
  });

  const postcardsSnap = await getDocs(collection(db, 'postcards'));
  console.log(`Found ${postcardsSnap.size} postcards.`);

  let batch = writeBatch(db);
  let count = 0;
  let batchCount = 0;

  for (const postcardDoc of postcardsSnap.docs) {
    const data = postcardDoc.data();
    const folio = foliosMap.get(data.folioId);
    if (folio) {
      batch.update(postcardDoc.ref, {
        folioVisibility: folio.visibility || 'private',
        folioPrivacy: folio.privacy || 'private'
      });
      count++;
      batchCount++;
    }
    
    if (batchCount >= 400) {
      await batch.commit();
      console.log(`Migrated ${count} postcards...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Migration complete. Updated ${count} postcards.`);
}

migrate().catch(console.error);
