import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { listFormResponsesForAdmin } from '@/lib/server-forms';

export async function GET(request: NextRequest, { params }: { params: { formId: string } }) {
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

    const responses = await listFormResponsesForAdmin(adminDb, params.formId);
    return NextResponse.json({ responses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

