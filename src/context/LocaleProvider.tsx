'use client';

import { useAuth } from '@/contexts/auth-context';

const LABELS: Record<string, string> = {
  'nav.home': 'Home',
  'nav.announcements': 'Announcements',
  'nav.prayer': 'Prayer',
  'nav.chat': 'Chat',
  'nav.photos': 'Photos',
  'nav.setlist': 'Setlist',
  'nav.resources': 'Resources',
  'nav.roster': 'Roster',
  'nav.schedule': 'Worship order',
  'nav.admin': 'Admin',
  'nav.settings': 'Settings',
  'dashboard.upcoming': 'Upcoming Sunday',
  'dashboard.service': 'Service',
  'dashboard.setlist': 'Setlist',
  'dashboard.viewAll': 'View all',
  'dashboard.noSetlist': 'No setlist for this week yet.',
  'common.add': 'Add',
  'common.empty': 'Nothing here yet.',
  'common.offline': 'You appear to be offline.',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.delete': 'Delete',
  'toast.deleted': 'Deleted',
  'toast.couldntDelete': 'Could not delete',
  'toast.saved': 'Saved',
  'toast.couldntSave': 'Could not save',
  'schedules.volunteers': 'Volunteers',
  'schedules.add': 'Add roster',
  'service.step.freePlay': 'Free play',
  'service.step.worshipPrayer': 'Worship & prayer',
  'service.step.snack': 'Snack',
  'service.step.offeringPrayer': 'Offering & prayer',
  'service.step.sermonActivity': 'Sermon & activity',
  'service.step.chant': 'Chant',
  'service.step.specialActivity': 'Special activity',
  'chat.placeholder': 'Message the team…',
  'chat.empty': 'No messages yet. Say hello!',
  'chat.offline': 'You are offline. Messages will be available when you reconnect.',
  'chat.cancelReply': 'Cancel reply',
  'chat.today': 'Today',
  'chat.yesterday': 'Yesterday',
  'chat.replyingTo': 'Replying to {name}',
  'chat.send': 'Send',
  'chat.team': 'Team chat',
  'chat.roleChats': 'Role chats',
  'common.date': 'Date',
  'common.posted': 'Posted',
  'common.saved': 'Saved',
  'schedules.dateRequired': 'Pick a Sunday',
  'schedules.selectSunday': 'Select a Sunday',
  'schedules.selectPerson': 'Select a person',
  'schedules.none': 'None',
  'schedules.saveSchedule': 'Save roster',
  'schedules.role.worship': 'Worship',
  'schedules.role.offering': 'Offering',
  'schedules.role.sermon': 'Sermon',
  'schedules.role.chant': 'Chant',
  'schedules.role.activity': 'Activity',
  'announcements.add': 'New announcement',
  'prayer.add': 'Add prayer topic',
  'photos.upload': 'Upload photo',
  'resources.add': 'Add resource',
  'setlist.title': 'Weekly setlist',
  'roster.title': 'Volunteer roster',
  'dashboard.yourDuties': 'Your upcoming duties',
  'dashboard.noDuties': 'No roster assignments in the next few weeks.',
  'toast.couldntPost': 'Could not post message',
  'toast.couldntAdd': 'Could not add',
  'common.added': 'Added',
  'common.adding': 'Adding…',
  'common.saving': 'Saving…',
  'common.create': 'Create',
  'common.edit': 'Edit',
  'common.remove': 'Remove',
  'chat.react': 'React',
  'chat.reply': 'Reply',
  'chat.delete': 'Delete',
  'chat.messageDeleted': 'Message deleted',
  'adminPortal.accessDenied': 'You do not have access to this page.',
  'adminPortal.pageHint': 'Manage roster links and NDC Preschool admin roles.',
  'adminPortal.manageTitle': 'Member & roster links',
  'adminPortal.manageHint': 'Link approved NDC Preschool accounts to roster volunteers.',
  'adminPortal.noMembers': 'No NDC Preschool members yet.',
  'adminPortal.nameUpdated': 'Name updated',
  'adminPortal.linked': 'Linked to roster',
  'adminPortal.unlinked': 'Unlinked from roster',
  'adminPortal.linkedTo': 'Linked to {name}',
  'adminPortal.notLinked': 'Not linked to a roster name',
  'adminPortal.editName': 'Edit name',
  'adminPortal.unlinkRoster': 'Unlink roster',
  'adminPortal.linkRoster': 'Link roster',
  'adminPortal.editNameTitle': 'Edit display name',
  'adminPortal.editNameHint': 'Updates the member name and linked roster entry.',
  'adminPortal.linkRosterTitle': 'Link to roster',
  'adminPortal.linkRosterHint': 'Choose a roster volunteer for {name}.',
  'adminPortal.selectRosterMember': 'Select roster member',
  'adminPortal.membersTitle': 'Admin roles',
  'adminPortal.membersHint': 'Promote or demote NDC Preschool admins.',
  'adminPortal.superAdmin': 'Super admin',
  'adminPortal.makeAdmin': 'Make admin',
  'adminPortal.removeAdmin': 'Remove admin',
  'adminPortal.madeAdmin': 'Admin role granted',
  'adminPortal.removedAdmin': 'Admin role removed',
  'auth.displayName': 'Display name',
};

export type TranslationKey = keyof typeof LABELS | string;

export function useTranslation() {
  const { currentUser } = useAuth();
  const locale = (currentUser?.preferredLanguage === 'ko' ? 'ko' : 'en') as 'en' | 'ko';
  const t = (key: TranslationKey, params?: Record<string, string | number> | string) => {
    if (typeof params === 'string') return LABELS[key] ?? params;
    let text = LABELS[key] ?? String(key).split('.').pop() ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  };
  return { t, locale };
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
