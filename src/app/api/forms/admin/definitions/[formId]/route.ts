import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { deleteFormDefinition, getFormById, updateFormDefinition } from '@/lib/server-forms';
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

    // Only fan out on draft → published (not every save of a live form).
    if (statusChangedToPublished) {
      const updatedForm = await getFormById(adminDb, params.formId);
      if (updatedForm) {
        await sendFormPublishedNotifications({
          adminDb,
          adminMessaging: getAdminMessaging(adminApp),
          form: updatedForm,
        });
      }
    }

    return NextResponse.json({ success: true, notified: statusChangedToPublished });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
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
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
