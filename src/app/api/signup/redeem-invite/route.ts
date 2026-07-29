import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { DEFAULT_INVITE_MAX_USES, normalizeInviteCode, normalizeInviteEmail, resolveInviteExpiresAtMs } from '@/lib/invite-utils';
import { deriveRoleState } from '@/lib/role-capabilities';
import { reconcileUserRoleState } from '@/lib/server-role-state';
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit';

const USERS_COLLECTION = 'users';
const INVITES_COLLECTION = 'invites';
const ROLES_COLLECTION = 'roles';

function inviteError(error: string, message: string, status: number) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`signup-redeem:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

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
    const roles = rolesSnap.docs.map((roleDoc) => ({
      id: roleDoc.id,
      capabilities: roleDoc.data().capabilities,
      status: roleDoc.data().status,
    }));

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
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
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
      const roleState = deriveRoleState(roleIds, roles);

      tx.update(userRef, {
        isApproved: true,
        roleIds: roleState.roleIds,
        capabilityKeys: roleState.capabilityKeys,
        roleSyncVersion: 1,
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

    await reconcileUserRoleState(adminDb, uid);
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
