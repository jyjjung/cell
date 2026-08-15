import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';
import type { UserProfileData } from '@/types';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { commitDeletesInChunks, commitUpdatesInChunks } from '@/lib/commit-batches';
import { reconcileUserRoleState } from '@/lib/server-role-state';
import { normalizeEmail } from '@/lib/server-user-emails';
import type { MergeAccountPicks, MergeFieldPick } from '@/types/user-admin';

export type { MergeAccountPicks, MergeFieldPick } from '@/types/user-admin';

const DEFAULT_PICKS: Required<MergeAccountPicks> = {
  firstName: 'survivor',
  lastName: 'survivor',
  email: 'survivor',
  avatar: 'survivor',
  roleIds: 'union',
  isApproved: 'eitherApproved',
  access: 'union',
  ndcpcRole: 'survivor',
  bibleChecklist: 'union',
  communityProgress: 'maxProgress',
  contactEmails: 'union',
};

function pickValue<T>(survivor: T, merge: T, pick: MergeFieldPick): T {
  if (pick === 'merge') return merge;
  return survivor;
}

function pickUnionArrays(a: string[] = [], b: string[] = []): string[] {
  return Array.from(new Set([...a, ...b]));
}

function pickAccess(
  survivor: UserProfileData['access'],
  merge: UserProfileData['access'],
  pick: MergeFieldPick,
): UserProfileData['access'] {
  if (pick === 'merge') return merge ?? {};
  if (pick === 'union') {
    return {
      cell: Boolean(survivor?.cell || merge?.cell),
      ndcpc: Boolean(survivor?.ndcpc || merge?.ndcpc),
    };
  }
  return survivor ?? {};
}

function pickApproved(s: boolean | undefined, m: boolean | undefined, pick: MergeFieldPick): boolean {
  if (pick === 'eitherApproved') return Boolean(s || m);
  if (pick === 'merge') return Boolean(m);
  return Boolean(s);
}

function pickNdcpcRole(
  survivor: UserProfileData['ndcpcRole'],
  merge: UserProfileData['ndcpcRole'],
  pick: MergeFieldPick,
): UserProfileData['ndcpcRole'] | undefined {
  if (pick === 'merge') return merge ?? undefined;
  if (survivor === 'admin' || merge === 'admin') return 'admin';
  return survivor ?? merge ?? undefined;
}

function omitUndefinedFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));
}

async function authUserExists(auth: Auth, uid: string): Promise<boolean> {
  try {
    await auth.getUser(uid);
    return true;
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/user-not-found') return false;
    throw error;
  }
}

function unionContactEmails(
  survivor: UserProfileData,
  merge: UserProfileData,
  primaryEmail: string | null,
): string[] {
  const emails = new Set<string>();
  for (const raw of [...(survivor.contactEmails ?? []), ...(merge.contactEmails ?? [])]) {
    const e = normalizeEmail(raw);
    if (e && e !== normalizeEmail(primaryEmail ?? '')) emails.add(e);
  }
  if (survivor.email) {
    const se = normalizeEmail(survivor.email);
    if (se !== normalizeEmail(primaryEmail ?? '')) emails.add(se);
  }
  if (merge.email) {
    const me = normalizeEmail(merge.email);
    if (me !== normalizeEmail(primaryEmail ?? '')) emails.add(me);
  }
  return Array.from(emails);
}

