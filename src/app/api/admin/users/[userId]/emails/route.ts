import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/server-admin-request';
import {
  addContactEmail,
  changePrimaryEmail,
  promoteContactEmailToPrimary,
  removeContactEmail,
} from '@/lib/server-user-emails';

type RouteContext = { params: Promise<{ userId: string }> };

/** Change login email (Firebase Auth + profile). */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { userId } = await context.params;
  const body = await request.json();
  const email = typeof body.email === 'string' ? body.email : '';

  try {
    await changePrimaryEmail(authResult.ctx.adminAuth, authResult.ctx.adminDb, userId, email);
    return NextResponse.json({ success: true, email: email.trim().toLowerCase() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update email.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Add a contact email to the profile. */
export async function POST(request: NextRequest, context: RouteContext) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { userId } = await context.params;
  const body = await request.json();
  const email = typeof body.email === 'string' ? body.email : '';
  const action = typeof body.action === 'string' ? body.action : 'add';

  try {
    if (action === 'promote') {
      await promoteContactEmailToPrimary(authResult.ctx.adminAuth, authResult.ctx.adminDb, userId, email);
      return NextResponse.json({ success: true });
    }

    const contactEmails = await addContactEmail(authResult.ctx.adminDb, userId, email);
    return NextResponse.json({ success: true, contactEmails });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add email.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** Remove a contact email, or clear login email when `replacementEmail` is provided. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { userId } = await context.params;
  const body = await request.json();
  const email = typeof body.email === 'string' ? body.email : '';
  const target = typeof body.target === 'string' ? body.target : 'contact';

  try {
    if (target === 'primary') {
      const replacement = typeof body.replacementEmail === 'string' ? body.replacementEmail : '';
      if (!replacement) {
        return NextResponse.json(
          { error: 'Provide replacementEmail when removing the login email.' },
          { status: 400 },
        );
      }
      await changePrimaryEmail(authResult.ctx.adminAuth, authResult.ctx.adminDb, userId, replacement);
      if (email) {
        await removeContactEmail(authResult.ctx.adminDb, userId, email);
      }
      return NextResponse.json({ success: true });
    }

    const contactEmails = await removeContactEmail(authResult.ctx.adminDb, userId, email);
    return NextResponse.json({ success: true, contactEmails });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove email.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
