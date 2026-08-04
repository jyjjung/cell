import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getFormByPublicToken, createFormResponse, normalizeEmail } from '@/lib/server-forms';
import { validateFormResponse } from '@/lib/forms/validation';
import type { FormAnswerValue } from '@/types/forms';

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

    const submitterEmail = normalizeEmail(emailRaw);
    const answers = answersRaw as Record<string, FormAnswerValue>;

    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const form = await getFormByPublicToken(adminDb, params.publicToken);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const { errorsByFieldId } = validateFormResponse(form, answers);
    const responseId = await createFormResponse({
      formId: form.id,
      submitterEmail,
      answers,
      formTitleSnapshot: form.title,
      lastValidationErrors: Object.keys(errorsByFieldId).length ? errorsByFieldId : null,
      submitterUserId: null,
    });

    return NextResponse.json({
      responseId,
      errorsByFieldId: Object.keys(errorsByFieldId).length ? errorsByFieldId : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

