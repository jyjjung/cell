import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { createFormDefinition, getFormById, listAccessibleForms } from '@/lib/server-forms';
import { sendFormPublishedNotifications } from '@/lib/forms/publish-notifications';
import { parseFieldsFromBody } from '@/lib/forms/parse-fields';
import { parseFormStatus } from '@/lib/forms/lifecycle';

export async function GET(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const caller = await (async () => {
      const token = request.headers.get('Authorization')?.split('Bearer ')[1];
      if (!token) return null;
      const adminAuth = getAdminAuth(adminApp);
      const decoded = await adminAuth.verifyIdToken(token);
      if (!(await userHasAdminAccess(adminDb, decoded.uid))) return null;
      return { uid: decoded.uid };
    })();

    if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const forms = await listAccessibleForms(adminDb, caller.uid, { includeDrafts: true });
    return NextResponse.json({ forms });
  } catch (error: unknown) {
    console.error('[forms/admin/definitions GET]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminAuth = getAdminAuth(adminApp);
    const decoded = await adminAuth.verifyIdToken(token);
    if (!(await userHasAdminAccess(adminDb, decoded.uid))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    const description = typeof body.description === 'string' ? body.description : undefined;
    const status = parseFormStatus(body.status);
    const deadlineDate = typeof body.deadlineDate === 'string' && body.deadlineDate.trim() ? body.deadlineDate : undefined;
    const maxResponsesRaw = body.maxResponses;
    const maxResponses =
      maxResponsesRaw === null || maxResponsesRaw === undefined || maxResponsesRaw === ''
        ? null
        : (() => {
            const n = typeof maxResponsesRaw === 'number' ? maxResponsesRaw : Number(maxResponsesRaw);
            if (!Number.isFinite(n) || n <= 0) return null;
            return Math.min(Math.floor(n), 100_000);
          })();
    const lockResponsesAfterSubmit = body.lockResponsesAfterSubmit === true;
    const fields = parseFieldsFromBody(body.fields);

    const allowedRoleIds = Array.isArray(body.allowedRoleIds) ? body.allowedRoleIds.filter((x: any) => typeof x === 'string') : undefined;
    const allowedUserIds = Array.isArray(body.allowedUserIds) ? body.allowedUserIds.filter((x: any) => typeof x === 'string') : undefined;

    const created = await createFormDefinition({
      title,
      description,
      fields,
      allowedRoleIds,
      allowedUserIds,
      status,
      deadlineDate,
      maxResponses,
      lockResponsesAfterSubmit,
      createdBy: decoded.uid,
    });

    if (status === 'published') {
      try {
        const createdForm = await getFormById(adminDb, created.formId);
        if (createdForm) {
          await sendFormPublishedNotifications({
            adminDb,
            adminMessaging: getAdminMessaging(adminApp),
            form: createdForm,
          });
        }
      } catch (notifyError: unknown) {
        console.error('[forms/admin/definitions POST] notify failed', notifyError);
      }
    }

    return NextResponse.json({ ...created });
  } catch (error: unknown) {
    console.error('[forms/admin/definitions POST]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Failed to create form', details: message }, { status: 500 });
  }
}
