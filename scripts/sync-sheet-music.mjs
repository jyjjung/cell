import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('Firebase credentials missing from .env.local');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  storageBucket: `${projectId}.firebasestorage.app` // Common default format
});

const db = admin.firestore();
const bucket = admin.storage().bucket();
const SONGS_COLLECTION = 'worshipSongs';

// --- Normalization Helpers ---

function normalizeTitle(filename) {
  // Remove extension
  let name = filename.replace(/\.pdf$/i, '');
  // Remove trailing -K or -chords-K (e.g. -G, -numbers, -chords-Ab)
  name = name.replace(/-chords-[A-G][b#]?$/i, '');
  name = name.replace(/-[A-G][b#]?$/i, '');
  name = name.replace(/-chords-numbers$/i, '');
  name = name.replace(/-numbers$/i, '');
  // Replace hyphens and underscores with spaces
  name = name.replace(/[-_]/g, ' ');
  // Title case
  return name.split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Simple Dice's Coefficient for fuzzy matching
function getSimilarity(s1, s2) {
  const n1 = s1.toLowerCase().trim();
  const n2 = s2.toLowerCase().trim();
  if (n1 === n2) return 1.0;
  
  const getBigrams = (str) => {
    const bigrams = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(n1);
  const b2 = getBigrams(n2);
  let intersection = 0;
  for (const b of b1) {
    if (b2.has(b)) intersection++;
  }
  return (2.0 * intersection) / (b1.size + b2.size);
}

// --- Main Logic ---

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const baseDir = process.env.SHEET_MUSIC_DIR || path.join(process.env.HOME, 'Documents/sheet music');
  
  console.log(`Starting ${isDryRun ? 'DRY RUN' : 'PRODUCTION'} sync from: ${baseDir}`);

  // 1. Fetch existing songs
  const songSnap = await db.collection(SONGS_COLLECTION).get();
  const existingSongs = songSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Loaded ${existingSongs.length} existing songs from library.`);

  // 2. Scan directory
  const folders = await fs.readdir(baseDir);
  const actions = [];

  for (const folder of folders) {
    const folderPath = path.join(baseDir, folder);
    const stat = await fs.stat(folderPath);
    if (!stat.isDirectory()) continue;

    // Map folder name to key
    let key = folder;
    if (key.toLowerCase() === 'numbers') key = 'numbers';

    const files = await fs.readdir(folderPath);
    for (const file of files) {
      if (!file.toLowerCase().endsWith('.pdf')) continue;

      const filePath = path.join(folderPath, file);
      const title = normalizeTitle(file);
      
      // Find match
      let bestMatch = null;
      let maxSim = 0;
      for (const s of existingSongs) {
        const sim = getSimilarity(title, s.title);
        if (sim > maxSim) {
          maxSim = sim;
          bestMatch = s;
        }
      }

      const matchThreshold = 0.7;
      if (bestMatch && maxSim >= matchThreshold) {
        actions.push({
          type: 'update',
          songId: bestMatch.id,
          songTitle: bestMatch.title,
          newTitle: title,
          key,
          file,
          filePath,
          similarity: maxSim.toFixed(2)
        });
      } else {
        actions.push({
          type: 'create',
          songTitle: title,
          key,
          file,
          filePath
        });
      }
    }
  }

  // 3. Summarize and Execute
  console.log('\n--- PROPOSED ACTIONS ---');
  for (const a of actions) {
    if (a.type === 'update') {
      console.log(`[LINK]  "${a.file}" -> Existing: "${a.songTitle}" (Sim: ${a.similarity}) [Key: ${a.key}]`);
    } else {
      console.log(`[NEW]   "${a.file}" -> New Song: "${a.songTitle}" [Key: ${a.key}]`);
    }
  }

  if (isDryRun) {
    console.log(`\nDry run completed. ${actions.length} actions proposed.`);
    return;
  }

  console.log(`\nExecuting ${actions.length} actions...`);
  
  for (const a of actions) {
    let songId = a.songId;
    if (a.type === 'create') {
      const docRef = await db.collection(SONGS_COLLECTION).add({
        title: a.songTitle,
        artist: null,
        chordSheets: [],
        createdBy: 'system-sync',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      songId = docRef.id;
      console.log(`Created new song: ${a.songTitle} (${songId})`);
    }

    const sheetId = crypto.randomUUID();
    const storagePath = `worshipChordSheets/${songId}/${sheetId}.pdf`;
    
    // Upload to Storage
    await bucket.upload(a.filePath, {
      destination: storagePath,
      metadata: { 
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=31536000'
      }
    });
    
    const fileRef = bucket.file(storagePath);
    // Make public or get signed URL. The app uses public URLs mostly for sheets.
    // However, the app seems to use getDownloadURL which generates a token.
    // For admin SDK, we can get a signed URL with long expiration or make it public.
    // Let's use the standard "firebase" way: make it public and use the metadata link.
    await fileRef.makePublic();
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    const sheet = {
      id: sheetId,
      key: a.key,
      imageUrl,
      storagePath,
      uploadedAt: admin.firestore.Timestamp.now()
    };

    await db.collection(SONGS_COLLECTION).doc(songId).update({
      chordSheets: admin.firestore.FieldValue.arrayUnion(sheet),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Uploaded sheet for ${a.songTitle} [Key: ${a.key}]`);
  }

  console.log('\nSync completed successfully.');
}

run().catch(e => {
  console.error('Fatal Sync Error:', e);
  process.exit(1);
});
