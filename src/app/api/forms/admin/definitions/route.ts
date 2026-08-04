import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { createFormDefinition, getFormById, listAccessibleForms } from '@/lib/server-forms';
import type { FormFieldDefinition } from '@/types/forms';
import { sendFormPublishedNotifications } from '@/lib/forms/publish-notifications';
import { isChoiceFieldType, isFormFieldType } from '@/lib/forms/field-types';

function parseFieldsFromBody(rawFields: unknown): FormFieldDefinition[] {
  if (!Array.isArray(rawFields)) return [];
  const fields: FormFieldDefinition[] = [];
  for (const f of rawFields as any[]) {
    if (!f || typeof f !== 'object') continue;
    if (typeof f.id !== 'string' || typeof f.label !== 'string' || typeof f.order !== 'number') continue;
    if (!isFormFieldType(f.type)) continue;
    if (typeof f.required !== 'boolean') continue;
    fields.push({
      id: f.id,
      label: f.label,
      type: f.type,
      order: f.order,
      required: f.required,
      options: isChoiceFieldType(f.type)
        ? Array.isArray(f.options)
          ? f.options.filter((x: any) => typeof x === 'string')
          : []
        : undefined,
      conditional:
        f.conditional &&
        typeof f.conditional === 'object' &&
        typeof f.conditional.dependsOnFieldId === 'string' &&
        typeof f.conditional.equals === 'string'
          ? { dependsOnFieldId: f.conditional.dependsOnFieldId, equals: f.conditional.equals }
          : undefined,
      visibility:
        f.visibility && typeof f.visibility === 'object'
          ? {
              allowedRoleIds: Array.isArray(f.visibility.allowedRoleIds)
                ? f.visibility.allowedRoleIds.filter((x: any) => typeof x === 'string')
                : undefined,
              allowedUserIds: Array.isArray(f.visibility.allowedUserIds)
                ? f.visibility.allowedUserIds.filter((x: any) => typeof x === 'string')
                : undefined,
            }
          : undefined,
    });
  }
  return fields;
}

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

    const forms = await listAccessibleForms(adminDb, caller.uid);
    return NextResponse.json({ forms });
  } catch (error: unknown) {
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
    const status = body.status === 'draft' ? 'draft' : 'published';
    const deadlineDate = typeof body.deadlineDate === 'string' && body.deadlineDate.trim() ? body.deadlineDate : undefined;
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
      createdBy: decoded.uid,
    });

    if (status === 'published') {
      const createdForm = await getFormById(adminDb, created.formId);
      if (createdForm) {
        await sendFormPublishedNotifications({
          adminDb,
          adminMessaging: getAdminMessaging(adminApp),
          form: createdForm,
        });
      }
    }

    return NextResponse.json({ ...created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
