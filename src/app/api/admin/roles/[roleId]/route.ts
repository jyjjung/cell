import { type NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { userHasAdminAccess } from '@/lib/server-admin-access';
import { normalizeRoleCapabilities, normalizeRoleScope } from '@/lib/role-capabilities';
import { reconcileRoleMembers, reconcileUserRoleState } from '@/lib/server-role-state';

async function getAuthorizedContext(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return null;
  const app = getAdminApp();
  const auth = getAdminAuth(app);
  const db = getAdminDb(app);
  const uid = (await auth.verifyIdToken(token)).uid;
  if (!(await userHasAdminAccess(db, uid))) return null;
  return { db, uid };
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ roleId: string }> }) {
  const params = await props.params;
  try {
    const context = await getAuthorizedContext(request);
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const roleRef = context.db.collection('roles').doc(params.roleId);
    const roleSnap = await roleRef.get();
    if (!roleSnap.exists) return NextResponse.json({ error: 'Role not found.' }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: context.uid,
    };
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 2) {
        return NextResponse.json({ error: 'Role name must be at least 2 characters.' }, { status: 400 });
      }
      updates.name = name;
    }
    if (body.capabilities !== undefined) {
      updates.capabilities = normalizeRoleCapabilities(body.capabilities);
    }
    if (body.appScope !== undefined) {
      updates.appScope = normalizeRoleScope(body.appScope);
    }
    await roleRef.update(updates);

    const assignedUsers = await context.db.collection('users').get();
    const affectedUsers = assignedUsers.docs.filter((userDoc) => {
      const data = userDoc.data();
      const cellIds = Array.isArray(data.roleIds) ? data.roleIds : [];
      const ndcpcIds = Array.isArray(data.ndcpcRoleIds) ? data.ndcpcRoleIds : [];
      return cellIds.includes(params.roleId) || ndcpcIds.includes(params.roleId);
    });
    for (const userDoc of affectedUsers) {
      await reconcileUserRoleState(context.db, userDoc.id);
    }

    const roleData = roleSnap.data()!;
    if (typeof roleData.chatId === 'string') {
      await reconcileRoleMembers(context.db, params.roleId);
    }
    return NextResponse.json({ success: true, reconciledUsers: affectedUsers.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not update role.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ roleId: string }> }) {
  const params = await props.params;
  try {
    const context = await getAuthorizedContext(request);
    if (!context) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const roleRef = context.db.collection('roles').doc(params.roleId);
    const roleSnap = await roleRef.get();
    if (!roleSnap.exists) return NextResponse.json({ error: 'Role not found.' }, { status: 404 });
    const role = roleSnap.data()!;

    const assignedUsers = await context.db.collection('users').get();
    const affectedUsers = assignedUsers.docs.filter((userDoc) => {
      const data = userDoc.data();
      const cellIds = Array.isArray(data.roleIds) ? data.roleIds : [];
      const ndcpcIds = Array.isArray(data.ndcpcRoleIds) ? data.ndcpcRoleIds : [];
      return cellIds.includes(params.roleId) || ndcpcIds.includes(params.roleId);
    });
    await roleRef.update({
      status: 'archived',
      capabilities: [],
      formerChatId: typeof role.chatId === 'string' ? role.chatId : null,
      chatId: FieldValue.delete(),
      archivedAt: FieldValue.serverTimestamp(),
      archivedBy: context.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const userDoc of affectedUsers) {
      await reconcileUserRoleState(context.db, userDoc.id);
    }

    // Role archive must not leave an orphan circle with stale members.
    if (typeof role.chatId === 'string') {
      const chatRef = context.db.collection('chats').doc(role.chatId);
      const chatSnap = await chatRef.get();
      if (chatSnap.exists) {
        await chatRef.update({
          members: [],
          memberInfo: {},
          admins: [],
          lastMessageText: 'Role archived — circle closed.',
          lastMessageSentAt: FieldValue.serverTimestamp(),
        });
      }
    }

    return NextResponse.json({ success: true, reconciledUsers: affectedUsers.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not archive role.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
