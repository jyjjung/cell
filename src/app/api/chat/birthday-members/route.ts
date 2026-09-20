import { type NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { hasCapability } from '@/lib/role-capabilities';
import { resolveAvatarForApp } from '@/lib/user-avatars';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import type { ChatMemberInfo, UserProfileData } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminApp = getAdminApp();
    const adminAuth = getAdminAuth(adminApp);
    const adminDb = getAdminDb(adminApp);
    const uid = (await adminAuth.verifyIdToken(token)).uid;
    const callerSnap = await adminDb.collection('users').doc(uid).get();
    const caller = callerSnap.data() as UserProfileData | undefined;

    if (
      !callerSnap.exists ||
      !caller ||
      (!hasCapability(caller.capabilityKeys, 'app.admin') &&
        !hasCapability(caller.capabilityKeys, 'birthday.chat'))
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { chatId?: unknown; expiresAt?: unknown };
    if (typeof body.chatId !== 'string' || !body.chatId) {
      return NextResponse.json({ error: 'Chat ID is required.' }, { status: 400 });
    }

    const chatRef = adminDb.collection('chats').doc(body.chatId);
    const [chatSnap, usersSnap] = await Promise.all([
      chatRef.get(),
      adminDb.collection('users').get(),
    ]);
    if (!chatSnap.exists || chatSnap.data()?.kind !== 'birthday') {
      return NextResponse.json({ error: 'Birthday chat not found.' }, { status: 404 });
    }

    const chat = chatSnap.data() as {
      members?: string[];
      memberInfo?: Record<string, ChatMemberInfo>;
      memberSeen?: Record<string, unknown>;
      memberUnreadCount?: Record<string, number>;
      birthdayPersonId?: string;
      expiresAt?: FirebaseFirestore.Timestamp;
    };
    const requestedExpiresAt =
      typeof body.expiresAt === 'string' ? new Date(body.expiresAt) : null;
    if (requestedExpiresAt && Number.isNaN(requestedExpiresAt.getTime())) {
      return NextResponse.json({ error: 'Invalid expiry time.' }, { status: 400 });
    }
    if (chat.expiresAt && chat.expiresAt.toMillis() <= Date.now() && !requestedExpiresAt) {
      return NextResponse.json({ error: 'Birthday chat has expired.' }, { status: 410 });
    }

    const eligibleProfiles = usersSnap.docs
      .map((doc) => doc.data() as UserProfileData)
      .filter(
        (profile) =>
          profile.isApproved &&
          hasCapability(profile.capabilityKeys, 'birthday.chat'),
      );
    const birthdayPerson = chat.birthdayPersonId
      ? (usersSnap.docs.find((doc) => doc.id === chat.birthdayPersonId)?.data() as UserProfileData | undefined)
      : undefined;
    const profiles = birthdayPerson
      ? [...eligibleProfiles, birthdayPerson]
      : eligibleProfiles;
    const uniqueProfiles = profiles.filter(
      (profile, index, all) => all.findIndex((item) => item.uid === profile.uid) === index,
    );
    const existingMembers = Array.isArray(chat.members) ? chat.members : [];
    const missingProfiles = uniqueProfiles.filter((profile) => !existingMembers.includes(profile.uid));
    const shouldUpdateExpiry =
      requestedExpiresAt !== null &&
      requestedExpiresAt.getTime() > Date.now() &&
      (!chat.expiresAt || requestedExpiresAt.getTime() !== chat.expiresAt.toMillis());

    if (missingProfiles.length === 0 && !shouldUpdateExpiry) {
      return NextResponse.json({ success: true, added: 0 });
    }

    const memberInfo = { ...(chat.memberInfo ?? {}) };
    const memberSeen = { ...(chat.memberSeen ?? {}) };
    const memberUnreadCount = { ...(chat.memberUnreadCount ?? {}) };
    for (const profile of missingProfiles) {
      memberInfo[profile.uid] = {
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        avatar: resolveAvatarForApp(profile, 'cell') || DEFAULT_AVATAR_DATA,
      };
      memberSeen[profile.uid] = new Date(0);
      memberUnreadCount[profile.uid] = 0;
    }

    await chatRef.update({
      ...(missingProfiles.length > 0
        ? {
            members: [...existingMembers, ...missingProfiles.map((profile) => profile.uid)],
            memberInfo,
            memberSeen,
            memberUnreadCount,
          }
        : {}),
      ...(shouldUpdateExpiry ? { expiresAt: requestedExpiresAt } : {}),
    });

    return NextResponse.json({
      success: true,
      added: missingProfiles.length,
      expiryUpdated: shouldUpdateExpiry,
    });
  } catch (error) {
    console.error('[api/chat/birthday-members]', error);
    return NextResponse.json({ error: 'Could not update birthday chat members.' }, { status: 500 });
  }
}
