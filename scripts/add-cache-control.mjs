import admin from 'firebase-admin';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Firebase credentials missing from .env.local');
  process.exit(1);
}

// Initialize Firebase Admin App
admin.initializeApp({
  credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  storageBucket: `${projectId}.firebasestorage.app` // default format
});

const bucket = admin.storage().bucket();

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`🚀 Starting Cache-Control update script (${isDryRun ? 'DRY RUN' : 'PRODUCTION MODE'})...`);

  // Target folders to search and optimize
  const targets = ['avatars/', 'chats/', 'worshipChordSheets/'];
  const cacheControlValue = 'public, max-age=31536000';

  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const prefix of targets) {
    console.log(`\n📂 Scanning prefix: "${prefix}"...`);
    try {
      const [files] = await bucket.getFiles({ prefix });

      if (files.length === 0) {
        console.log(`   No files found under "${prefix}".`);
        continue;
      }

      console.log(`   Found ${files.length} files. Reviewing metadata...`);

      for (const file of files) {
        totalScanned++;
        const [metadata] = await file.getMetadata();
        
        // Skip directory placeholders if any
        if (file.name.endsWith('/')) {
          totalSkipped++;
          continue;
        }

        const currentCacheControl = metadata.cacheControl;
        
        if (currentCacheControl === cacheControlValue) {
          totalSkipped++;
          // Optional verbose logging
          // console.log(`   ✅ [SKIPPED] ${file.name} - Cache-Control is already optimized`);
          continue;
        }

        console.log(`   ⚡ [NEED UPDATE] ${file.name}`);
        console.log(`      Current: "${currentCacheControl || 'none'}"`);
        console.log(`      Target:  "${cacheControlValue}"`);

        if (!isDryRun) {
          try {
            await file.setMetadata({
              cacheControl: cacheControlValue
            });
            console.log(`      ✨ [SUCCESS] Updated ${file.name}`);
            totalUpdated++;
          } catch (err) {
            console.error(`      ❌ [ERROR] Failed to update ${file.name}:`, err.message);
            totalErrors++;
          }
        } else {
          totalUpdated++;
          console.log(`      📝 [DRY RUN] Would update ${file.name}`);
        }
      }
    } catch (err) {
      console.error(`❌ Failed to retrieve files for prefix "${prefix}":`, err.message);
      totalErrors++;
    }
  }

  console.log('\n=========================================');
  console.log('🏁 Execution Summary');
  console.log('=========================================');
  console.log(`🔍 Total Files Scanned: ${totalScanned}`);
  console.log(`🔄 Total Files Updated: ${totalUpdated}`);
  console.log(`⏭️  Total Files Skipped: ${totalSkipped}`);
  console.log(`⚠️  Total Errors:        ${totalErrors}`);
  console.log('=========================================');
  
  if (isDryRun) {
    console.log('💡 This was a dry-run. No changes were made to Firebase Storage.');
  } else {
    console.log('🎉 Migration completed successfully!');
  }
}

run().catch(e => {
  console.error('💥 Fatal Migration Error:', e);
  process.exit(1);
});
