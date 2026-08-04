import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

const USERS_COLLECTION = 'users';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    const decoded = await adminAuth.verifyIdToken(token);
    const userSnap = await adminDb.collection(USERS_COLLECTION).doc(decoded.uid).get();
    const emailRaw = userSnap.data()?.email;
    const submitterEmail =
      typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : undefined;
    if (!submitterEmail) return NextResponse.json({ responses: [] });

    const snap = await adminDb
      .collection('formResponses')
      .where('submitterEmail', '==', submitterEmail)
      .limit(200)
      .get();

    const responses = snap.docs.map((d) => {
      const data = d.data() as any;
      const answers = (data.answers ?? {}) as Record<string, any>;
      const errors = (data.lastValidationErrors ?? {}) as Record<string, string> | null;
      return {
        id: d.id,
        formId: data.formId,
        formTitleSnapshot: data.formTitleSnapshot ?? null,
        submitterEmail: data.submitterEmail,
        submitterUserId: data.submitterUserId ?? null,
        answers,
        lastValidationErrors: errors && typeof errors === 'object' ? errors : null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy,
      };
    });

    return NextResponse.json({ responses });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

