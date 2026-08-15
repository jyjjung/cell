/**
 * In-app product changelog (Keep a Changelog + SemVer).
 * Style: `.cursor/rules/changelog-on-push.mdc` — member-facing, benefit-first, short.
 * New releases: add an object at the top of `changelogs`.
 */
import type { ChangelogEntry } from '@/lib/changelog-types';

export const changelogs: ChangelogEntry[] = [
  {
    version: 'v1.14.0',
    subtitle: 'Preschool & Updates',
    date: 'August 15, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'You can adjust an existing profile photo (move and zoom), and photos no longer look removed when the installed app fails to load them briefly.',
      },
      {
        type: 'Fixed',
        text: '“Set up” notifications opens the Notifications settings tab, not your profile.',
      },
      {
        type: 'Added',
        text: 'Updates — what’s new and feedback, available to everyone.',
      },
      {
        type: 'Changed',
        text: 'Preschool Worship now has Rosters, Setlists, Resources, and Order in one place.',
      },
      {
        type: 'Fixed',
        text: 'Preschool chat shows the right profile pictures and the right people in each room.',
      },
      {
        type: 'Changed',
        text: 'New members land in Account first; after that, you return where you left off.',
      },
    ],
  },
  {
    version: 'v1.13.0',
    subtitle: 'Community Apps',
    date: 'August 14, 2026',
    changes: [
      {
        type: 'Added',
        text: 'One sign-in for em., NDC Preschool, Account, and Users.',
      },
      {
        type: 'Added',
        text: 'Switch apps anytime from the header.',
      },
      {
        type: 'Added',
        text: 'Account for your profile, look, and notifications; Users for approvals and access.',
      },
    ],
  },
  {
    version: 'v1.12.0',
    subtitle: 'Forms',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Create forms with deadlines, reminders, and shareable guest links.',
      },
      {
        type: 'Added',
        text: 'Admins can review answers and download reports; you can delete your own submissions.',
      },
      {
        type: 'Improved',
        text: 'Clearer questions and a thank-you screen after you submit.',
      },
    ],
  },
  {
    version: 'v1.10.0',
    subtitle: 'Roster reminders',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Custom rosters now send the same duty reminders as cleaning, QT, and worship.',
      },
      {
        type: 'Improved',
        text: 'Reading plan shows how far you are against what’s due today, plus a clearer streak calendar.',
      },
      {
        type: 'Improved',
        text: 'Unread badges count messages; setlist playback is more reliable.',
      },
    ],
  },
  {
    version: 'v1.8.0',
    subtitle: 'Reaction notifications',
    date: 'July 30, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Get a notification when someone reacts to your message.',
      },
      {
        type: 'Fixed',
        text: 'Photo viewer controls stay visible in light mode.',
      },
    ],
  },
  {
    version: 'v1.7.0',
    subtitle: 'Home & Inbox',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Home is one agenda by date — duties, events, and QT — with your days highlighted.',
      },
      {
        type: 'Changed',
        text: 'Announcements and notifications open from the bell in one Inbox.',
      },
      {
        type: 'Added',
        text: 'Ten Appearance themes, and a refreshed chat look.',
      },
    ],
  },
  {
    version: 'v1.3.0',
    subtitle: 'Docs',
    date: 'July 28, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Docs for personal and shared notes — edit richly and share from chat.',
      },
      {
        type: 'Fixed',
        text: 'Shared docs show up for everyone in the chat.',
      },
    ],
  },
  {
    version: 'v1.2.0',
    subtitle: 'Prayer & custom rosters',
    date: 'June 30, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Send private prayer requests to Shepherd Claire.',
      },
      {
        type: 'Added',
        text: 'Build custom rosters on Schedule with your own fields.',
      },
      {
        type: 'Added',
        text: 'Anyone in a group chat can update the group photo.',
      },
    ],
  },
  {
    version: 'v1.1.0',
    subtitle: 'Achievements',
    date: 'May 31, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Earn achievements and equip avatar halos.',
      },
      {
        type: 'Added',
        text: 'Appearance and settings sync across your devices.',
      },
    ],
  },
  {
    version: 'v1.0.0',
    subtitle: 'Launch',
    date: 'May 1, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Chat, Bible reading, schedule, worship tools, and member profiles.',
      },
    ],
  },
];
