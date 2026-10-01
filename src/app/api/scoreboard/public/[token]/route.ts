import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';

const LINKS_COLLECTION = 'scoreboardLinks';
const TEAMS_COLLECTION = 'scoreboardTeams';

type LinkData = { kind?: unknown };

async function getLink(token: string) {
  const db = getAdminDb(getAdminApp());
  const link = await db.collection(LINKS_COLLECTION).doc(token).get();
  if (!link.exists) return null;
  const data = link.data() as LinkData;
  return { db, canEdit: data.kind === 'edit' };
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await props.params;
    const link = await getLink(token);
    if (!link) return NextResponse.json({ error: 'Scoreboard link not found' }, { status: 404 });

    const snapshot = await link.db.collection(TEAMS_COLLECTION).orderBy('createdAt', 'asc').get();
    return NextResponse.json({
      canEdit: link.canEdit,
      teams: snapshot.docs.map((team) => {
        const data = team.data();
        return {
          id: team.id,
          name: typeof data.name === 'string' ? data.name : 'Unnamed team',
          points: typeof data.points === 'number' ? data.points : 0,
        };
      }),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load public scoreboard:', error);
    return NextResponse.json({ error: 'Could not load scoreboard' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await props.params;
    const link = await getLink(token);
    if (!link) return NextResponse.json({ error: 'Scoreboard link not found' }, { status: 404 });
    if (!link.canEdit) return NextResponse.json({ error: 'This scoreboard link is read-only' }, { status: 403 });

    const body = await request.json() as { teamId?: unknown; delta?: unknown };
    const delta = body.delta;
    if (
      typeof body.teamId !== 'string'
      || typeof delta !== 'number'
      || !Number.isInteger(delta)
      || ![-10, -5, -1, 1, 5, 10].includes(delta)
    ) {
      return NextResponse.json({ error: 'Invalid score update' }, { status: 400 });
    }

    const teamRef = link.db.collection(TEAMS_COLLECTION).doc(body.teamId);
    await link.db.runTransaction(async (transaction) => {
      const team = await transaction.get(teamRef);
      if (!team.exists) throw new Error('Team not found');
      transaction.update(teamRef, {
        points: FieldValue.increment(delta),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Team not found') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    console.error('Could not update public scoreboard:', error);
    return NextResponse.json({ error: 'Could not update scoreboard' }, { status: 500 });
  }
}