async function mergePassageArrays(
  db: Firestore,
  collection: string,
  survivorUid: string,
  mergeUid: string,
  pick: MergeFieldPick,
): Promise<void> {
  const survivorRef = db.collection(collection).doc(survivorUid);
  const mergeRef = db.collection(collection).doc(mergeUid);
  const [survivorSnap, mergeSnap] = await Promise.all([survivorRef.get(), mergeRef.get()]);

  const survivorPassages: string[] = survivorSnap.exists
    ? ((survivorSnap.data()?.completedPassages as string[]) ?? [])
    : [];
  const mergePassages: string[] = mergeSnap.exists
    ? ((mergeSnap.data()?.completedPassages as string[]) ?? [])
    : [];

  let merged: string[];
  if (pick === 'merge') merged = mergePassages;
  else if (pick === 'union' || pick === 'maxProgress') merged = pickUnionArrays(survivorPassages, mergePassages);
  else merged = survivorPassages;

  if (merged.length > 0 || survivorSnap.exists) {
    await survivorRef.set(
      {
        userId: survivorUid,
        completedPassages: merged,
        completedCount: merged.length,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  if (mergeSnap.exists) {
    await mergeRef.delete();
  }
}

async function reassignChats(
  db: Firestore,
  survivorUid: string,
  mergeUid: string,
  survivorProfile: UserProfileData,
): Promise<void> {
  const chatsSnap = await db.collection('chats').where('members', 'array-contains', mergeUid).get();
  const updates: Array<{ ref: FirebaseFirestore.DocumentReference; data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }> = [];

  for (const chatDoc of chatsSnap.docs) {
    const data = chatDoc.data();
    const members: string[] = Array.isArray(data.members) ? [...data.members] : [];
    const withoutMerge = members.filter((id) => id !== mergeUid);
    const nextMembers = withoutMerge.includes(survivorUid)
      ? withoutMerge
      : [...withoutMerge, survivorUid];

    const memberInfo = { ...(data.memberInfo ?? {}) };
    if (memberInfo[mergeUid]) {
      if (!memberInfo[survivorUid]) {
        memberInfo[survivorUid] = memberInfo[mergeUid];
      }
      delete memberInfo[mergeUid];
    } else if (!memberInfo[survivorUid]) {
      memberInfo[survivorUid] = {
        firstName: survivorProfile.firstName,
        lastName: survivorProfile.lastName,
        avatar: survivorProfile.avatar ?? DEFAULT_AVATAR_DATA,
      };
    }

    const admins: string[] = Array.isArray(data.admins) ? [...data.admins] : [];
    const nextAdmins = admins
      .filter((id) => id !== mergeUid)
      .concat(admins.includes(mergeUid) && !admins.includes(survivorUid) ? [survivorUid] : [])
      .filter((id, i, arr) => arr.indexOf(id) === i);

    updates.push({
      ref: chatDoc.ref,
      data: {
        members: nextMembers,
        memberInfo,
        admins: nextAdmins,
      },
    });
  }

  await commitUpdatesInChunks(db, updates);
}

async function reassignNotifications(db: Firestore, survivorUid: string, mergeUid: string): Promise<void> {
  const snap = await db.collection('notifications').where('userId', '==', mergeUid).limit(500).get();
  if (snap.empty) return;
  const updates = snap.docs.map((docSnap) => ({
    ref: docSnap.ref,
    data: { userId: survivorUid, updatedAt: FieldValue.serverTimestamp() },
  }));
  await commitUpdatesInChunks(db, updates);
}

async function reassignNdcpcVolunteerLinks(
  db: Firestore,
  survivorUid: string,
  mergeUid: string,
): Promise<void> {
  const snap = await db.collection('ndcpcVolunteers').where('userId', '==', mergeUid).limit(100).get();
  if (snap.empty) return;
  const updates = snap.docs.map((docSnap) => ({
    ref: docSnap.ref,
    data: { userId: survivorUid, updatedAt: FieldValue.serverTimestamp() },
  }));
  await commitUpdatesInChunks(db, updates);
}

export async function mergeUserAccounts(
  auth: Auth,
  db: Firestore,
  survivorUid: string,
  mergeUid: string,
  picksInput: MergeAccountPicks,
  archivedBy: string,
): Promise<{ survivorUid: string; mergedUid: string }> {
  if (survivorUid === mergeUid) {
    throw new Error('Choose two different accounts to merge.');
  }

  const picks = { ...DEFAULT_PICKS, ...picksInput };
  const survivorRef = db.collection('users').doc(survivorUid);
  const mergeRef = db.collection('users').doc(mergeUid);
  const [survivorSnap, mergeSnap] = await Promise.all([survivorRef.get(), mergeRef.get()]);

  if (!survivorSnap.exists || !mergeSnap.exists) {
    throw new Error('Both accounts must exist in Firestore.');
  }

  const survivor = survivorSnap.data() as UserProfileData;
  const merge = mergeSnap.data() as UserProfileData;

  const [survivorHasAuth, mergeHasAuth] = await Promise.all([
    authUserExists(auth, survivorUid),
    authUserExists(auth, mergeUid),
  ]);

  // Login must live on a Firebase Auth UID. If account A is Firestore-only (e.g. migrated
  // NDCPC profile), fold it into account B's Auth UID while still honoring A/B field picks.
  let canonicalUid = survivorUid;
  let absorbedUid = mergeUid;
  if (!survivorHasAuth && mergeHasAuth) {
    canonicalUid = mergeUid;
    absorbedUid = survivorUid;
  }

  const canonicalRef = db.collection('users').doc(canonicalUid);
  const absorbedRef = db.collection('users').doc(absorbedUid);
  const canonicalHasAuth = canonicalUid === survivorUid ? survivorHasAuth : mergeHasAuth;
  const absorbedHasAuth = absorbedUid === mergeUid ? mergeHasAuth : survivorHasAuth;

  const primaryEmailPick = picks.email === 'merge' ? merge.email : survivor.email;
  const primaryEmail = primaryEmailPick ? normalizeEmail(primaryEmailPick) : null;

  if (primaryEmail) {
    try {
      const existing = await auth.getUserByEmail(primaryEmail);
      if (existing.uid !== canonicalUid && existing.uid !== absorbedUid) {
        throw new Error('Merged login email is already used by another account.');
      }
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== 'auth/user-not-found') throw error;
    }
  }

  const mergedAccess = pickAccess(survivor.access, merge.access, picks.access);
  const hasNdcpc = mergedAccess?.ndcpc === true;
  const ndcpcRole = hasNdcpc
    ? pickNdcpcRole(survivor.ndcpcRole, merge.ndcpcRole, picks.ndcpcRole) ?? 'member'
    : undefined;

  const mergedProfile: Record<string, unknown> = omitUndefinedFields({
    firstName: pickValue(survivor.firstName, merge.firstName, picks.firstName),
    lastName: pickValue(survivor.lastName, merge.lastName, picks.lastName),
    email: primaryEmail ?? undefined,
    avatar: pickValue(survivor.avatar ?? DEFAULT_AVATAR_DATA, merge.avatar ?? DEFAULT_AVATAR_DATA, picks.avatar),
    roleIds:
      picks.roleIds === 'union'
        ? pickUnionArrays(survivor.roleIds ?? [], merge.roleIds ?? [])
        : pickValue(survivor.roleIds ?? [], merge.roleIds ?? [], picks.roleIds),
    isApproved: pickApproved(survivor.isApproved, merge.isApproved, picks.isApproved),
    access: mergedAccess,
    ndcpcRole,
    contactEmails:
      picks.contactEmails === 'union'
        ? unionContactEmails(survivor, merge, primaryEmail)
        : pickValue(survivor.contactEmails ?? [], merge.contactEmails ?? [], picks.contactEmails),
    legacyNdcpcUid: survivor.legacyNdcpcUid ?? merge.legacyNdcpcUid,
    migratedFrom: survivor.migratedFrom ?? merge.migratedFrom,
    fcmTokens: pickUnionArrays(survivor.fcmTokens ?? [], merge.fcmTokens ?? []),
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (!hasNdcpc) {
    mergedProfile.ndcpcRole = FieldValue.delete();
  }

  await canonicalRef.set(mergedProfile, { merge: true });
  await reconcileUserRoleState(db, canonicalUid, (mergedProfile.roleIds as string[]) ?? []);

  if (primaryEmail && canonicalHasAuth) {
    await auth.updateUser(canonicalUid, {
      email: primaryEmail,
      emailVerified: false,
      displayName: `${mergedProfile.firstName} ${mergedProfile.lastName}`,
    });
  }

  await mergePassageArrays(db, 'userBibleChecklists', canonicalUid, absorbedUid, picks.bibleChecklist);
  await mergePassageArrays(db, 'communityProgress', canonicalUid, absorbedUid, picks.communityProgress);
  await reassignChats(db, canonicalUid, absorbedUid, { ...survivor, ...mergedProfile } as UserProfileData);
  await reassignNotifications(db, canonicalUid, absorbedUid);
  await reassignNdcpcVolunteerLinks(db, canonicalUid, absorbedUid);

  await db
    .collection('migrationArchive')
    .doc('mergedUsers')
    .collection('records')
    .doc(absorbedUid)
    .set({
      survivorUid: canonicalUid,
      mergeUid: absorbedUid,
      requestedSurvivorUid: survivorUid,
      requestedMergeUid: mergeUid,
      payload: absorbedUid === mergeUid ? mergeSnap.data() : survivorSnap.data(),
      picks,
      archivedBy,
      archivedAt: FieldValue.serverTimestamp(),
    });

  await commitDeletesInChunks(db, [
    ...(absorbedUid !== canonicalUid ? [absorbedRef] : []),
    db.collection('userBibleChecklists').doc(absorbedUid),
    db.collection('communityProgress').doc(absorbedUid),
  ]);

  if (absorbedHasAuth && absorbedUid !== canonicalUid) {
    try {
      await auth.deleteUser(absorbedUid);
    } catch {
      // Auth user may already be gone.
    }
  }

  return { survivorUid: canonicalUid, mergedUid: absorbedUid };
}
