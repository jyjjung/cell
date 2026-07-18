import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { DOC_COMMENT_MAX } from '@/lib/docs-utils';

async function requireUid(request: NextRequest): Promise<string> {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const adminAuth = getAdminAuth(getAdminApp());
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
}

type RouteContext = { params: { docId: string } };

async function assertMember(docId: string, uid: string) {
  const adminDb = getAdminDb(getAdminApp());
  const snap = await adminDb.collection('docs').doc(docId).get();
  if (!snap.exists) throw Object.assign(new Error('Not found'), { status: 404 });
  const memberIds = Array.isArray(snap.data()?.memberIds) ? snap.data()!.memberIds : [];
  if (!memberIds.includes(uid)) throw Object.assign(new Error('Forbidden'), { status: 403 });
  return { adminDb, data: snap.data()! };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const uid = await requireUid(request);
    const { docId } = context.params;
    const { adminDb } = await assertMember(docId, uid);
    const snap = await adminDb
      .collection('docs')
      .doc(docId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();
    return NextResponse.json({
      comments: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to load comments';
    return NextResponse.json({ error: message }, { status: [401, 403, 404].includes(status) ? status : 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const uid = await requireUid(request);
    const { docId } = context.params;
    const { adminDb } = await assertMember(docId, uid);
    const body = await request.json();
    const text = String(body.text ?? '').trim().slice(0, DOC_COMMENT_MAX);
    if (!text) {
      return NextResponse.json({ error: 'Comment text required' }, { status: 400 });
    }
    const ref = await adminDb.collection('docs').doc(docId).collection('comments').add({
      text,
      authorId: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: ref.id });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to add comment';
    return NextResponse.json({ error: message }, { status: [401, 403, 404].includes(status) ? status : 500 });
  }
}
