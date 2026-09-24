import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import { hashShareToken, shareTokenFromRequest } from '@/lib/file-share';

type Entry = {
  id: string;
  kind?: 'file' | 'folder';
  name: string;
  parentId?: string | null;
  contentType?: string;
  size?: number;
  storagePath?: string;
};

async function getShare(tokenValue: string) {
  const token = shareTokenFromRequest(tokenValue);
  if (!token) return null;
  const db = getAdminDb(getAdminApp());
  const share = await db.collection('adminFileShares').doc(hashShareToken(token)).get();
  if (!share.exists) return null;
  const data = share.data();
  if (!data?.entryId || !['file', 'folder'].includes(data.kind)) return null;
  const entry = await db.collection('adminFiles').doc(String(data.entryId)).get();
  if (!entry.exists) return null;
  return { db, entry: { id: entry.id, ...entry.data() } as Entry, kind: data.kind as 'file' | 'folder' };
}

export async function GET(request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  try {
    const share = await getShare(token);
    if (!share) return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
    const entryId = request.nextUrl.searchParams.get('entryId');
    if (share.kind === 'file') {
      if (request.nextUrl.searchParams.get('meta') === '1') {
        return NextResponse.json({ entry: { id: share.entry.id, name: share.entry.name, kind: 'file', contentType: share.entry.contentType, size: share.entry.size }, entries: [] });
      }
      if (entryId && entryId !== share.entry.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return serveFile(share.entry, request.nextUrl.searchParams.get('download') === '1');
    }

    const all = (await share.db.collection('adminFiles').get()).docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as Entry));
    const descendants = all.filter((item) => {
      let parentId = item.parentId ?? null;
      while (parentId) {
        if (parentId === share.entry.id) return true;
        parentId = all.find((candidate) => candidate.id === parentId)?.parentId ?? null;
      }
      return false;
    });
    if (entryId) {
      const child = descendants.find((item) => item.id === entryId);
      if (!child || child.kind === 'folder') return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return serveFile(child, request.nextUrl.searchParams.get('download') === '1');
    }
    return NextResponse.json({
      entry: { id: share.entry.id, name: share.entry.name, kind: 'folder' },
      entries: descendants.map(({ id, kind, name, parentId, contentType, size }) => ({
        id, kind: kind ?? 'file', name, parentId: parentId ?? null, contentType, size,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[files/share] Failed to serve public share:', error);
    return NextResponse.json({ error: 'Could not load shared resource' }, { status: 500 });
  }
}

async function serveFile(entry: Entry, download = false) {
  if (!entry.storagePath) return NextResponse.json({ error: 'File content unavailable' }, { status: 404 });
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cell-abca4.firebasestorage.app';
  const [buffer] = await getAdminStorage(getAdminApp()).bucket(bucketName).file(entry.storagePath).download();
  return new NextResponse(buffer as BodyInit, {
    headers: {
      'Content-Type': entry.contentType || 'application/octet-stream',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(entry.name)}`,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
