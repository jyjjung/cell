import { NextResponse, type NextRequest } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

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

type RouteContext = { params: Promise<{ docId: string; commentId: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const uid = await requireUid(request);
    const { docId, commentId } = (await context.params);
    const adminDb = getAdminDb(getAdminApp());
    const docSnap = await adminDb.collection('docs').doc(docId).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = docSnap.data()!;
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
    if (!memberIds.includes(uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const commentRef = adminDb.collection('docs').doc(docId).collection('comments').doc(commentId);
    const commentSnap = await commentRef.get();
    if (!commentSnap.exists) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    const authorId = commentSnap.data()?.authorId;
    if (authorId !== uid && data.ownerId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await commentRef.delete();
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to delete comment';
    return NextResponse.json({ error: message }, { status: [401, 403, 404].includes(status) ? status : 500 });
  }
}
