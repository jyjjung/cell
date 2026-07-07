import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { ADMIN_ROLE_NAMES } from '@/lib/admin-access';
import { DEFAULT_INVITE_MAX_USES, normalizeInviteCode, normalizeInviteEmail, resolveInviteExpiresAtMs } from '@/lib/invite-utils';

const USERS_COLLECTION = 'users';
const INVITES_COLLECTION = 'invites';
const ROLES_COLLECTION = 'roles';

function inviteError(error: string, message: string, status: number) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inviteCode = typeof body.inviteCode === 'string' ? normalizeInviteCode(body.inviteCode) : '';

    if (!inviteCode) {
      return inviteError('invalid_code', 'Invite code is required.', 400);
    }

    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return inviteError('unauthorized', 'Sign in is required to use an invite.', 401);
    }

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);

    let uid: string;
    let email: string | undefined;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
      email = decoded.email?.toLowerCase();
    } catch {
      return inviteError('unauthorized', 'Your session expired. Sign in and try again.', 401);
    }

    if (!email) {
      return inviteError('missing_email', 'Your account needs an email address to use this invite.', 400);
    }

    const userRef = adminDb.collection(USERS_COLLECTION).doc(uid);
    const inviteRef = adminDb.collection(INVITES_COLLECTION).doc(inviteCode);

    const rolesSnap = await adminDb.collection(ROLES_COLLECTION).get();
    const adminRoleIds = rolesSnap.docs
      .filter((doc) => ADMIN_ROLE_NAMES.includes(doc.data()?.name as typeof ADMIN_ROLE_NAMES[number]))
      .map((doc) => doc.id);

    const result = await adminDb.runTransaction(async (tx) => {
      const [userSnap, inviteSnap] = await Promise.all([tx.get(userRef), tx.get(inviteRef)]);

      if (!userSnap.exists) {
        throw new Error('USER_NOT_FOUND');
      }

      const user = userSnap.data()!;
      if (user.isApproved) {
        return { alreadyApproved: true as const };
      }

      if (!inviteSnap.exists) {
        throw new Error('INVITE_NOT_FOUND');
      }

      const invite = inviteSnap.data()!;
      const maxUses = typeof invite.maxUses === 'number' && invite.maxUses > 0
        ? invite.maxUses
        : DEFAULT_INVITE_MAX_USES;
      const useCount = typeof invite.useCount === 'number' ? invite.useCount : 0;

      if (useCount >= maxUses) {
        throw new Error('INVITE_USED');
      }

      const expiresAtMs = resolveInviteExpiresAtMs({
        expiresAt: invite.expiresAt as { toMillis?: () => number } | undefined,
        createdAt: invite.createdAt as { toMillis?: () => number } | undefined,
      });
      if (expiresAtMs && expiresAtMs <= Date.now()) {
        throw new Error('INVITE_EXPIRED');
      }

      const allowedEmail = typeof invite.allowedEmail === 'string'
        ? normalizeInviteEmail(invite.allowedEmail)
        : null;
      if (allowedEmail && allowedEmail !== normalizeInviteEmail(email!)) {
        throw new Error('INVITE_EMAIL_MISMATCH');
      }

      const roleIds: string[] = Array.isArray(invite.roles) ? invite.roles : [];
      const hasAdminRole = roleIds.some((id) => adminRoleIds.includes(id));

      tx.update(userRef, {
        isApproved: true,
        roleIds,
        isAdmin: hasAdminRole,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.update(inviteRef, {
        useCount: useCount + 1,
        usedBy: FieldValue.arrayUnion(uid),
        lastUsedAt: FieldValue.serverTimestamp(),
      });

      return { alreadyApproved: false as const };
    });

    if (result.alreadyApproved) {
      return NextResponse.json({ success: true, alreadyApproved: true });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : 'UNKNOWN';

    if (code === 'USER_NOT_FOUND') {
      return inviteError('user_not_found', 'Account not found.', 404);
    }
    if (code === 'INVITE_NOT_FOUND') {
      return inviteError('invite_not_found', 'This invite link is invalid.', 404);
    }
    if (code === 'INVITE_USED') {
      return inviteError('invite_used', 'This invite link has already been used.', 409);
    }
    if (code === 'INVITE_EXPIRED') {
      return inviteError('invite_expired', 'This invite link has expired.', 410);
    }
    if (code === 'INVITE_EMAIL_MISMATCH') {
      return inviteError(
        'invite_email_mismatch',
        'This invite is locked to a different email address.',
        403,
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[signup/redeem-invite]', message);
    return NextResponse.json({ error: 'internal_error', message: 'Could not redeem invite.' }, { status: 500 });
  }
}
