import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { getFormByPublicToken } from '@/lib/server-forms';

export async function GET(_request: NextRequest, { params }: { params: { publicToken: string } }) {
  try {
    const adminApp = getAdminApp();
    const adminDb = getAdminDb(adminApp);

    const form = await getFormByPublicToken(adminDb, params.publicToken);
    if (!form) return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    return NextResponse.json({ form });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

