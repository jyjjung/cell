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
    version: 'v1.14.3',
    subtitle: 'Form date fields & descriptions',
    date: 'August 9, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Date questions always use the in-app calendar picker, so they match other fields on phones instead of the taller native date control.',
      },
      {
        type: 'Fixed',
        text: 'Form descriptions keep line breaks from the builder, so multi-line instructions stay readable.',
      },
    ],
  },
  {
    version: 'v1.14.2',
    subtitle: 'Remove edge auth gate',
    date: 'August 9, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Removed the Edge middleware login redirect. Sign-in checks stay in the app and API routes.',
      },
    ],
  },
  {
    version: 'v1.14.1',
    subtitle: 'Compact form date picker',
    date: 'August 9, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Date and Multiple dates questions use a smaller calendar popup and a shorter trigger that matches other form fields.',
      },
    ],
  },
  {
    version: 'v1.14.0',
    subtitle: 'Public forms, lock, and close',
    date: 'August 9, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Guest form links and response pages open without signing in.',
      },
      {
        type: 'Added',
        text: 'Admins can lock responses after submit so people can’t edit or delete their answers.',
      },
      {
        type: 'Added',
        text: 'Admins can close a form: the public link still opens, but new responses are off and existing ones can’t be edited or deleted.',
      },
      {
        type: 'Improved',
        text: 'When a form includes Name or Email from your profile, you see those values read-only with a note that form admins can see them.',
      },
      {
        type: 'Fixed',
        text: 'Downloading form responses as PDF on iPhone no longer fails with a “popup blocked” message.',
      },
    ],
  },
  {
    version: 'v1.13.5',
    subtitle: 'Bible popup theme colors',
    date: 'August 6, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'The Bible popup mark-as-read button now uses your theme’s primary color for read and partial progress, instead of staying green in every theme.',
      },
    ],
  },
  {
    version: 'v1.13.4',
    subtitle: 'Checklist key migration',
    date: 'August 6, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Legacy Bible reading progress is migrated with a one-time admin script instead of running automatically in the app on every load.',
      },
    ],
  },
  {
    version: 'v1.13.3',
    subtitle: 'Mark week as read',
    date: 'August 6, 2026',
    changes: [
      {
        type: 'Added',
        text: 'The reading plan week detail view now has a Mark week as read button to check off or clear every passage in that week at once.',
      },
    ],
  },
  {
    version: 'v1.13.2',
    subtitle: 'Reading progress recovery',
    date: 'August 6, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Bible reading progress saved with older formats is recognized again and safely migrated, so completed passages should no longer appear missing after updates.',
      },
      {
        type: 'Fixed',
        text: 'The Bible popup mark-as-read button now clearly shows unread, partially read, and fully read states using your current theme colors.',
      },
    ],
  },
  {
    version: 'v1.13.1',
    subtitle: 'Bible popup reading progress',
    date: 'August 6, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'In the Bible popup, chapters that appear more than once in your reading plan now show a filled progress button based on how many assignments you have read.',
      },
      {
        type: 'Improved',
        text: 'The Bible popup now uses distinct unread and read colors from your current theme when marking repeated plan passages complete, making partial progress easier to see across different themes.',
      },
    ],
  },
  {
    version: 'v1.13.0',
    subtitle: 'Forms date options',
    date: 'August 6, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Forms can include a Multiple dates question so people can pick more than one day.',
      },
      {
        type: 'Added',
        text: 'Date and Multiple dates questions can limit which weekdays are selectable (e.g. Thursdays only).',
      },
      {
        type: 'Improved',
        text: 'Calendar-based date questions use a more compact input that fits the form layout better.',
      },
      {
        type: 'Changed',
        text: 'Built-in submitter identity is hidden in response views and exports unless a form includes its own name field.',
      },
    ],
  },
  {
    version: 'v1.12.1',
    subtitle: 'Open chord sheet uploads',
    date: 'August 5, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Any signed-in member can upload chord sheets (sheet music) to the song library.',
      },
    ],
  },
  {
    version: 'v1.12.0',
    subtitle: 'Forms with admin submissions',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Forms with guest share links, admin Forms maker, deadlines, optional response limits, reminders, and many question types including Name, Email, Phone, and Birthday.',
      },
      {
        type: 'Added',
        text: 'Signed-in members’ Name and Email from profile attach to responses for admin reports only (hidden on the form); add separate Name/Email questions when you need people to type them. Phone and Birthday still pre-fill and can update the profile.',
      },
      {
        type: 'Improved',
        text: 'After submit you see a thank-you screen; yes/no and single choice show every option as radios; Create form sits under the question list.',
      },
      {
        type: 'Added',
        text: 'Delete your own form submissions from Forms or the response page (signed-in owners only).',
      },
      {
        type: 'Added',
        text: 'When downloading responses, admins can choose which questions and which submitters to include in CSV or PDF.',
      },
      {
        type: 'Improved',
        text: 'PDF downloads use a landscape spreadsheet table (same columns as CSV) with clear headers and alternating rows.',
      },
      {
        type: 'Changed',
        text: 'Removed the bottom “A new version is ready” update banner.',
      },
      {
        type: 'Improved',
        text: 'Admin Forms splits into Forms maker and Responses — view or download submissions; share a guest responses link so people can see answers without signing in.',
      },
      {
        type: 'Improved',
        text: 'Forms stay cheaper to run: publish notices only when a form goes live, capped recipient fan-out, paginated submissions, and brief guest-page caching.',
      },
      {
        type: 'Fixed',
        text: 'Form create/save no longer fails on empty optional settings; the Forms list no longer crashes after submit; PDF export behaves reliably; drafts no longer stay visible on the member Forms page after you unpublish.',
      },
      {
        type: 'Changed',
        text: 'Forms appear in the main sidebar and on the Admin hub; CSV/PDF reports are admin-only.',
      },
    ],
  },
  {
    version: 'v1.11.4',
    subtitle: 'Single offline banner',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Offline status now shows as one banner above the header instead of stacking in chat and covering photo controls',
      },
    ],
  },
  {
    version: 'v1.11.3',
    subtitle: 'Offline cache recovery',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'When the offline database gets stuck, the app now clears it safely and reloads instead of freezing chat',
      },
      {
        type: 'Improved',
        text: 'Known offline-cache recovery errors no longer clutter error reports',
      },
    ],
  },
  {
    version: 'v1.11.2',
    subtitle: 'Bible button clears footer',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'On the home page, the Bible reader button no longer covers the Terms link in the footer',
      },
    ],
  },
  {
    version: 'v1.11.1',
    subtitle: 'Home agenda & reading stats polish',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Home upcoming schedule shows as a clean list without an extra section header',
      },
      {
        type: 'Improved',
        text: 'Reading plan pace numbers (progress so far, passages left, and related stats) are easier to read',
      },
    ],
  },
  {
    version: 'v1.11.0',
    subtitle: 'Reliability, quieter sessions & admin clarity',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Profile shows this device’s push health — permission, token, last repair — plus a clearer Fix action',
      },
      {
        type: 'Added',
        text: 'When a new app version is ready, you can reload from a small prompt instead of a stuck screen',
      },
      {
        type: 'Added',
        text: 'Admin Users can filter pending, no-push, and inactive (30 day) members; reminder health shows send counts',
      },
      {
        type: 'Improved',
        text: 'Background tabs pause live chat/notification updates; reminder catch-up skips full scans when morning already succeeded',
      },
      {
        type: 'Improved',
        text: 'Pending-approval and offline Bible messages are clearer',
      },
      {
        type: 'Improved',
        text: 'More admin screens and validation messages work in Korean; unused All apps page removed',
      },
    ],
  },
  {
    version: 'v1.10.3',
    subtitle: 'Safari offline cache recovery',
    date: 'August 4, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'On iPhone Safari, the app recovers automatically when the offline cache breaks after switching apps',
      },
    ],
  },
  {
    version: 'v1.10.2',
    subtitle: 'Quieter crash reporting',
    date: 'August 3, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Push setup no longer errors on browsers that do not support notifications',
      },
      {
        type: 'Fixed',
        text: 'Blocked or offline YouTube embeds fail quietly instead of flooding error reports',
      },
      {
        type: 'Improved',
        text: 'Temporary Safari network blips during page loads are filtered out of crash monitoring',
      },
      {
        type: 'Improved',
        text: 'Profile notification enable now waits for a supported messaging setup before requesting permission',
      },
    ],
  },
  {
    version: 'v1.10.1',
    subtitle: 'Stale tab recovery',
    date: 'August 2, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'After a slow or failed app update download, the error screen reloads cleanly instead of getting stuck on Try again',
      },
      {
        type: 'Improved',
        text: 'Long-open tabs recover more reliably when a chunk times out or the router state is corrupted',
      },
    ],
  },
  {
    version: 'v1.10.0',
    subtitle: 'Other roster reminders',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Other rosters now send assignment notifications when you are added as a member',
      },
      {
        type: 'Added',
        text: 'Duty reminders for other rosters — coming up, tomorrow, and today — same as cleaning, QT, and worship',
      },
      {
        type: 'Fixed',
        text: 'Other roster pages show the roster name in the header instead of the internal ID',
      },
    ],
  },
  {
    version: 'v1.9.6',
    subtitle: 'Reading streak heatmap',
    date: 'August 1, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'The reading streak heatmap uses a GitHub-style week grid with readable square days',
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
