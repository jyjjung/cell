import { birthdayOccursOnCommunityDate, eventOccursOnDate, parseDay } from '@/lib/event-occurrences';
import { userCanSeeEvent } from '@/lib/event-visibility';
import { EventCategory, type AppEvent, type UserProfileData } from '@/types';

export interface EventDayReminderPayload {
  userId: string;
  eventId: string;
  occurrenceDate: string;
  title: string;
  message: string;
  relatedUrl: string;
  dedupeId: string;
  /** Birthday alerts fan out as one global notification so delivery is consistent. */
  isGlobal?: boolean;
}

function formatEventTime(event: AppEvent): string {
  if (event.allDay) return 'All day';
  if (event.startTime) return event.startTime;
  return '';
}

function birthdayRelatedUrl(event: AppEvent): string {
  return event.userId ? `/members/${event.userId}` : '/events';
}

export function collectEventDayReminders(params: {
  todayIso: string;
  events: AppEvent[];
  users: UserProfileData[];
  timeZone?: string;
}): EventDayReminderPayload[] {
  const { todayIso, events, users, timeZone } = params;
  const today = parseDay(todayIso);
  const results: EventDayReminderPayload[] = [];

  for (const event of events) {
    if (!event.date) continue;

    let occurs = false;
    try {
      occurs =
        event.category === EventCategory.Birthday
          ? birthdayOccursOnCommunityDate(event, todayIso, timeZone)
          : eventOccursOnDate(event, today);
    } catch (error) {
      console.warn('[collectEventDayReminders] skipped event', event.id, error);
      continue;
    }

    if (!occurs) continue;

    const isBirthday = event.category === EventCategory.Birthday;
    const timeLabel = formatEventTime(event);
    const locationLabel = event.location ? ` at ${event.location}` : '';
    const message = isBirthday
      ? `${event.title} has a birthday today!`
      : timeLabel
        ? `${event.title} is today (${timeLabel})${locationLabel}.`
        : `${event.title} is today${locationLabel}.`;

    if (isBirthday) {
      // One global notification → single fan-out push to every device with tokens.
      results.push({
        userId: '',
        eventId: event.id,
        occurrenceDate: todayIso,
        title: 'Birthday today',
        message,
        relatedUrl: birthdayRelatedUrl(event),
        dedupeId: `global_event_${event.id}_${todayIso}_0d`,
        isGlobal: true,
      });
      continue;
    }

    const recipients = users.filter((user) => user.uid && userCanSeeEvent(user, event));

    for (const user of recipients) {
      results.push({
        userId: user.uid!,
        eventId: event.id,
        occurrenceDate: todayIso,
        title: 'Event today',
        message,
        relatedUrl: '/events',
        dedupeId: `${user.uid}_event_${event.id}_${todayIso}_0d`,
      });
    }
  }

  return results;
}
