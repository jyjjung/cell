import type { FormAnswerValue, FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { hasCapability } from '@/lib/role-capabilities';

const USERS_COLLECTION = 'users';

const FORMS_COLLECTION = 'formDefinitions';
const FORM_PUBLIC_LINKS_COLLECTION = 'formPublicLinks';
const FORM_RESPONSES_COLLECTION = 'formResponses';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toFormFieldDefinition(raw: any): FormFieldDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string') return null;
  if (typeof raw.label !== 'string') return null;
  if (!['text', 'textarea', 'select', 'checkbox'].includes(raw.type)) return null;
  if (typeof raw.order !== 'number') return null;
  if (typeof raw.required !== 'boolean') return null;
  const conditional =
    raw.conditional && typeof raw.conditional === 'object'
      ? {
          dependsOnFieldId: raw.conditional.dependsOnFieldId,
          equals: raw.conditional.equals,
        }
      : undefined;
  const visibility =
    raw.visibility && typeof raw.visibility === 'object'
      ? {
          allowedRoleIds: Array.isArray(raw.visibility.allowedRoleIds) ? raw.visibility.allowedRoleIds.filter((x: any) => typeof x === 'string') : undefined,
          allowedUserIds: Array.isArray(raw.visibility.allowedUserIds) ? raw.visibility.allowedUserIds.filter((x: any) => typeof x === 'string') : undefined,
        }
      : undefined;

  return {
    id: raw.id,
    label: raw.label,
    type: raw.type,
    order: raw.order,
    required: raw.required,
    options: Array.isArray(raw.options) ? raw.options.filter((x: any) => typeof x === 'string') : undefined,
    conditional:
      conditional && typeof conditional.dependsOnFieldId === 'string' && typeof conditional.equals === 'string' ? conditional : undefined,
    visibility,
  };
}

function toFormDefinition(raw: any, id: string): FormDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.title !== 'string') return null;
  if (!Array.isArray(raw.fields)) return null;
  const fields: FormFieldDefinition[] = [];
  for (const f of raw.fields) {
    const parsed = toFormFieldDefinition(f);
    if (parsed) fields.push(parsed);
  }
  return {
    id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    fields,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publicToken: typeof raw.publicToken === 'string' ? raw.publicToken : undefined,
    allowedRoleIds: Array.isArray(raw.allowedRoleIds) ? raw.allowedRoleIds.filter((x: any) => typeof x === 'string') : undefined,
    allowedUserIds: Array.isArray(raw.allowedUserIds) ? raw.allowedUserIds.filter((x: any) => typeof x === 'string') : undefined,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : undefined,
  };
}

async function getUserRoleIds(adminDb: Firestore, userId: string): Promise<string[]> {
  const snap = await adminDb.collection(USERS_COLLECTION).doc(userId).get();
  if (!snap.exists) return [];
  const data = snap.data();
  const roleIds = data?.roleIds;
  return Array.isArray(roleIds) ? roleIds.filter((x: any) => typeof x === 'string') : [];
}

async function getUserCapabilityKeys(adminDb: Firestore, userId: string): Promise<string[]> {
  const snap = await adminDb.collection(USERS_COLLECTION).doc(userId).get();
  if (!snap.exists) return [];
  const data = snap.data();
  const capabilityKeys = data?.capabilityKeys;
  return Array.isArray(capabilityKeys) ? capabilityKeys.filter((x: any) => typeof x === 'string') : [];
}

export async function userIsAppAdmin(adminDb: Firestore, userId: string): Promise<boolean> {
  const capabilityKeys = await getUserCapabilityKeys(adminDb, userId);
  return hasCapability(capabilityKeys, 'app.admin');
}

export async function canUserViewForm(adminDb: Firestore, userId: string, form: FormDefinition): Promise<boolean> {
  if (await userIsAppAdmin(adminDb, userId)) return true;
  const roleIds = await getUserRoleIds(adminDb, userId);
  const allowedUserIds = form.allowedUserIds ?? [];
  const allowedRoleIds = form.allowedRoleIds ?? [];
  return allowedUserIds.includes(userId) || allowedRoleIds.some((r) => roleIds.includes(r));
}

export async function getFormById(adminDb: Firestore, formId: string): Promise<FormDefinition | null> {
  const snap = await adminDb.collection(FORMS_COLLECTION).doc(formId).get();
  if (!snap.exists) return null;
  return toFormDefinition(snap.data(), snap.id);
}

export async function getFormByPublicToken(adminDb: Firestore, publicToken: string): Promise<FormDefinition | null> {
  const linkSnap = await adminDb.collection(FORM_PUBLIC_LINKS_COLLECTION).doc(publicToken).get();
  if (!linkSnap.exists) return null;
  const link = linkSnap.data() as { formId?: string } | undefined;
  const formId = link?.formId;
  if (typeof formId !== 'string' || !formId) return null;
  return getFormById(adminDb, formId);
}

