import type { FormAnswerValue, FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { hasCapability } from '@/lib/role-capabilities';
import { isFormFieldType, serializeFieldsForFirestore } from '@/lib/forms/field-types';
import { normalizeAllowedWeekdays } from '@/lib/forms/date-field-utils';
import { formHasResponseCapacity } from '@/lib/forms/capacity';

const USERS_COLLECTION = 'users';
const FORMS_COLLECTION = 'formDefinitions';
const FORM_PUBLIC_LINKS_COLLECTION = 'formPublicLinks';
const FORM_RESPONSES_COLLECTION = 'formResponses';

/** Hard caps — growth must stay sub-linear. */
export const FORM_LIST_LIMIT = 50;
export const FORM_RECIPIENT_CAP = 100;
export const FORM_PUBLISH_NOTIFY_CAP = 100;
export const FORM_RESPONSE_PAGE_SIZE = 50;
export const FORM_SUBMITTED_USER_CAP = 200;
const FORM_DELETE_BATCH = 100;
const FORM_DELETE_MAX_BATCHES = 20; // ≤2000 responses

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function computeIsOpenToAll(allowedRoleIds?: string[] | null, allowedUserIds?: string[] | null): boolean {
  return (allowedRoleIds?.length ?? 0) === 0 && (allowedUserIds?.length ?? 0) === 0;
}

function toFormFieldDefinition(raw: any): FormFieldDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string') return null;
  if (typeof raw.label !== 'string') return null;
  if (!isFormFieldType(raw.type)) return null;
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
          allowedRoleIds: Array.isArray(raw.visibility.allowedRoleIds)
            ? raw.visibility.allowedRoleIds.filter((x: any) => typeof x === 'string')
            : undefined,
          allowedUserIds: Array.isArray(raw.visibility.allowedUserIds)
            ? raw.visibility.allowedUserIds.filter((x: any) => typeof x === 'string')
            : undefined,
        }
      : undefined;
  const allowedWeekdays = normalizeAllowedWeekdays(raw.dateConfig?.allowedWeekdays);
  const dateConfig = allowedWeekdays?.length ? { allowedWeekdays } : undefined;

  return {
    id: raw.id,
    label: raw.label,
    type: raw.type,
    order: raw.order,
    required: raw.required,
    options: Array.isArray(raw.options) ? raw.options.filter((x: any) => typeof x === 'string') : undefined,
    dateConfig,
    conditional:
      conditional && typeof conditional.dependsOnFieldId === 'string' && typeof conditional.equals === 'string'
        ? conditional
        : undefined,
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
  const allowedRoleIds = Array.isArray(raw.allowedRoleIds)
    ? raw.allowedRoleIds.filter((x: any) => typeof x === 'string')
    : undefined;
  const allowedUserIds = Array.isArray(raw.allowedUserIds)
    ? raw.allowedUserIds.filter((x: any) => typeof x === 'string')
    : undefined;
  const isOpenToAll =
    typeof raw.isOpenToAll === 'boolean' ? raw.isOpenToAll : computeIsOpenToAll(allowedRoleIds, allowedUserIds);

  return {
    id,
    title: raw.title,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    fields,
    status: raw.status === 'draft' ? 'draft' : 'published',
    deadlineDate: typeof raw.deadlineDate === 'string' ? raw.deadlineDate : undefined,
    maxResponses:
      typeof raw.maxResponses === 'number' && raw.maxResponses > 0 ? Math.floor(raw.maxResponses) : undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publicToken: typeof raw.publicToken === 'string' ? raw.publicToken : undefined,
    publishedAt: raw.publishedAt,
    publishedBy: typeof raw.publishedBy === 'string' ? raw.publishedBy : undefined,
    publishVersion: typeof raw.publishVersion === 'number' ? raw.publishVersion : undefined,
    allowedRoleIds,
    allowedUserIds,
    isOpenToAll,
    responseCount: typeof raw.responseCount === 'number' ? raw.responseCount : 0,
    needsAttentionCount: typeof raw.needsAttentionCount === 'number' ? raw.needsAttentionCount : 0,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : undefined,
  };
}

