import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { FormAnswerValue, FormDefinition, FormFieldDefinition } from '@/types/forms';
import { toDateInputValue } from '@/lib/forms/prefill';

const USERS_COLLECTION = 'users';
const EVENTS_COLLECTION = 'events';
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ProfileFieldSyncResult = {
  updated: boolean;
  fields: string[];
};

function stringAnswer(answers: Record<string, FormAnswerValue>, fieldId: string): string {
  const raw = answers[fieldId];
  return typeof raw === 'string' ? raw.trim() : '';
}

function findFirstField(
  fields: FormFieldDefinition[],
  type: FormFieldDefinition['type'],
): FormFieldDefinition | undefined {
  return [...fields].sort((a, b) => a.order - b.order).find((f) => f.type === type);
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: '' };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(' ') };
}

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m! - 1 && dt.getUTCDate() === d;
}

/**
 * Map common profile-linked form answers onto a user profile patch.
 * Only includes fields that have a non-empty answer.
 */
export function buildProfilePatchFromAnswers(
  form: Pick<FormDefinition, 'fields'>,
  answers: Record<string, FormAnswerValue>,
): Record<string, string> {
  const patch: Record<string, string> = {};

  const nameField = findFirstField(form.fields, 'name');
  if (nameField) {
    const full = stringAnswer(answers, nameField.id);
    if (full) {
      const { firstName, lastName } = splitFullName(full);
      if (firstName) patch.firstName = firstName;
      // Allow clearing last name only when the full name has multiple parts;
      // single-token names leave lastName unchanged on write (omit empty).
      if (lastName) patch.lastName = lastName;
    }
  }

  const emailField = findFirstField(form.fields, 'email');
  if (emailField) {
    const email = stringAnswer(answers, emailField.id);
    if (email) patch.email = normalizeEmail(email);
  }

  const phoneField = findFirstField(form.fields, 'phone');
  if (phoneField) {
    const phone = stringAnswer(answers, phoneField.id);
    if (phone) patch.phone = phone;
  }

  const birthdayField = findFirstField(form.fields, 'birthday');
  if (birthdayField) {
    const birthday = toDateInputValue(stringAnswer(answers, birthdayField.id));
    if (birthday && isValidIsoDate(birthday)) patch.birthday = birthday;
  }

  return patch;
}

/** If the member already has a linked Birthday schedule event, keep its date in sync. */
async function syncLinkedBirthdayEvent(params: {
  adminDb: Firestore;
  userId: string;
  birthday: string;
}): Promise<void> {
  const { adminDb, userId, birthday } = params;
  const snap = await adminDb
    .collection(EVENTS_COLLECTION)
    .where('userId', '==', userId)
    .limit(20)
    .get();

  const existing = snap.docs.find((doc) => {
    const category = doc.data().category;
    return category === 'Birthday';
  });
  if (!existing) return;

  const currentDate = typeof existing.data().date === 'string' ? existing.data().date : '';
  const currentDay = toDateInputValue(currentDate);
  if (currentDay === birthday) return;

  await existing.ref.set(
    {
      date: birthday,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Persist common form answers onto the signed-in user's profile.
 * Skips Auth email changes — only updates the Firestore user doc.
 * Bounded single-doc read + write (plus optional birthday event heal).
 */
export async function syncFormAnswersToUserProfile(params: {
  adminDb: Firestore;
  userId: string;
  form: Pick<FormDefinition, 'fields'>;
  answers: Record<string, FormAnswerValue>;
}): Promise<ProfileFieldSyncResult> {
  const { adminDb, userId, form, answers } = params;
  const patch = buildProfilePatchFromAnswers(form, answers);
  const keys = Object.keys(patch);
  if (keys.length === 0) return { updated: false, fields: [] };

  const ref = adminDb.collection(USERS_COLLECTION).doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return { updated: false, fields: [] };

  const current = snap.data() as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  const changed: string[] = [];

  for (const key of keys) {
    const value = patch[key]!;
    const existing = current[key];
    if (typeof existing === 'string' && existing.trim() === value) continue;
    next[key] = value;
    changed.push(key);
  }

  if (changed.length === 0) {
    // Profile already matches; still heal linked birthday event if needed.
    if (patch.birthday) {
      try {
        await syncLinkedBirthdayEvent({ adminDb, userId, birthday: patch.birthday });
      } catch (e) {
        console.error('[profile-sync] birthday event heal failed', e);
      }
    }
    return { updated: false, fields: [] };
  }

  next.updatedAt = FieldValue.serverTimestamp();
  await ref.set(next, { merge: true });

  if (patch.birthday && changed.includes('birthday')) {
    try {
      await syncLinkedBirthdayEvent({ adminDb, userId, birthday: patch.birthday });
    } catch (e) {
      console.error('[profile-sync] birthday event heal failed', e);
    }
  }

  return { updated: true, fields: changed };
}
