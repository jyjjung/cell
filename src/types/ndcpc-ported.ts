/** Type aliases for ported NDCPC-main components (keeps Cell types separate). */
export type {
  NdcpcSchedule as Schedule,
  NdcpcAnnouncement as Announcement,
  NdcpcChatMessage as ChatMessage,
  NdcpcResource as Resource,
  NdcpcSetlist as Setlist,
  NdcpcVolunteer as Volunteer,
  NdcpcPhoto as Photo,
  NdcpcPrayerTopic as PrayerTopic,
  NdcpcWorshipFormatItem as WorshipFormatItem,
  NdcpcChatReplyTo as ChatReplyTo,
  NdcpcWorshipFormat as WorshipFormat,
} from '@/types';

export type UserProfile = {
  displayName?: string;
};