function mapResponseDoc(id: string, data: any): FormResponse {
  const answers = (data.answers ?? {}) as Record<string, FormAnswerValue>;
  const errors = (data.lastValidationErrors ?? {}) as Record<string, string>;
  return {
    id,
    formId: data.formId,
    formTitleSnapshot: typeof data.formTitleSnapshot === 'string' ? data.formTitleSnapshot : undefined,
    submitterEmail: typeof data.submitterEmail === 'string' ? data.submitterEmail : '',
    submitterUserId: typeof data.submitterUserId === 'string' ? data.submitterUserId : null,
    answers,
    lastValidationErrors: errors && typeof errors === 'object' && Object.keys(errors).length ? errors : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy === 'admin' ? 'admin' : 'guest',
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
  if (form.status === 'draft') return false;
  const roleIds = await getUserRoleIds(adminDb, userId);
  const allowedUserIds = form.allowedUserIds ?? [];
  const allowedRoleIds = form.allowedRoleIds ?? [];
  if (computeIsOpenToAll(allowedRoleIds, allowedUserIds) || form.isOpenToAll) return true;
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
  const form = await getFormById(adminDb, formId);
  if (!form || form.status === 'draft') return null;
  return form;
}

export async function listAccessibleForms(
  adminDb: Firestore,
  userId: string,
  options?: { includeDrafts?: boolean },
): Promise<FormDefinition[]> {
  const includeDrafts = options?.includeDrafts === true;
  const isAdmin = await userIsAppAdmin(adminDb, userId);
  if (isAdmin) {
    const snap = await adminDb.collection(FORMS_COLLECTION).limit(FORM_LIST_LIMIT).get();
    return snap.docs
      .map((d) => toFormDefinition(d.data(), d.id))
      .filter((x): x is FormDefinition => !!x && (includeDrafts || x.status !== 'draft'))
      .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
  }

  const roleIds = await getUserRoleIds(adminDb, userId);
  const roleQueryValues = roleIds.slice(0, 10);

  const [openSnap, byUsersSnap, byRolesSnap, legacyPublishedSnap] = await Promise.all([
    adminDb.collection(FORMS_COLLECTION).where('isOpenToAll', '==', true).limit(FORM_LIST_LIMIT).get(),
    adminDb
      .collection(FORMS_COLLECTION)
      .where('allowedUserIds', 'array-contains', userId)
      .limit(FORM_LIST_LIMIT)
      .get(),
    roleQueryValues.length
      ? adminDb
          .collection(FORMS_COLLECTION)
          .where('allowedRoleIds', 'array-contains-any', roleQueryValues)
          .limit(FORM_LIST_LIMIT)
          .get()
      : Promise.resolve(null),
    // Legacy published forms missing isOpenToAll — bounded fallback.
    adminDb.collection(FORMS_COLLECTION).where('status', '==', 'published').limit(FORM_LIST_LIMIT).get(),
  ]);

  const map = new Map<string, FormDefinition>();

  const consider = (parsed: FormDefinition | null) => {
    if (!parsed || parsed.status === 'draft') return;
    map.set(parsed.id, parsed);
  };

  for (const d of openSnap.docs) consider(toFormDefinition(d.data(), d.id));
  for (const d of byUsersSnap.docs) consider(toFormDefinition(d.data(), d.id));
  if (byRolesSnap) {
    for (const d of byRolesSnap.docs) consider(toFormDefinition(d.data(), d.id));
  }
  for (const d of legacyPublishedSnap.docs) {
    const parsed = toFormDefinition(d.data(), d.id);
    if (parsed && parsed.isOpenToAll) consider(parsed);
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
  status?: 'draft' | 'published';
  deadlineDate?: string;
  maxResponses?: number | null;
  createdBy: string;
}): Promise<{ formId: string; publicToken: string }> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const formDocRef = adminDb.collection(FORMS_COLLECTION).doc();
  const formId = formDocRef.id;
  const publicToken = crypto.randomUUID();
  const allowedRoleIds = input.allowedRoleIds ?? [];
  const allowedUserIds = input.allowedUserIds ?? [];
  const isOpenToAll = computeIsOpenToAll(allowedRoleIds, allowedUserIds);
  const maxResponses =
    typeof input.maxResponses === 'number' && input.maxResponses > 0 ? Math.floor(input.maxResponses) : null;

  await formDocRef.set({
    title: input.title,
    description: input.description ?? null,
    fields: serializeFieldsForFirestore(input.fields),
    status: input.status ?? 'draft',
    deadlineDate: input.deadlineDate ?? null,
    maxResponses,
    allowedRoleIds,
    allowedUserIds,
    isOpenToAll,
    responseCount: 0,
    needsAttentionCount: 0,
    publicToken,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    publishedAt: input.status === 'published' ? FieldValue.serverTimestamp() : null,
    publishedBy: input.status === 'published' ? input.createdBy : null,
    publishVersion: input.status === 'published' ? 1 : 0,
    createdBy: input.createdBy,
  });

  await adminDb.collection(FORM_PUBLIC_LINKS_COLLECTION).doc(publicToken).set({
    formId,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: input.createdBy,
  });

  return { formId, publicToken };
}

