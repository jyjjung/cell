import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getFormById, getFormResponseById, updateFormResponseAnswers, deleteFormResponseForOwner } from '@/lib/server-forms';
import { validateFormResponse } from '@/lib/forms/validation';
import { syncFormAnswersToUserProfile } from '@/lib/forms/profile-sync';
import { resolveSubmitterName } from '@/lib/forms/submitter-display';
import type { FormAnswerValue } from '@/types/forms';

const USERS_COLLECTION = 'users';

export async function GET(_request: NextRequest, { params }: { params: { formId: string; responseId: string } }) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);

    const [form, response] = await Promise.all([
      getFormById(adminDb, params.formId),
      getFormResponseById(adminDb, params.responseId),
    ]);
    if (!form || !response || response.formId !== params.formId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ form, response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { formId: string; responseId: string } }) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminAuth = getAdminAuth(adminApp);

    const [form, response] = await Promise.all([
      getFormById(adminDb, params.formId),
      getFormResponseById(adminDb, params.responseId),
    ]);
    if (!form || !response || response.formId !== params.formId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const rawAnswers = body.answers;
    if (!rawAnswers || typeof rawAnswers !== 'object') {
      return NextResponse.json({ error: 'answers is required' }, { status: 400 });
    }

    const answers = rawAnswers as Record<string, FormAnswerValue>;
    const { errorsByFieldId } = validateFormResponse(form, answers);
    const hasErrors = Object.keys(errorsByFieldId).length > 0;

    await updateFormResponseAnswers({
      responseId: params.responseId,
      answers,
      updatedBy: 'guest',
      lastValidationErrors: hasErrors ? errorsByFieldId : null,
      submitterName: resolveSubmitterName(form, answers) || response.submitterName,
    });

    let profileSynced: string[] = [];
    let userId = typeof response.submitterUserId === 'string' ? response.submitterUserId : null;
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!userId && token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        userId = decoded.uid;
      } catch {
        userId = null;
      }
    }

    if (userId && !hasErrors) {
      try {
        const sync = await syncFormAnswersToUserProfile({
          adminDb,
          userId,
          form,
          answers,
        });
        profileSynced = sync.fields;
      } catch (syncError: unknown) {
        console.error('[forms/guest PUT] profile sync failed', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      errorsByFieldId: hasErrors ? errorsByFieldId : null,
      profileSynced,
    });
  } catch (error: unknown) {
    console.error('[forms/guest PUT]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { formId: string; responseId: string } }) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminAuth = getAdminAuth(adminApp);

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Sign in to delete your response.' }, { status: 401 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userSnap = await adminDb.collection(USERS_COLLECTION).doc(uid).get();
    const emailRaw = userSnap.data()?.email;
    const userEmail = typeof emailRaw === 'string' ? emailRaw : null;

    const result = await deleteFormResponseForOwner({
      responseId: params.responseId,
      formId: params.formId,
      userId: uid,
      userEmail,
    });

    if (result.reason === 'not_found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (result.reason === 'forbidden') {
      return NextResponse.json({ error: 'You can only delete your own responses.' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[forms/guest DELETE]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
