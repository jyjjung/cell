import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth } from '@/lib/firebase-admin';

export async function verifyAuthToken(
  request: NextRequest,
): Promise<{ uid: string } | NextResponse> {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth(getAdminApp());
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }
}

export function isAuthError(result: { uid: string } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
