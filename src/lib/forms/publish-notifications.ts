import type { Firestore } from 'firebase-admin/firestore';
import type { Messaging } from 'firebase-admin/messaging';
import type { FormDefinition } from '@/types/forms';
import { sendUserNotification } from '@/lib/server-notifications';
import {
  FORM_PUBLISH_NOTIFY_CAP,
  listAccessibleFormRecipientUserIds,
} from '@/lib/server-forms';

const SEND_CONCURRENCY = 8;

async function mapPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      await fn(current);
    }
  });
  await Promise.all(workers);
}

/**
 * Notify members when a form first becomes published (or publish version bumps).
 * Recipient resolution is capped — never scans the full users collection unbounded.
 */
export async function sendFormPublishedNotifications(params: {
  adminDb: Firestore;
  adminMessaging: Messaging;
  form: FormDefinition;
}): Promise<{ candidates: number; sent: number; skipped: number }> {
  const { adminDb, adminMessaging, form } = params;
  if (form.status !== 'published' || !form.publishVersion || form.publishVersion < 1) {
    return { candidates: 0, sent: 0, skipped: 0 };
  }

  const recipientIds = (await listAccessibleFormRecipientUserIds(adminDb, form)).slice(
    0,
    FORM_PUBLISH_NOTIFY_CAP,
  );

  let sent = 0;
  let skipped = 0;

  await mapPool(recipientIds, SEND_CONCURRENCY, async (userId) => {
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
  });

  return { candidates: recipientIds.length, sent, skipped };
}
