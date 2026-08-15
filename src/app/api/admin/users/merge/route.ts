import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/server-admin-request';
import { mergeUserAccounts } from '@/lib/server-user-merge';
import type { MergeAccountPicks } from '@/types/user-admin';

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const body = await request.json();
  const survivorUid = typeof body.survivorUid === 'string' ? body.survivorUid : '';
  const mergeUid = typeof body.mergeUid === 'string' ? body.mergeUid : '';
  const picks = (body.picks ?? {}) as MergeAccountPicks;

  if (!survivorUid || !mergeUid) {
    return NextResponse.json({ error: 'survivorUid and mergeUid are required.' }, { status: 400 });
  }

  try {
    const result = await mergeUserAccounts(
      authResult.ctx.adminAuth,
      authResult.ctx.adminDb,
      survivorUid,
      mergeUid,
      picks,
      authResult.ctx.callerUid,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Merge failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
