import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import {
  buildMemberIds,
  DOC_TITLE_MAX,
  isBlankDocHtml,
  mergeAuthorIds,
  normalizeSharedWith,
} from '@/lib/docs-utils';
import type { DocVisibility } from '@/types';

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

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const uid = await requireUid(request);
    const { docId } = context.params;
    const adminDb = getAdminDb(getAdminApp());
    const snap = await adminDb.collection('docs').doc(docId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = snap.data()!;
    const memberIds = Array.isArray(data.memberIds) ? data.memberIds : [];
    if (!memberIds.includes(uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ id: snap.id, ...data });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to load document';
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const uid = await requireUid(request);
    const { docId } = context.params;
    const body = await request.json();
    const adminDb = getAdminDb(getAdminApp());
    const ref = adminDb.collection('docs').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = snap.data()!;
    const memberIds = Array.isArray(data.memberIds) ? (data.memberIds as string[]) : [];
    if (!memberIds.includes(uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const isOwner = data.ownerId === uid;
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    };

    if (typeof body.title === 'string' || typeof body.content === 'string') {
      if (typeof body.title === 'string') {
        updates.title = body.title.trim().slice(0, DOC_TITLE_MAX);
      }
      if (typeof body.content === 'string') {
        const existingContent = typeof data.content === 'string' ? data.content : '';
        // Guard against race that autosaves empty TipTap HTML over real content.
        // Intentional clears still work when the client sends allowEmpty: true.
        if (
          isBlankDocHtml(body.content) &&
          !isBlankDocHtml(existingContent) &&
          body.allowEmpty !== true
        ) {
          // Keep existing content; still allow title / metadata updates.
        } else {
          updates.content = body.content;
        }
      }
      const existingAuthors = Array.isArray(data.authorIds) ? (data.authorIds as string[]) : [data.ownerId as string];
      updates.authorIds = mergeAuthorIds(existingAuthors, uid);
    }

    if (body.visibility != null || body.sharedWith != null) {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the owner can change sharing' }, { status: 403 });
      }
      const visibility = (body.visibility === 'private' ? 'private' : 'shared') as DocVisibility;
      const sharedInput = Array.isArray(body.sharedWith)
        ? body.sharedWith.map(String)
        : Array.isArray(data.sharedWith)
          ? (data.sharedWith as string[])
          : [];
      const sharedWith = normalizeSharedWith(visibility, sharedInput, uid);
      if (visibility === 'shared' && sharedWith.length === 0) {
        return NextResponse.json({ error: 'Pick at least one person to share with' }, { status: 400 });
      }
      updates.visibility = visibility;
      updates.sharedWith = sharedWith;
      updates.memberIds = buildMemberIds(uid, sharedWith);
      const existingAuthors = Array.isArray(data.authorIds) ? (data.authorIds as string[]) : [uid];
      updates.authorIds = mergeAuthorIds(existingAuthors, uid);
    }

    await ref.update(updates);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to update document';
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const uid = await requireUid(request);
    const { docId } = context.params;
    const adminDb = getAdminDb(getAdminApp());
    const ref = adminDb.collection('docs').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (snap.data()?.ownerId !== uid) {
      return NextResponse.json({ error: 'Only the owner can delete' }, { status: 403 });
    }
    // Delete comments subcollection in batches
    const comments = await ref.collection('comments').limit(400).get();
    const batch = adminDb.batch();
    comments.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(ref);
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status: number }).status)
      : 500;
    const message = error instanceof Error ? error.message : 'Failed to delete document';
    return NextResponse.json({ error: message }, { status: status === 401 ? 401 : 500 });
  }
}
