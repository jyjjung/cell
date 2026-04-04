import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
});

const db = admin.firestore();
const SONGS_COLLECTION = 'worshipSongs';

async function run() {
  const songSnap = await db.collection(SONGS_COLLECTION).get();
  const songs = songSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const groups = {};
  for (const s of songs) {
    const title = s.title.toLowerCase().trim();
    if (!groups[title]) groups[title] = [];
    groups[title].push(s);
  }

  const duplicates = Object.values(groups).filter(g => g.length > 1);
  console.log(`Found ${duplicates.length} song titles with duplicates.`);

  for (const group of duplicates) {
    const main = group[0];
    const others = group.slice(1);
    
    console.log(`Merging ${others.length} duplicates into "${main.title}" (${main.id})...`);
    
    let allSheets = [...main.chordSheets];
    for (const other of others) {
      allSheets = allSheets.concat(other.chordSheets);
    }
    
    // Deduplicate sheets by storagePath
    const uniqueSheets = [];
    const seenPaths = new Set();
    for (const sheet of allSheets) {
      if (!seenPaths.has(sheet.storagePath)) {
        uniqueSheets.push(sheet);
        seenPaths.add(sheet.storagePath);
      }
    }

    // Update main
    await db.collection(SONGS_COLLECTION).doc(main.id).update({
      chordSheets: uniqueSheets,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Delete others
    for (const other of others) {
      await db.collection(SONGS_COLLECTION).doc(other.id).delete();
    }
  }

  console.log('Deduplication complete.');
}

run().catch(console.error);
