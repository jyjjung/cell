import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import {
  listFormResponsesForAdmin,
  listFormResponsesForAdminFallback,
} from '@/lib/server-forms';

export async function GET(request: NextRequest, props: { params: Promise<{ formId: string }> }) {
  const params = await props.params;
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminAuth = getAdminAuth(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    if (!(await userHasAdminAccess(adminDb, decoded.uid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limitRaw = url.searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : undefined;

    try {
      const page = await listFormResponsesForAdmin(adminDb, params.formId, {
        limit,
        cursor,
      });
      return NextResponse.json(page);
    } catch (indexError: unknown) {
      // Composite index may not be deployed yet — bounded fallback.
      const message = indexError instanceof Error ? indexError.message : '';
      if (message.includes('index') || message.includes('FAILED_PRECONDITION')) {
        const page = await listFormResponsesForAdminFallback(adminDb, params.formId, limit);
        return NextResponse.json(page);
      }
      throw indexError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
