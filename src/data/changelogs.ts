/**
 * In-app product changelog (Keep a Changelog + SemVer).
 *
 * Write like a product release note — not a commit diary:
 * - One entry per ship (bundle same-day / related work)
 * - Typically 3–8 user-facing bullets
 * - Skip internal refactors, reverts, and tiny polish unless users feel them
 *
 * SemVer: MAJOR breaking · MINOR features/bundles · PATCH fixes
 * New releases: add an object at the top of `changelogs`.
 */
import type { ChangelogEntry } from '@/lib/changelog-types';

export const changelogs: ChangelogEntry[] = [
  {
    version: 'v1.7.0',
    subtitle: 'Redesigned home',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Home now reads as one continuous page instead of a stack of separate boxes',
      },
      {
        type: 'Changed',
        text: 'Upcoming duties, events, and daily QT are combined into a single agenda grouped by date',
      },
      {
        type: 'Improved',
        text: 'The duties you are serving on are marked and styled so they stand out at a glance',
      },
      {
        type: 'Fixed',
        text: 'Turning on notifications in a browser that blocks the notification service worker now explains what went wrong instead of failing quietly',
      },
    ],
  },
  {
    version: 'v1.6.1',
    subtitle: 'Chat push delivery fixes',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Chat push requests that fail to deliver are reported as errors so the app can retry when possible',
      },
    ],
  },
  {
    version: 'v1.6.0',
    subtitle: 'Inbox sheet & clearer overlays',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Announcements and notifications open in an Inbox sheet from the bell instead of separate pages',
      },
      {
        type: 'Added',
        text: 'Unread and All filters in Inbox, with older history available under All',
      },
      {
        type: 'Improved',
        text: 'Sidebar, dialogs, and popups use a blurred backdrop instead of a solid dim',
      },
    ],
  },
  {
    version: 'v1.5.0',
    subtitle: 'Design refresh & chat Domain UI',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Ten Appearance themes with coordinated surfaces, accents, and status colours',
      },
      {
        type: 'Changed',
        text: 'Chat uses iMessage-style bubbles, a clearer list, and an outlined message composer',
      },
      {
        type: 'Improved',
        text: 'Buttons, inputs, tabs, and other controls follow a quieter shared design system',
      },
      {
        type: 'Improved',
        text: 'Chat cards for setlists, events, polls, docs, and rosters look consistent and scale with your font size',
      },
      {
        type: 'Fixed',
        text: 'Opening a chat lands on the latest messages',
      },
    ],
  },
  {
    version: 'v1.4.0',
    subtitle: 'Docs sync, performance & stability',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Documents shared in worship team and other role chats now appear on Docs for every current member',
      },
      {
        type: 'Fixed',
        text: 'Docs you can open (as owner or shared recipient) show in the list even when membership metadata was incomplete',
      },
      {
        type: 'Fixed',
        text: 'Avatars, signed-in first paint, and chat photo uploads work reliably again',
      },
      {
        type: 'Improved',
        text: 'Documents and the Docs list stay cached on device for faster open and offline-friendly browsing',
      },
      {
        type: 'Improved',
        text: 'Bible passages, Chat Photos, and worship tools load with less wasted work',
      },
    ],
  },
  {
    version: 'v1.3.0',
    subtitle: 'Docs, notifications & hardening',
    date: 'July 28, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Docs for personal and shared notes, with rich editing and share-from-chat',
      },
      {
        type: 'Added',
        text: 'Terms of Service, clearer error screens, and chat photo thumbnails for faster albums',
      },
      {
        type: 'Changed',
        text: 'React to announcements from the header bell; setlist alerts reach the right worship roster',
      },
      {
        type: 'Fixed',
        text: 'Push notifications, badges, and chat history are more reliable across devices',
      },
      {
        type: 'Improved',
        text: 'App startup, photo grids, and Bible caching feel snappier',
      },
      {
        type: 'Security',
        text: 'Private pages check a secure login cookie sooner; browser security headers and HTML sanitization for Bible and Docs',
      },
    ],
  },
  {
    version: 'v1.2.0',
    subtitle: 'Prayer, rosters & group photos',
    date: 'June 30, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Prayer Requests page for private submissions to Shepherd Claire',
      },
      {
        type: 'Added',
        text: 'Custom (Other) rosters on Schedule with flexible fields and role-based access',
      },
      {
        type: 'Changed',
        text: 'New EM branding, unified Look themes, and group chat photos anyone can update',
      },
      {
        type: 'Fixed',
        text: 'Members, leaderboard, chat, and profile photos load correctly on new devices',
      },
      {
        type: 'Improved',
        text: 'Shared data providers cut duplicate listeners; chat and home shell load faster',
      },
    ],
  },
  {
    version: 'v1.1.0',
    subtitle: 'Profile Look & achievements',
    date: 'May 31, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Profile tabs for Look, Rewards, and Settings — colors, fonts, glass, and synced preferences',
      },
      {
        type: 'Added',
        text: 'Achievements and equippable avatar halos',
      },
      {
        type: 'Changed',
        text: 'Liquid-glass visual system across headers, cards, dialogs, and forms',
      },
      {
        type: 'Improved',
        text: 'Chat and mobile performance: fewer listeners, lighter bubbles, cached media',
      },
    ],
  },
  {
    version: 'v1.0.0',
    subtitle: 'Cell Master',
    date: 'May 1, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Community hub: chat, Bible reading, schedule, worship tools, and member profiles',
      },
    ],
  },
];
