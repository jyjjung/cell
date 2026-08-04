import { differenceInCalendarDays, format } from 'date-fns';
import type { Firestore } from 'firebase-admin/firestore';
import { parseDay } from '@/lib/event-occurrences';
import type { UserProfileData } from '@/types';
import type { FormDefinition } from '@/types/forms';
import { listAccessibleFormRecipientUserIds, listSubmittedUserIdsForForm } from '@/lib/server-forms';

export interface FormReminderPayload {
  userId: string;
  formId: string;
  title: string;
  message: string;
  relatedUrl: string;
  dedupeId: string;
}

function formatDisplayDate(isoDate: string): string {
  return format(parseDay(isoDate), 'EEE, MMM d');
}

function buildReminderTitle(formTitle: string, daysUntil: number): string {
  if (daysUntil === 7) return `${formTitle} due in one week`;
  if (daysUntil === 1) return `${formTitle} due tomorrow`;
  return `${formTitle} due today`;
}

function buildReminderMessage(formTitle: string, deadlineDate: string, daysUntil: number): string {
  const displayDate = formatDisplayDate(deadlineDate);
  if (daysUntil === 7) return `${formTitle} is due in one week — ${displayDate}.`;
  if (daysUntil === 1) return `${formTitle} is due tomorrow — ${displayDate}.`;
  return `${formTitle} is due today — ${displayDate}.`;
}

export async function collectFormDeadlineReminders(params: {
  adminDb: Firestore;
  todayIso: string;
  forms: FormDefinition[];
  users: UserProfileData[];
}): Promise<FormReminderPayload[]> {
  const { adminDb, todayIso, forms, users } = params;
  const approvedUserIds = new Set(users.filter((u) => u.uid && u.isApproved !== false).map((u) => u.uid));
  const reminders: FormReminderPayload[] = [];

  for (const form of forms) {
    if (form.status !== 'published' || !form.deadlineDate) continue;
    const daysUntil = differenceInCalendarDays(parseDay(form.deadlineDate), parseDay(todayIso));
    if (![7, 1, 0].includes(daysUntil)) continue;

    const [allowedUserIds, submittedUserIds] = await Promise.all([
      listAccessibleFormRecipientUserIds(adminDb, form),
      listSubmittedUserIdsForForm(adminDb, form.id),
    ]);

    for (const userId of allowedUserIds) {
      if (!approvedUserIds.has(userId)) continue;
      if (submittedUserIds.has(userId)) continue;
      reminders.push({
        userId,
        formId: form.id,
        title: buildReminderTitle(form.title, daysUntil),
        message: buildReminderMessage(form.title, form.deadlineDate, daysUntil),
        relatedUrl: '/forms',
        dedupeId: `${userId}_form_${form.id}_${form.deadlineDate}_${daysUntil}d`,
      });
    }
  }

  return reminders;
}