export async function updateFormDefinition(
  formId: string,
  input: {
    title: string;
    description?: string;
    fields: FormDefinition['fields'];
    allowedRoleIds?: string[];
    allowedUserIds?: string[];
    status?: 'draft' | 'published';
    deadlineDate?: string;
    maxResponses?: number | null;
    updatedBy: string;
  },
): Promise<{ statusChangedToPublished: boolean; publishVersion: number }> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const ref = adminDb.collection(FORMS_COLLECTION).doc(formId);
  const snap = await ref.get();
  const current = snap.data() as Record<string, unknown> | undefined;
  const currentStatus = current?.status === 'draft' ? 'draft' : 'published';
  const nextStatus = input.status ?? currentStatus;
  const statusChangedToPublished = currentStatus !== 'published' && nextStatus === 'published';
  const publishVersion =
    typeof current?.publishVersion === 'number'
      ? current.publishVersion + (statusChangedToPublished ? 1 : 0)
      : nextStatus === 'published'
        ? 1
        : 0;
  const allowedRoleIds = input.allowedRoleIds ?? [];
  const allowedUserIds = input.allowedUserIds ?? [];
  const isOpenToAll = computeIsOpenToAll(allowedRoleIds, allowedUserIds);
  const maxResponses =
    typeof input.maxResponses === 'number' && input.maxResponses > 0 ? Math.floor(input.maxResponses) : null;

  await ref.set(
    {
      title: input.title,
      description: input.description ?? null,
      fields: serializeFieldsForFirestore(input.fields),
      status: nextStatus,
      deadlineDate: input.deadlineDate ?? null,
      maxResponses,
      allowedRoleIds,
      allowedUserIds,
      isOpenToAll,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: input.updatedBy,
      ...(statusChangedToPublished
        ? {
            publishedAt: FieldValue.serverTimestamp(),
            publishedBy: input.updatedBy,
          }
        : {}),
      publishVersion,
    },
    { merge: true },
  );

  return { statusChangedToPublished, publishVersion };
}

export async function deleteFormDefinition(formId: string): Promise<void> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const formRef = adminDb.collection(FORMS_COLLECTION).doc(formId);
  const snap = await formRef.get();
  if (!snap.exists) return;

  const data = snap.data() as { publicToken?: string } | undefined;
  const publicToken = typeof data?.publicToken === 'string' ? data.publicToken : null;

  for (let i = 0; i < FORM_DELETE_MAX_BATCHES; i++) {
    const responsesSnap = await adminDb
      .collection(FORM_RESPONSES_COLLECTION)
      .where('formId', '==', formId)
      .limit(FORM_DELETE_BATCH)
      .get();
    if (responsesSnap.empty) break;

    const batch = adminDb.batch();
    for (const doc of responsesSnap.docs) batch.delete(doc.ref);
    await batch.commit();
    if (responsesSnap.size < FORM_DELETE_BATCH) break;
  }

  const finalBatch = adminDb.batch();
  if (publicToken) {
    finalBatch.delete(adminDb.collection(FORM_PUBLIC_LINKS_COLLECTION).doc(publicToken));
  }
  finalBatch.delete(formRef);
  await finalBatch.commit();
}

/**
 * Resolve notification recipients with a hard cap. Never scans the full users collection.
 */
