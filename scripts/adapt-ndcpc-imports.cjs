#!/usr/bin/env node
/** Rewrite copied NDCPC-main files for cell-master compatibility shims. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const REPLACEMENTS = [
  [/@\/lib\/types/g, '@/types'],
  [/@\/lib\/dates/g, '@/lib/ndcpc/dates'],
  [/@\/lib\/setlist/g, '@/lib/ndcpc/setlist'],
  [/@\/lib\/worship-format/g, '@/lib/ndcpc/worship-format'],
  [/@\/lib\/schedule-roles/g, '@/lib/ndcpc/schedule-roles'],
  [/@\/lib\/upcoming-duties/g, '@/lib/ndcpc/upcoming-duties'],
  [/@\/lib\/read-tracking/g, '@/lib/ndcpc/read-tracking'],
  [/@\/lib\/unread-counts/g, '@/lib/ndcpc/unread-counts'],
  [/@\/lib\/chat-message-meta/g, '@/lib/ndcpc/chat-message-meta'],
  [/@\/lib\/name-similarity/g, '@/lib/ndcpc/name-similarity'],
  [/@\/lib\/video/g, '@/lib/ndcpc/video'],
  [/@\/lib\/resolve-video-url/g, '@/lib/ndcpc/resolve-video-url'],
  [/@\/lib\/youtube-chapters/g, '@/lib/ndcpc/youtube-chapters'],
  [/@\/lib\/naver-metadata/g, '@/lib/ndcpc/naver-metadata'],
  [/@\/lib\/naver-blog/g, '@/lib/ndcpc/naver-blog'],
  [/@\/lib\/photo-cache/g, '@/lib/ndcpc/photo-cache'],
  [/@\/lib\/roster-reminders/g, '@/lib/ndcpc/roster-reminders'],
  [/@\/lib\/format-date/g, '@/lib/formatting'],
  [/@\/lib\/data-cache/g, '@/lib/ndcpc/data-cache'],
  [/\.\/ui\//g, '@/components/ui/'],
  [/\.\/([A-Z][A-Za-z]+)/g, '@/components/ndcpc/$1'],
  [/collection\(firestore, 'schedules'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.schedules)'],
  [/collection\(firestore, "schedules"\)/g, 'collection(firestore, NDCPc_COLLECTIONS.schedules)'],
  [/collection\(firestore, 'announcements'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.announcements)'],
  [/collection\(firestore, 'chatMessages'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.chatMessages)'],
  [/collection\(firestore, 'volunteers'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.volunteers)'],
  [/collection\(firestore, 'resources'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.resources)'],
  [/collection\(firestore, 'setlists'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.setlists)'],
  [/collection\(firestore, 'photos'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.photos)'],
  [/collection\(firestore, 'prayerTopics'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.prayerTopics)'],
  [/collection\(firestore, 'worshipFormats'\)/g, 'collection(firestore, NDCPc_COLLECTIONS.worshipFormats)'],
  [/doc\(firestore, 'schedules'/g, 'doc(firestore, NDCPc_COLLECTIONS.schedules'],
  [/doc\(firestore, 'announcements'/g, 'doc(firestore, NDCPc_COLLECTIONS.announcements'],
  [/doc\(firestore, 'chatMessages'/g, 'doc(firestore, NDCPc_COLLECTIONS.chatMessages'],
  [/doc\(firestore, 'volunteers'/g, 'doc(firestore, NDCPc_COLLECTIONS.volunteers'],
  [/doc\(firestore, 'resources'/g, 'doc(firestore, NDCPc_COLLECTIONS.resources'],
  [/doc\(firestore, 'setlists'/g, 'doc(firestore, NDCPc_COLLECTIONS.setlists'],
  [/doc\(firestore, 'photos'/g, 'doc(firestore, NDCPc_COLLECTIONS.photos'],
  [/doc\(firestore, 'prayerTopics'/g, 'doc(firestore, NDCPc_COLLECTIONS.prayerTopics'],
  [/doc\(firestore, 'worshipFormats'/g, 'doc(firestore, NDCPc_COLLECTIONS.worshipFormats'],
  [/href="\/schedule"/g, 'href="/ndcpc/schedule"'],
  [/href="\/setlist"/g, 'href="/ndcpc/setlist"'],
  [/href="\/announcements"/g, 'href="/ndcpc/announcements"'],
  [/href="\/chat"/g, 'href="/ndcpc/chat"'],
  [/href="\/roster"/g, 'href="/ndcpc/roster"'],
  [/href="\/resources"/g, 'href="/ndcpc/resources"'],
  [/href="\/photos"/g, 'href="/ndcpc/photos"'],
  [/href="\/prayer"/g, 'href="/ndcpc/prayer"'],
  [/pathname\.startsWith\('\/announcements'\)/g, "pathname.startsWith('/ndcpc/announcements')"],
  [/pathname\.startsWith\('\/chat'\)/g, "pathname.startsWith('/ndcpc/chat')"],
  [/pathname === '\/'/g, "pathname === '/ndcpc'"],
];

function ensureImport(content, importLine) {
  if (content.includes(importLine.trim())) return content;
  const useClient = content.startsWith("'use client'");
  if (useClient) {
    const idx = content.indexOf('\n') + 1;
    return content.slice(0, idx) + importLine + content.slice(idx);
  }
  return importLine + content;
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) transform(p);
  }
}

function transform(file) {
  let src = fs.readFileSync(file, 'utf8');
  let next = src;
  for (const [from, to] of REPLACEMENTS) next = next.replace(from, to);
  if (next.includes('NDCPc_COLLECTIONS') && !next.includes("from '@/lib/ndcpc/collections'")) {
    next = ensureImport(next, "import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';\n");
  }
  if (next !== src) fs.writeFileSync(file, next);
}

walk(path.join(ROOT, 'src/lib/ndcpc'));
walk(path.join(ROOT, 'src/components/ndcpc'));
console.log('adapted ndcpc files');
