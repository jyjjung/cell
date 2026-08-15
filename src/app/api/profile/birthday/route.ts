import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { isValidIsoDate } from '@/lib/forms/profile-sync';
import { toDateInputValue } from '@/lib/forms/prefill';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const birthday = typeof body.birthday === 'string' ? body.birthday.trim() : '';
    if (!birthday || !isValidIsoDate(birthday)) {
      return NextResponse.json({ error: 'Invalid birthday (use yyyy-MM-dd)' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const uid = (await getAdminAuth(adminApp).verifyIdToken(token)).uid;
    const adminDb = getAdminDb(adminApp);

    await adminDb.collection('users').doc(uid).set(
      { birthday, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );

    const eventsSnap = await adminDb.collection('events').where('userId', '==', uid).limit(20).get();
    const existing = eventsSnap.docs.find((doc) => doc.data().category === 'Birthday');

    if (existing) {
      const currentDay = toDateInputValue(String(existing.data().date ?? ''));
      if (currentDay !== birthday) {
        await existing.ref.set(
          { date: birthday, updatedAt: FieldValue.serverTimestamp() },
          { merge: true },
        );
      }
    } else {
      const userSnap = await adminDb.collection('users').doc(uid).get();
      const firstName = userSnap.data()?.firstName || 'Member';
      await adminDb.collection('events').add({
        date: birthday,
        category: 'Birthday',
        title: `${firstName}'s Birthday`,
        userId: uid,
        allDay: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true, birthday });
  } catch (error) {
    console.error('[profile/birthday]', error);
    return NextResponse.json({ error: 'Failed to save birthday' }, { status: 500 });
  }
}
