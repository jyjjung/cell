import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { deleteFormDefinition, getFormById, updateFormDefinition } from '@/lib/server-forms';
import { sendFormPublishedNotifications } from '@/lib/forms/publish-notifications';
import { parseFieldsFromBody } from '@/lib/forms/parse-fields';

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

    const form = await getFormById(adminDb, params.formId);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    return NextResponse.json({ form });
  } catch (error: unknown) {
    console.error('[forms/admin/definitions/[formId] GET]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { formId: string } }) {
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
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const description = typeof body.description === 'string' ? body.description : undefined;
    const status = body.status === 'draft' ? 'draft' : 'published';
    const deadlineDate = typeof body.deadlineDate === 'string' && body.deadlineDate.trim() ? body.deadlineDate : undefined;
    const fields = parseFieldsFromBody(body.fields);

    const allowedRoleIds = Array.isArray(body.allowedRoleIds) ? body.allowedRoleIds.filter((x: any) => typeof x === 'string') : undefined;
    const allowedUserIds = Array.isArray(body.allowedUserIds) ? body.allowedUserIds.filter((x: any) => typeof x === 'string') : undefined;

    const { statusChangedToPublished } = await updateFormDefinition(params.formId, {
      title,
      description,
      fields,
      allowedRoleIds,
      allowedUserIds,
      status,
      deadlineDate,
      updatedBy: decoded.uid,
    });

    if (statusChangedToPublished) {
      try {
        const updatedForm = await getFormById(adminDb, params.formId);
        if (updatedForm) {
          await sendFormPublishedNotifications({
            adminDb,
            adminMessaging: getAdminMessaging(adminApp),
            form: updatedForm,
          });
        }
      } catch (notifyError: unknown) {
        console.error('[forms/admin/definitions/[formId] PUT] notify failed', notifyError);
      }
    }

    return NextResponse.json({ success: true, notified: statusChangedToPublished });
  } catch (error: unknown) {
    console.error('[forms/admin/definitions/[formId] PUT]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to update form', details: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { formId: string } }) {
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

    const existing = await getFormById(adminDb, params.formId);
    if (!existing) return NextResponse.json({ error: 'Form not found' }, { status: 404 });

    await deleteFormDefinition(params.formId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[forms/admin/definitions/[formId] DELETE]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to delete form', details: message }, { status: 500 });
  }
}
