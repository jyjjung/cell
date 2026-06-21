import { format } from 'date-fns';
import { eventOccursOnDate, parseDay } from '@/lib/event-occurrences';
import { EventCategory, type AppEvent, type UserProfileData } from '@/types';

export interface EventDayReminderPayload {
  userId: string;
  eventId: string;
  occurrenceDate: string;
  title: string;
  message: string;
  relatedUrl: string;
  dedupeId: string;
}

function userCanSeeEvent(user: UserProfileData, event: AppEvent): boolean {
  if (!event.allowedRoleIds?.length) return true;
  const userRoles = user.roleIds ?? [];
  return event.allowedRoleIds.some((roleId) => userRoles.includes(roleId));
}

function formatEventTime(event: AppEvent): string {
  if (event.allDay) return 'All day';
  if (event.startTime) return event.startTime;
  return '';
}

export function collectEventDayReminders(params: {
  todayIso: string;
  events: AppEvent[];
  users: UserProfileData[];
}): EventDayReminderPayload[] {
  const { todayIso, events, users } = params;
  const today = parseDay(todayIso);
  const results: EventDayReminderPayload[] = [];

  for (const event of events) {
    if (!eventOccursOnDate(event, today)) continue;

    const isBirthday = event.category === EventCategory.Birthday;
    const timeLabel = formatEventTime(event);
    const locationLabel = event.location ? ` at ${event.location}` : '';
    const message = isBirthday
      ? `${event.title} has a birthday today!`
      : timeLabel
        ? `${event.title} is today (${timeLabel})${locationLabel}.`
        : `${event.title} is today${locationLabel}.`;

    for (const user of users) {
      if (!user.uid) continue;
      if (!userCanSeeEvent(user, event)) continue;

      results.push({
        userId: user.uid,
        eventId: event.id,
        occurrenceDate: todayIso,
        title: isBirthday ? 'Birthday today' : 'Event today',
        message,
        relatedUrl: '/events',
        dedupeId: `${user.uid}_event_${event.id}_${todayIso}_0d`,
      });
    }
  }

  return results;
}

export function formatTodayLabel(todayIso: string): string {
  return format(parseDay(todayIso), 'EEE, MMM d');
}
