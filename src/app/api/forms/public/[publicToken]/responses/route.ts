import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import {
  getFormByPublicToken,
  createFormResponse,
  normalizeEmail,
  FormCapacityError,
  listFormResponsesForAdmin,
  listFormResponsesForAdminFallback,
} from '@/lib/server-forms';
import { validateFormResponse } from '@/lib/forms/validation';
import { syncFormAnswersToUserProfile } from '@/lib/forms/profile-sync';
import { applyProfileReferenceAnswers, formatProfileName } from '@/lib/forms/prefill';
import type { FormAnswerValue } from '@/types/forms';

/** Guest-readable responses list (no auth). Bounded + paginated. */
export async function GET(request: NextRequest, { params }: { params: { publicToken: string } }) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const form = await getFormByPublicToken(adminDb, params.publicToken);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limitRaw = url.searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : undefined;

    let page: { responses: unknown[]; nextCursor: string | null };
    try {
      page = await listFormResponsesForAdmin(adminDb, form.id, { limit, cursor });
    } catch (indexError: unknown) {
      const message = indexError instanceof Error ? indexError.message : '';
      if (message.includes('index') || message.includes('FAILED_PRECONDITION')) {
        page = await listFormResponsesForAdminFallback(adminDb, form.id, limit);
      } else {
        throw indexError;
      }
    }

    return NextResponse.json(
      {
        form: {
          id: form.id,
          title: form.title,
          description: form.description,
          fields: form.fields,
          responseCount: form.responseCount ?? 0,
        },
        responses: page.responses,
        nextCursor: page.nextCursor,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
        },
      },
    );
  } catch (error: unknown) {
    console.error('[forms/public responses GET]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { publicToken: string } }) {
  try {
    const body = await request.json();
    const emailRaw = body.email;
    const answersRaw = body.answers;

    if (typeof emailRaw !== 'string' || emailRaw.trim().length === 0) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    if (!answersRaw || typeof answersRaw !== 'object') {
      return NextResponse.json({ error: 'answers is required' }, { status: 400 });
    }

    let answers = answersRaw as Record<string, FormAnswerValue>;
    const submitterEmail = normalizeEmail(emailRaw);

    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const adminAuth = getAdminAuth(adminApp);
    const form = await getFormByPublicToken(adminDb, params.publicToken);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    if (
      typeof form.maxResponses === 'number' &&
      form.maxResponses > 0 &&
      (form.responseCount ?? 0) >= form.maxResponses
    ) {
      return NextResponse.json(
        { error: 'This form is no longer accepting responses.' },
        { status: 409 },
      );
    }

    let submitterUserId: string | null = null;
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (token) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        submitterUserId = decoded.uid;
      } catch {
        submitterUserId = null;
      }
    }

    if (submitterUserId) {
      const userSnap = await adminDb.collection('users').doc(submitterUserId).get();
      if (userSnap.exists) {
        const data = userSnap.data() as Record<string, unknown>;
        const firstName = typeof data.firstName === 'string' ? data.firstName : '';
        const lastName = typeof data.lastName === 'string' ? data.lastName : '';
        answers = applyProfileReferenceAnswers(form, answers, {
          name: formatProfileName({ firstName, lastName }),
          email: typeof data.email === 'string' ? data.email : submitterEmail,
        });
      }
    }

    const { errorsByFieldId } = validateFormResponse(form, answers);
    const responseId = await createFormResponse({
      formId: form.id,
      submitterEmail,
      answers,
      formTitleSnapshot: form.title,
      lastValidationErrors: Object.keys(errorsByFieldId).length ? errorsByFieldId : null,
      submitterUserId,
    });

    let profileSynced: string[] = [];
    if (submitterUserId && Object.keys(errorsByFieldId).length === 0) {
      try {
        const sync = await syncFormAnswersToUserProfile({
          adminDb,
          userId: submitterUserId,
          form,
          answers,
        });
        profileSynced = sync.fields;
      } catch (syncError: unknown) {
        console.error('[forms/public POST] profile sync failed', syncError);
      }
    }

    return NextResponse.json({
      responseId,
      errorsByFieldId: Object.keys(errorsByFieldId).length ? errorsByFieldId : null,
      profileSynced,
    });
  } catch (error: unknown) {
    if (error instanceof FormCapacityError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[forms/public POST]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
