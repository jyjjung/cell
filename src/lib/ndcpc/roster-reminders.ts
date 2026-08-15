import { addDays, format, startOfDay } from 'date-fns';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { SCHEDULE_ROLE_KEYS, type ScheduleRoleKey } from '@/lib/ndcpc/schedule-roles';
import { NDCPc_COLLECTIONS } from '@/lib/ndcpc/collections';
import { ndcpcAccountDisplayName } from '@/lib/ndcpc/account-name';
import { normalizeName } from '@/lib/ndcpc/name-similarity';
import { getAdminApp, getAdminDb, getAdminMessaging } from '@/lib/firebase-admin';
import { hasAssignedNdcpcAccess } from '@/lib/app-access';

const ROLE_LABELS: Record<ScheduleRoleKey, string> = {
  worship: 'Worship',
  offering: 'Offering',
  sermon: 'Sermon',
  chant: 'Chant',
  activity: 'Activity',
};

type UserRecord = {
  uid: string;
  displayName: string;
  isApproved?: boolean;
  access?: { cell?: boolean; ndcpc?: boolean };
  ndcpcRoleIds?: string[];
  fcmTokens?: string[];
  preferences?: { notifications?: { ndcpc?: { rosterReminders?: boolean } } };
};

export type RosterReminderResult = {
  targetDate: string;
  schedulesChecked: number;
  remindersSent: number;
  skippedNoUser: number;
  skippedNoTokens: number;
  skippedAlreadySent: number;
  skippedOptOut: number;
};

export async function sendRosterReminders(): Promise<RosterReminderResult> {
  const adminApp = getAdminApp();
  const db = getAdminDb(adminApp);
  const messaging = getAdminMessaging(adminApp);
  const targetDate = startOfDay(addDays(new Date(), 7));
  const nextDay = startOfDay(addDays(targetDate, 1));

  const schedulesSnap = await db
    .collection(NDCPc_COLLECTIONS.schedules)
    .where('date', '>=', Timestamp.fromDate(targetDate))
    .where('date', '<', Timestamp.fromDate(nextDay))
    .get();

  const usersSnap = await db.collection('users').get();
  const usersByName = new Map<string, UserRecord>();

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const displayName = ndcpcAccountDisplayName({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    });
    if (!displayName) continue;
    if (!hasAssignedNdcpcAccess({
      access: data.access,
      ndcpcRoleIds: data.ndcpcRoleIds,
    })) continue;

    usersByName.set(normalizeName(displayName), {
      uid: doc.id,
      displayName,
      isApproved: data.isApproved === true,
      access: data.access,
      ndcpcRoleIds: data.ndcpcRoleIds,
      fcmTokens: data.fcmTokens,
      preferences: data.preferences,
    });
  }

  const result: RosterReminderResult = {
    targetDate: format(targetDate, 'yyyy-MM-dd'),
    schedulesChecked: schedulesSnap.size,
    remindersSent: 0,
    skippedNoUser: 0,
    skippedNoTokens: 0,
    skippedAlreadySent: 0,
    skippedOptOut: 0,
  };

  const dateLabel = format(targetDate, 'MMMM d, yyyy');

  for (const scheduleDoc of schedulesSnap.docs) {
    const schedule = scheduleDoc.data();

    for (const role of SCHEDULE_ROLE_KEYS) {
      const assignedName = (schedule[role] as string | undefined)?.trim();
      if (!assignedName) continue;

      const user = usersByName.get(normalizeName(assignedName));
      if (!user) {
        result.skippedNoUser += 1;
        continue;
      }

      const reminderId = `${scheduleDoc.id}_${user.uid}_${role}`;
      const existing = await db.collection(NDCPc_COLLECTIONS.rosterReminders).doc(reminderId).get();
      if (existing.exists) {
        result.skippedAlreadySent += 1;
        continue;
      }

      if (user.isApproved !== true) {
        result.skippedNoUser += 1;
        continue;
      }

      const rosterPref = user.preferences?.notifications?.ndcpc?.rosterReminders;
      if (rosterPref === false) {
        result.skippedOptOut += 1;
        continue;
      }

      const tokens = [...new Set(user.fcmTokens ?? [])]
        .filter(Boolean)
        .slice(0, 5);

      if (tokens.length === 0) {
        result.skippedNoTokens += 1;
        continue;
      }

      const body = `You're on the roster for ${dateLabel} (${ROLE_LABELS[role]}).`;

      for (let index = 0; index < tokens.length; index += 500) {
        const chunk = tokens.slice(index, index + 500);
        await messaging.sendEachForMulticast({
          tokens: chunk,
          notification: {
            title: 'Upcoming roster · NDC Preschool Church',
            body,
          },
          data: {
            url: '/ndcpc/worship?tab=roster',
          },
          webpush: {
            fcmOptions: {
              link: '/ndcpc/worship?tab=roster',
            },
          },
        });
      }

      await db.collection(NDCPc_COLLECTIONS.rosterReminders).doc(reminderId).set({
        scheduleId: scheduleDoc.id,
        userId: user.uid,
        volunteerName: assignedName,
        role,
        serviceDate: schedule.date,
        sentAt: FieldValue.serverTimestamp(),
      });

      result.remindersSent += 1;
    }
  }

  return result;
}
