import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { FormDefinition } from '@/types/forms';
import type { UserProfileData } from '@/types';
import { sendUserNotification } from '@/lib/server-notifications';
import { listAccessibleFormRecipientUserIds } from '@/lib/server-forms';

export async function sendFormPublishedNotifications(params: {
  adminDb: Firestore;
  adminMessaging: Messaging;
  form: FormDefinition;
  users: UserProfileData[];
}): Promise<{ candidates: number; sent: number; skipped: number }> {
  const { adminDb, adminMessaging, form, users } = params;
  if (form.status !== 'published' || !form.publishVersion || form.publishVersion < 1) {
    return { candidates: 0, sent: 0, skipped: 0 };
  }

  const approvedUserIds = new Set(users.filter((u) => u.uid && u.isApproved !== false).map((u) => u.uid));
  const recipientIds = await listAccessibleFormRecipientUserIds(adminDb, form);
  let sent = 0;
  let skipped = 0;

  for (const userId of recipientIds) {
    if (!approvedUserIds.has(userId)) continue;
    const result = await sendUserNotification(adminDb, adminMessaging, {
      userId,
      title: 'New form available',
      message: form.deadlineDate
        ? `${form.title} is now available. Due ${form.deadlineDate}.`
        : `${form.title} is now available.`,
      relatedUrl: '/forms',
      dedupeId: `${userId}_form_publish_${form.id}_v${form.publishVersion}`,
      dedupeCollection: 'formPublishLog',
      type: 'reminder',
    });
    if (result === 'sent') sent++;
    else skipped++;
  }

  return { candidates: recipientIds.length, sent, skipped };
}

