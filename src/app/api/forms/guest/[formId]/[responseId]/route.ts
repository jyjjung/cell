import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getFormById, getFormResponseById, updateFormResponseAnswers } from '@/lib/server-forms';
import { validateFormResponse } from '@/lib/forms/validation';
import { syncFormAnswersToUserProfile } from '@/lib/forms/profile-sync';
import type { FormAnswerValue } from '@/types/forms';

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