export async function listAccessibleFormRecipientUserIds(
  adminDb: Firestore,
  form: Pick<FormDefinition, 'allowedRoleIds' | 'allowedUserIds' | 'status' | 'isOpenToAll'>,
): Promise<string[]> {
  if (form.status === 'draft') return [];

  const allowedUsers = new Set((form.allowedUserIds ?? []).filter(Boolean));
  const allowedRoles = (form.allowedRoleIds ?? []).filter(Boolean);
  const isOpen = form.isOpenToAll ?? computeIsOpenToAll(allowedRoles, [...allowedUsers]);

  if (isOpen) {
    const snap = await adminDb.collection(USERS_COLLECTION).limit(FORM_RECIPIENT_CAP).get();
    for (const doc of snap.docs) {
      if (doc.data()?.isApproved === false) continue;
      allowedUsers.add(doc.id);
      if (allowedUsers.size >= FORM_RECIPIENT_CAP) break;
    }
    return [...allowedUsers].slice(0, FORM_RECIPIENT_CAP);
  }

  if (allowedRoles.length > 0) {
    const roleChunks: string[][] = [];
    for (let i = 0; i < allowedRoles.length; i += 10) {
      roleChunks.push(allowedRoles.slice(i, i + 10));
    }
    for (const chunk of roleChunks) {
      if (allowedUsers.size >= FORM_RECIPIENT_CAP) break;
      const snap = await adminDb
        .collection(USERS_COLLECTION)
        .where('roleIds', 'array-contains-any', chunk)
        .limit(FORM_RECIPIENT_CAP)
        .get();
      for (const doc of snap.docs) {
        if (doc.data()?.isApproved === false) continue;
        allowedUsers.add(doc.id);
        if (allowedUsers.size >= FORM_RECIPIENT_CAP) break;
      }
    }
  }

  return [...allowedUsers].slice(0, FORM_RECIPIENT_CAP);
}

export async function listSubmittedUserIdsForForm(adminDb: Firestore, formId: string): Promise<Set<string>> {
  const snap = await adminDb
    .collection(FORM_RESPONSES_COLLECTION)
    .where('formId', '==', formId)
    .limit(FORM_SUBMITTED_USER_CAP)
    .get();
  const submitted = new Set<string>();
  for (const doc of snap.docs) {
    const userId = doc.data()?.submitterUserId;
    if (typeof userId === 'string' && userId) submitted.add(userId);
  }
  return submitted;
}

export async function listFormResponsesForAdmin(
  adminDb: Firestore,
  formId: string,
  options?: { limit?: number; cursor?: string | null },
): Promise<{ responses: FormResponse[]; nextCursor: string | null }> {
  const pageSize = Math.min(Math.max(options?.limit ?? FORM_RESPONSE_PAGE_SIZE, 1), 100);

  let query = adminDb
    .collection(FORM_RESPONSES_COLLECTION)
    .where('formId', '==', formId)
    .orderBy('updatedAt', 'desc')
    .limit(pageSize);

  if (options?.cursor) {
    const cursorSnap = await adminDb.collection(FORM_RESPONSES_COLLECTION).doc(options.cursor).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.get();
  const responses = snap.docs.map((d) => mapResponseDoc(d.id, d.data()));
  const nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1]!.id : null;
  return { responses, nextCursor };
}

/** Fallback when composite index is not ready — still bounded. */
export async function listFormResponsesForAdminFallback(
  adminDb: Firestore,
  formId: string,
  limit = FORM_RESPONSE_PAGE_SIZE,
): Promise<{ responses: FormResponse[]; nextCursor: string | null }> {
  const snap = await adminDb
    .collection(FORM_RESPONSES_COLLECTION)
    .where('formId', '==', formId)
    .limit(limit)
    .get();
  const responses = snap.docs
    .map((d) => mapResponseDoc(d.id, d.data()))
    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
  return { responses, nextCursor: null };
}

export async function getFormResponseById(adminDb: Firestore, responseId: string): Promise<FormResponse | null> {
  const snap = await adminDb.collection(FORM_RESPONSES_COLLECTION).doc(responseId).get();
  if (!snap.exists) return null;
  return mapResponseDoc(snap.id, snap.data());
}

export class FormCapacityError extends Error {
  constructor(message = 'This form is no longer accepting responses.') {
    super(message);
    this.name = 'FormCapacityError';
  }
}

export { formHasResponseCapacity };

