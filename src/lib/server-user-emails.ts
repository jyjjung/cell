import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { UserProfileData } from '@/types';

const USERS = 'users';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function emailTakenByOther(auth: Auth, email: string, exceptUid: string): Promise<boolean> {
  try {
    const existing = await auth.getUserByEmail(email);
    return existing.uid !== exceptUid;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/user-not-found') return false;
    throw error;
  }
}

export async function changePrimaryEmail(
  auth: Auth,
  db: Firestore,
  userId: string,
  rawEmail: string,
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error('Invalid email address.');

  if (await emailTakenByOther(auth, email, userId)) {
    throw new Error('That email is already used by another account.');
  }

  const userRef = db.collection(USERS).doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error('User not found.');
  const profile = snap.data() as UserProfileData;
  const contactEmails = (profile.contactEmails ?? []).filter((e) => normalizeEmail(e) !== email);

  await auth.updateUser(userId, { email, emailVerified: false });
  await userRef.update({
    email,
    contactEmails,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function addContactEmail(
  db: Firestore,
  userId: string,
  rawEmail: string,
): Promise<string[]> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) throw new Error('Invalid email address.');

  const userRef = db.collection(USERS).doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error('User not found.');
  const profile = snap.data() as UserProfileData;

  if (profile.email && normalizeEmail(profile.email) === email) {
    throw new Error('That email is already the login email.');
  }

  const existing = (profile.contactEmails ?? []).map(normalizeEmail);
  if (existing.includes(email)) {
    throw new Error('That contact email is already on this account.');
  }

  const next = [...existing, email];
  await userRef.update({
    contactEmails: next,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return next;
}

export async function removeContactEmail(
  db: Firestore,
  userId: string,
  rawEmail: string,
): Promise<string[]> {
  const email = normalizeEmail(rawEmail);
  const userRef = db.collection(USERS).doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error('User not found.');
  const profile = snap.data() as UserProfileData;
  const next = (profile.contactEmails ?? []).filter((e) => normalizeEmail(e) !== email);
  await userRef.update({
    contactEmails: next,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return next;
}

/** Promote a contact email to login email (Auth + profile). */
export async function promoteContactEmailToPrimary(
  auth: Auth,
  db: Firestore,
  userId: string,
  rawEmail: string,
): Promise<void> {
  const email = normalizeEmail(rawEmail);
  const userRef = db.collection(USERS).doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error('User not found.');
  const profile = snap.data() as UserProfileData;
  const contacts = (profile.contactEmails ?? []).map(normalizeEmail);
  if (!contacts.includes(email)) {
    throw new Error('That email is not a contact email on this account.');
  }
  await changePrimaryEmail(auth, db, userId, email);
}