export async function listAccessibleForms(adminDb: Firestore, userId: string): Promise<FormDefinition[]> {
  const isAdmin = await userIsAppAdmin(adminDb, userId);
  if (isAdmin) {
    const snap = await adminDb.collection(FORMS_COLLECTION).orderBy('updatedAt', 'desc').limit(100).get();
    return snap.docs
      .map((d) => toFormDefinition(d.data(), d.id))
      .filter((x): x is FormDefinition => !!x);
  }

  const roleIds = await getUserRoleIds(adminDb, userId);
  const roleQueryValues = roleIds.slice(0, 10); // Firestore array-contains-any limit

  const byUsersSnap = await adminDb
    .collection(FORMS_COLLECTION)
    .where('allowedUserIds', 'array-contains', userId)
    .orderBy('updatedAt', 'desc')
    .limit(100)
    .get();

  const byRolesSnap = roleQueryValues.length
    ? await adminDb
        .collection(FORMS_COLLECTION)
        .where('allowedRoleIds', 'array-contains-any', roleQueryValues)
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get()
    : null;

  const map = new Map<string, FormDefinition>();
  for (const d of byUsersSnap.docs) {
    const parsed = toFormDefinition(d.data(), d.id);
    if (parsed) map.set(parsed.id, parsed);
  }
  if (byRolesSnap) {
    for (const d of byRolesSnap.docs) {
      const parsed = toFormDefinition(d.data(), d.id);
      if (parsed) map.set(parsed.id, parsed);
    }
  }
  return [...map.values()].sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
}

export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${fieldName} is required.`);
  return value.trim();
}

export async function createFormDefinition(input: {
  title: string;
  description?: string;
  fields: FormDefinition['fields'];
  allowedRoleIds?: string[];
  allowedUserIds?: string[];
  createdBy: string;
}): Promise<{ formId: string; publicToken: string }> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const formDocRef = adminDb.collection(FORMS_COLLECTION).doc();
  const formId = formDocRef.id;
  const publicToken = crypto.randomUUID();

  await formDocRef.set({
    title: input.title,
    description: input.description ?? null,
    fields: input.fields,
    allowedRoleIds: input.allowedRoleIds ?? [],
    allowedUserIds: input.allowedUserIds ?? [],
    publicToken,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: input.createdBy,
  });

  await adminDb.collection(FORM_PUBLIC_LINKS_COLLECTION).doc(publicToken).set({
    formId,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.createdBy,
  });

  return { formId, publicToken };
}

export async function updateFormDefinition(formId: string, input: {
  title: string;
  description?: string;
  fields: FormDefinition['fields'];
  allowedRoleIds?: string[];
  allowedUserIds?: string[];
  updatedBy: string;
}): Promise<void> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  await adminDb.collection(FORMS_COLLECTION).doc(formId).set({
    title: input.title,
    description: input.description ?? null,
    fields: input.fields,
    allowedRoleIds: input.allowedRoleIds ?? [],
    allowedUserIds: input.allowedUserIds ?? [],
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: input.updatedBy,
  }, { merge: true });
}

export async function listFormResponsesForAdmin(adminDb: Firestore, formId: string): Promise<FormResponse[]> {
  const snap = await adminDb
    .collection(FORM_RESPONSES_COLLECTION)
    .where('formId', '==', formId)
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get();

  return snap.docs
    .map((d) => {
      const data = d.data() as any;
      const formTitleSnapshot = typeof data.formTitleSnapshot === 'string' ? data.formTitleSnapshot : undefined;
      const answers = (data.answers ?? {}) as Record<string, FormAnswerValue>;
      const errors = (data.lastValidationErrors ?? {}) as Record<string, string>;
      return {
        id: d.id,
        formId: data.formId,
        formTitleSnapshot,
        submitterEmail: typeof data.submitterEmail === 'string' ? data.submitterEmail : '',
        submitterUserId: typeof data.submitterUserId === 'string' ? data.submitterUserId : null,
        answers,
        lastValidationErrors: errors && typeof errors === 'object' ? errors : undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        updatedBy: data.updatedBy === 'admin' ? 'admin' : 'guest',
      } satisfies FormResponse;
    });
}

export async function getFormResponseById(adminDb: Firestore, responseId: string): Promise<FormResponse | null> {
  const snap = await adminDb.collection(FORM_RESPONSES_COLLECTION).doc(responseId).get();
  if (!snap.exists) return null;
  const data = snap.data() as any;
  const answers = (data.answers ?? {}) as Record<string, FormAnswerValue>;
  const errors = (data.lastValidationErrors ?? {}) as Record<string, string>;
  return {
    id: snap.id,
    formId: data.formId,
    formTitleSnapshot: typeof data.formTitleSnapshot === 'string' ? data.formTitleSnapshot : undefined,
    submitterEmail: typeof data.submitterEmail === 'string' ? data.submitterEmail : '',
    submitterUserId: typeof data.submitterUserId === 'string' ? data.submitterUserId : null,
    answers,
    lastValidationErrors: errors && typeof errors === 'object' ? errors : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy === 'admin' ? 'admin' : 'guest',
  };
}

export async function createFormResponse(input: {
  formId: string;
  submitterEmail: string; // normalized lowercase
  submitterUserId?: string | null;
  answers: Record<string, FormAnswerValue>;
  formTitleSnapshot?: string;
  lastValidationErrors?: Record<string, string> | null;
}): Promise<string> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const responseRef = adminDb.collection(FORM_RESPONSES_COLLECTION).doc();
  await responseRef.set({
    formId: input.formId,
    submitterEmail: input.submitterEmail,
    submitterUserId: input.submitterUserId ?? null,
    formTitleSnapshot: input.formTitleSnapshot ?? null,
    answers: input.answers,
    lastValidationErrors: input.lastValidationErrors ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'guest',
  });
  return responseRef.id;
}

export async function updateFormResponseAnswers(input: {
  responseId: string;
  answers: Record<string, FormAnswerValue>;
  updatedBy: 'guest' | 'admin';
  lastValidationErrors?: Record<string, string> | null;
}): Promise<void> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  await adminDb.collection(FORM_RESPONSES_COLLECTION).doc(input.responseId).set({
    answers: input.answers,
    lastValidationErrors: input.lastValidationErrors ?? null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: input.updatedBy,
  }, { merge: true });
}

export { normalizeEmail };

