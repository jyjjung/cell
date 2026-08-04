import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { getFormById, getFormResponseById, updateFormResponseAnswers } from '@/lib/server-forms';
import { validateFormResponse } from '@/lib/forms/validation';
import type { FormAnswerValue } from '@/types/forms';

export async function GET(
  request: NextRequest,
  { params }: { params: { formId: string; responseId: string } },
) {
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

    const response = await getFormResponseById(adminDb, params.responseId);
    if (!response || response.formId !== params.formId) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    return NextResponse.json({ response });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { formId: string; responseId: string } },
) {
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

    const body = await request.json();
    const rawAnswers = body.answers;
    if (!rawAnswers || typeof rawAnswers !== 'object') {
      return NextResponse.json({ error: 'answers is required' }, { status: 400 });
    }

    const answers = rawAnswers as Record<string, FormAnswerValue>;

    const form = await getFormById(adminDb, params.formId);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    const { errorsByFieldId } = validateFormResponse(form, answers);
    const hasErrors = Object.keys(errorsByFieldId).length > 0;

    await updateFormResponseAnswers({
      responseId: params.responseId,
      answers,
      updatedBy: 'admin',
      lastValidationErrors: hasErrors ? errorsByFieldId : null,
    });

    return NextResponse.json({ success: true, errors: hasErrors ? errorsByFieldId : null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

