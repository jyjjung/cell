import {
  deleteField,
  doc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import type { NdcpcRole } from '@/lib/app-access';
import type { Volunteer } from '@/types/ndcpc-ported';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { normalizeName } from '@/lib/ndcpc/name-similarity';

export const NDCPC_BOOTSTRAP_ADMIN_EMAIL = 'yejoon7154@gmail.com';

type ProfileLike = {
  uid: string;
  email?: string;
  displayName?: string;
};

export function isNdcpcBootstrapAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === NDCPC_BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}

export function getLinkedVolunteer(
  profile: ProfileLike | null | undefined,
  volunteers: Volunteer[],
): Volunteer | undefined {
  if (!profile) return undefined;

  const uid = profile.uid;
  if (uid) {
    const byUid = volunteers.find((v) => v.userId === uid);
    if (byUid) return byUid;
  }

  const display = profile.displayName?.trim();
  if (!display) return undefined;

  const normalized = normalizeName(display);
  return volunteers.find((v) => normalizeName(v.name) === normalized);
}

export function getUnlinkedVolunteers(volunteers: Volunteer[]): Volunteer[] {
  return volunteers.filter((volunteer) => !volunteer.userId);
}

export async function setNdcpcUserRole(
  firestore: Firestore,
  uid: string,
  role: NdcpcRole,
): Promise<void> {
  await updateDoc(doc(firestore, 'users', uid), { ndcpcRole: role });
}

export async function updateMemberDisplayName(
  firestore: Firestore,
  uid: string,
  displayName: string,
  volunteers: Volunteer[],
): Promise<void> {
  const trimmed = displayName.trim();
  if (trimmed.length < 2) {
    throw new Error('Display name too short');
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? trimmed;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

  await updateDoc(doc(firestore, 'users', uid), { firstName, lastName });

  const linkedVolunteer = volunteers.find((volunteer) => volunteer.userId === uid);
  if (linkedVolunteer) {
    await updateDoc(doc(firestore, NDCPc_COLLECTIONS.volunteers, linkedVolunteer.id), {
      name: trimmed,
    });
  }
}

export async function linkUserToVolunteer(
  firestore: Firestore,
  profile: ProfileLike,
  volunteer: Volunteer,
  volunteers: Volunteer[],
): Promise<void> {
  if (volunteer.userId && volunteer.userId !== profile.uid) {
    throw new Error('Volunteer already linked to another account');
  }

  const existingLink = volunteers.find(
    (entry) => entry.userId === profile.uid && entry.id !== volunteer.id,
  );
  if (existingLink) {
    await updateDoc(doc(firestore, NDCPc_COLLECTIONS.volunteers, existingLink.id), {
      userId: deleteField(),
      email: deleteField(),
    });
  }

  await updateDoc(doc(firestore, NDCPc_COLLECTIONS.volunteers, volunteer.id), {
    userId: profile.uid,
    email: profile.email,
    name: profile.displayName?.trim() || volunteer.name,
  });
}

export async function unlinkUserFromVolunteer(
  firestore: Firestore,
  volunteer: Volunteer,
): Promise<void> {
  await updateDoc(doc(firestore, NDCPc_COLLECTIONS.volunteers, volunteer.id), {
    userId: deleteField(),
    email: deleteField(),
  });
}
