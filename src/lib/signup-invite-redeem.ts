import { auth } from '@/lib/firebase';
import { normalizeInviteCode } from '@/lib/invite-utils';

export type RedeemInviteResult =
  | { ok: true }
  | { ok: false; error: string; message: string };

export async function redeemSignupInvite(inviteCode: string): Promise<RedeemInviteResult> {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
    if (!token) {
      return { ok: false, error: 'not_authenticated', message: 'Could not verify your account.' };
    }

    const response = await fetch('/api/signup/redeem-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ inviteCode: normalizeInviteCode(inviteCode) }),
    });

    if (response.ok) {
      return { ok: true };
    }

    const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
    return {
      ok: false,
      error: data.error || 'redeem_failed',
      message: data.message || 'This invite link is no longer valid.',
    };
  } catch (error) {
    console.error('[redeemSignupInvite]', error);
    return {
      ok: false,
      error: 'network_error',
      message: 'Could not verify the invite link. Try again or contact an admin.',
    };
  }
}
