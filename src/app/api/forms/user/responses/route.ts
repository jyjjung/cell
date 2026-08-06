import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { normalizeEmail } from '@/lib/server-forms';

const USERS_COLLECTION = 'users';
const RESPONSES_COLLECTION = 'formResponses';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    const decoded = await adminAuth.verifyIdToken(token);
    const userSnap = await adminDb.collection(USERS_COLLECTION).doc(decoded.uid).get();
    const emailRaw = userSnap.data()?.email ?? decoded.email;
    const submitterEmail =
      typeof emailRaw === 'string' && emailRaw.trim() ? normalizeEmail(emailRaw) : undefined;

    const byUserSnap = await adminDb
      .collection(RESPONSES_COLLECTION)
      .where('submitterUserId', '==', decoded.uid)
      .limit(100)
      .get();

    const byEmailSnap = submitterEmail
      ? await adminDb
          .collection(RESPONSES_COLLECTION)
          .where('submitterEmail', '==', submitterEmail)
          .limit(100)
          .get()
      : null;

    const map = new Map<string, Record<string, unknown>>();
    const ingest = (docs: typeof byUserSnap.docs) => {
      for (const d of docs) {
        const data = d.data() as Record<string, unknown>;
        const answers = (data.answers ?? {}) as Record<string, unknown>;
        const errors = data.lastValidationErrors;
        map.set(d.id, {
          id: d.id,
          formId: data.formId,
          formTitleSnapshot: data.formTitleSnapshot ?? null,
          submitterEmail: data.submitterEmail,
          submitterName: data.submitterName,
          submitterUserId: data.submitterUserId ?? null,
          answers,
          lastValidationErrors:
            errors && typeof errors === 'object' ? (errors as Record<string, string>) : null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        });
      }
    };

    ingest(byUserSnap.docs);
    if (byEmailSnap) ingest(byEmailSnap.docs);

    const responses = [...map.values()];
    return NextResponse.json({ responses });
  } catch (error: unknown) {
    console.error('[forms/user/responses]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