export async function createFormResponse(input: {
  formId: string;
  submitterEmail: string;
  submitterUserId?: string | null;
  answers: Record<string, FormAnswerValue>;
  formTitleSnapshot?: string;
  lastValidationErrors?: Record<string, string> | null;
}): Promise<string> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const responseRef = adminDb.collection(FORM_RESPONSES_COLLECTION).doc();
  const formRef = adminDb.collection(FORMS_COLLECTION).doc(input.formId);
  const hasErrors = !!(input.lastValidationErrors && Object.keys(input.lastValidationErrors).length > 0);

  await adminDb.runTransaction(async (tx) => {
    const formSnap = await tx.get(formRef);
    if (!formSnap.exists) {
      throw new Error('Form not found');
    }
    const formData = formSnap.data() as Record<string, unknown>;
    const maxResponses =
      typeof formData.maxResponses === 'number' && formData.maxResponses > 0
        ? Math.floor(formData.maxResponses)
        : null;
    const responseCount = typeof formData.responseCount === 'number' ? formData.responseCount : 0;
    if (maxResponses !== null && responseCount >= maxResponses) {
      throw new FormCapacityError();
    }

    tx.set(responseRef, {
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

    tx.set(
      formRef,
      {
        responseCount: FieldValue.increment(1),
        ...(hasErrors ? { needsAttentionCount: FieldValue.increment(1) } : {}),
      },
      { merge: true },
    );
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
  const ref = adminDb.collection(FORM_RESPONSES_COLLECTION).doc(input.responseId);
  const snap = await ref.get();
  if (!snap.exists) return;

  const data = snap.data() as any;
  const formId = typeof data.formId === 'string' ? data.formId : null;
  const prevErrors = data.lastValidationErrors;
  const prevHad = !!(prevErrors && typeof prevErrors === 'object' && Object.keys(prevErrors).length > 0);
  const nextHad = !!(input.lastValidationErrors && Object.keys(input.lastValidationErrors).length > 0);

  await ref.set(
    {
      answers: input.answers,
      lastValidationErrors: input.lastValidationErrors ?? null,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: input.updatedBy,
    },
    { merge: true },
  );

  if (formId && prevHad !== nextHad) {
    await adminDb
      .collection(FORMS_COLLECTION)
      .doc(formId)
      .set(
        {
          needsAttentionCount: FieldValue.increment(nextHad ? 1 : -1),
        },
        { merge: true },
      );
  }
}

export function userOwnsFormResponse(
  response: Pick<FormResponse, 'submitterUserId' | 'submitterEmail'>,
  user: { uid: string; email?: string | null },
): boolean {
  if (response.submitterUserId && response.submitterUserId === user.uid) return true;
  const userEmail = typeof user.email === 'string' ? normalizeEmail(user.email) : '';
  const responseEmail =
    typeof response.submitterEmail === 'string' ? normalizeEmail(response.submitterEmail) : '';
  return !!userEmail && !!responseEmail && userEmail === responseEmail;
}

/** Delete a single response owned by the signed-in user; adjusts form counters. */
export async function deleteFormResponseForOwner(input: {
  responseId: string;
  formId: string;
  userId: string;
  userEmail?: string | null;
}): Promise<{ deleted: boolean; reason?: 'not_found' | 'forbidden' }> {
  const adminApp = getAdminApp();
  const adminDb = getAdminDb(adminApp);
  const ref = adminDb.collection(FORM_RESPONSES_COLLECTION).doc(input.responseId);
  const snap = await ref.get();
  if (!snap.exists) return { deleted: false, reason: 'not_found' };

  const response = mapResponseDoc(snap.id, snap.data());
  if (response.formId !== input.formId) return { deleted: false, reason: 'not_found' };
  if (!userOwnsFormResponse(response, { uid: input.userId, email: input.userEmail })) {
    return { deleted: false, reason: 'forbidden' };
  }

  const hadErrors = !!(
    response.lastValidationErrors && Object.keys(response.lastValidationErrors).length > 0
  );

  await ref.delete();
  await adminDb
    .collection(FORMS_COLLECTION)
    .doc(input.formId)
    .set(
      {
        responseCount: FieldValue.increment(-1),
        ...(hadErrors ? { needsAttentionCount: FieldValue.increment(-1) } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { deleted: true };
}

export { normalizeEmail };
