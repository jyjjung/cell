import { type NextRequest, NextResponse } from 'next/server';
import { sendRosterReminders } from '@/lib/ndcpc/roster-reminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendRosterReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('NDCPC roster reminder cron failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'NDCPC roster reminder cron failed',
      },
      { status: 500 },
    );
  }
}
