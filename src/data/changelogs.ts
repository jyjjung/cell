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
    version: 'v1.9.6',
    subtitle: 'Reading streak heatmap',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'The reading streak heatmap fills the card with square days across the plan window',
      },
      {
        type: 'Changed',
        text: 'Days before the plan and upcoming days are shaded; unread plan days stay empty until you read',
      },
    ],
  },
  {
    version: 'v1.9.5',
    subtitle: 'Reading plan progress so far',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Your reading plan now shows progress so far against passages due through today, like the leaderboard',
      },
    ],
  },
  {
    version: 'v1.9.4',
    subtitle: 'Other rosters on the dashboard',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Upcoming dates from other rosters now appear on the dashboard for viewers, not only people with edit access',
      },
      {
        type: 'Improved',
        text: 'The dashboard shows all upcoming other-roster dates, not only the ones that list your name',
      },
      {
        type: 'Fixed',
        text: 'A permission error on one roster no longer hides the rest of the other-roster schedule on Home',
      },
    ],
  },
  {
    version: 'v1.9.3',
    subtitle: 'Smoother setlist playback',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'The setlist player no longer slows the app down while a track is playing',
      },
      {
        type: 'Fixed',
        text: 'Scrolling and tapping stay responsive with the playlist open',
      },
      {
        type: 'Changed',
        text: 'A reference track keeps playing as you move through the setlist, and names the song it belongs to once you scroll past it',
      },
    ],
  },
  {
    version: 'v1.9.2',
    subtitle: 'Unread counts and YouTube playback',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Chat and home-screen badges count unread messages, not just how many chats have something new',
      },
      {
        type: 'Fixed',
        text: 'Setlist and reference-track YouTube playback works again — the app now allows the YouTube player script to load',
      },
      {
        type: 'Improved',
        text: 'YouTube links in chat play with one tap on the thumbnail',
      },
      {
        type: 'Improved',
        text: 'Tapping outside an open setlist playlist collapses the track list',
      },
      {
        type: 'Improved',
        text: 'If YouTube fails to load, the playlist stays open with a retry instead of vanishing',
      },
    ],
  },
  {
    version: 'v1.9.1',
    subtitle: 'Playback and offline recovery',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'YouTube reference tracks and setlist playback no longer crash when the YouTube script is blocked or fails to load',
      },
      {
        type: 'Fixed',
        text: 'Safari users recover automatically when local chat cache data becomes corrupted after clearing site data',
      },
    ],
  },
  {
    version: 'v1.9.0',
    subtitle: 'Reliable roster reminders',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Sent the day-before roster reminders for Sunday duties that were skipped this morning',
      },
      {
        type: 'Added',
        text: 'A second daily reminder run recovers a missed morning send on the same day, so a day-before heads-up is no longer lost for good',
      },
      {
        type: 'Added',
        text: 'The admin hub now shows when roster reminders last went out and warns if they stop arriving',
      },
      {
        type: 'Improved',
        text: 'Reminders send in parallel, so a busy roster day finishes in seconds instead of minutes',
      },
      {
        type: 'Improved',
        text: 'Push notifications that failed to arrive retry faster',
      },
    ],
  },
  {
    version: 'v1.8.3',
    subtitle: 'Photo viewer controls',
    date: 'July 31, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Photo viewer zoom, download, and close icons stay visible in light mode',
      },
    ],
  },
  {
    version: 'v1.8.2',
    subtitle: 'Group reaction notifications',
    date: 'July 31, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Chat reaction pushes go to everyone in the chat, not only the message author',
      },
      {
        type: 'Changed',
        text: 'Thread reply reactions notify all chat members the same way',
      },
    ],
  },
  {
    version: 'v1.8.1',
    subtitle: 'Faster first load',
    date: 'July 31, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Landing and sign-in pages show up sooner instead of waiting on a loading skeleton',
      },
      {
        type: 'Improved',
        text: 'The first screen after open paints faster by doing less work up front',
      },
      {
        type: 'Improved',
        text: 'Signed-out browsing no longer loads the signed-in data layer in the background',
      },
    ],
  },
  {
    version: 'v1.8.0',
    subtitle: 'Chat reaction notifications',
    date: 'July 30, 2026',
    changes: [
      {
        type: 'Added',
        text: 'You get a push notification when someone reacts to your chat message',
      },
      {
        type: 'Added',
        text: 'Thread reply reactions notify the reply author the same way',
      },
    ],
  },
  {
    version: 'v1.7.2',
    subtitle: 'Announcement reaction names',
    date: 'July 30, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Announcement reactions open a popover that lists who reacted, matching chat',
      },
      {
        type: 'Fixed',
        text: 'Announcement reaction popovers open correctly over the inbox sheet',
      },
      {
        type: 'Fixed',
        text: 'Announcement reactions update immediately when you add or remove them, without closing the inbox',
      },
    ],
  },
  {
    version: 'v1.7.1',
    subtitle: 'Clearer schedule rows',
    date: 'July 30, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Events, QT, cleaning, and home agenda rows share one layout, with the weekday under the date number',
      },
      {
        type: 'Changed',
        text: 'Schedule rows lead with names, then type, then detail — QT shows passage under the topic, cleaning shows day then Cleaning',
      },
      {
        type: 'Improved',
        text: 'Events, QT, cleaning, and roster pages show schedule skeletons while they load instead of a blank screen or spinner',
      },
    ],
  },
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
