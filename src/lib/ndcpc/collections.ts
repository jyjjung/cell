/** Firestore collection names for migrated NDCPC data on cell-abca4 */
export const NDCPc_COLLECTIONS = {
  volunteers: 'ndcpcVolunteers',
  schedules: 'ndcpcSchedules',
  announcements: 'ndcpcAnnouncements',
  prayerTopics: 'ndcpcPrayerTopics',
  resources: 'ndcpcResources',
  setlists: 'ndcpcSetlists',
  photos: 'ndcpcPhotos',
  chatMessages: 'ndcpcChatMessages',
  worshipFormats: 'ndcpcWorshipFormats',
  rosterReminders: 'ndcpcRosterReminders',
} as const;

export const NDCPc_WORSHIP_FORMAT_WEEKLY_ID = 'weekly';
