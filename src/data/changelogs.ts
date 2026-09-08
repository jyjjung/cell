/**
 * In-app product changelog (Keep a Changelog + SemVer).
 * Style: `.cursor/rules/changelog-on-push.mdc` — member-facing, benefit-first, short.
 * New releases: add an object at the top of `changelogs`. The feedback view
 * groups patch releases into their major/minor version and keeps this history
 * available inside the expanded version entry.
 * Older eras stay few and short — do not recreate patch spam.
 */
import type { ChangelogEntry } from '@/lib/changelog-types';

export const changelogs: ChangelogEntry[] = [
  {
    version: 'v1.18.2',
    subtitle: 'Clearer everyday navigation',
    date: 'September 8, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'App names, navigation hints, loading states, and empty screens are now easier to understand at a glance.',
      },
      {
        type: 'Improved',
        text: 'Shared screens use calmer surfaces and clearer next steps so important actions stand out.',
      },
    ],
  },
  {
    version: 'v1.18.1',
    subtitle: 'Reliable admin access',
    date: 'September 7, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Admin pages now keep working when schedule and announcement data is restored from cache.',
      },
      {
        type: 'Fixed',
        text: 'Form access is more reliable after a new deployment.',
      },
    ],
  },
  {
    version: 'v1.18.0',
    subtitle: 'Roster scanning',
    date: 'September 7, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Admins can scan a QT roster PDF or photo, choose row 1 or row 2, and review assignments before saving.',
      },
    ],
  },
  {
    version: 'v1.17.43',
    subtitle: 'Faster return visits',
    date: 'September 7, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Returning to the app now shows a clearer loading layout while your session and schedule data are restored.',
      },
      {
        type: 'Improved',
        text: 'Background refreshes now avoid duplicate work, helping pages feel faster and reducing unnecessary data usage.',
      },
    ],
  },
  {
    version: 'v1.17.42',
    subtitle: 'Scannable schedule',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Schedule items now use distinct icons and colours to make events, duties, QT, worship, and rosters easier to scan.',
      },
    ],
  },
  {
    version: 'v1.17.38',
    subtitle: 'Clearer home dashboard',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'The home dashboard now uses clearer grouped sections and consistent controls for reading, schedules, notices, and unread chats.',
      },
    ],
  },
  {
    version: 'v1.17.37',
    subtitle: 'Consistent form fields',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Forms now share clearer labels, comfortable touch targets, consistent spacing, and readable field text across the website.',
      },
    ],
  },
  {
    version: 'v1.17.36',
    subtitle: 'Unified website typography',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Text now follows one consistent design-system foundation across every website screen.',
      },
    ],
  },
  {
    version: 'v1.17.35',
    subtitle: 'Consistent text styles',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Shared text styling now keeps body copy consistent across member-facing screens.',
      },
    ],
  },
  {
    version: 'v1.17.34',
    subtitle: 'Clearer NDCPC setlists',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'NDCPC setlists now use the same expandable overview, direct resource viewer, and focused editing flow as em.',
      },
    ],
  },
  {
    version: 'v1.17.33',
    subtitle: 'Openable setlist songs',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Setlist song names now open the appropriate worship resource: chord sheets for em. and embedded videos for NDCPC.',
      },
    ],
  },
  {
    version: 'v1.17.32',
    subtitle: 'Faster roster editing',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Worship managers now enter roster details ready to edit, while other members continue to see an expanded read-only view.',
      },
    ],
  },
  {
    version: 'v1.17.31',
    subtitle: 'Scannable worship lists',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Worship rosters and setlists now expand inline for quick review while keeping full editing in their detail screens.',
      },
    ],
  },
  {
    version: 'v1.17.30',
    subtitle: 'Focused rosters',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Worship rosters now keep role assignments collapsed for quick scanning and open editing controls only when you choose Edit.',
      },
    ],
  },
  {
    version: 'v1.17.29',
    subtitle: 'Flexible tags',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Tags and filter toggles now share consistent status colors, spacing, removable actions, and selected states.',
      },
    ],
  },
  {
    version: 'v1.17.28',
    subtitle: 'Consistent tabs',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Tabbed screens now share clearer active, inactive, hover, focus, and underline states.',
      },
    ],
  },
  {
    version: 'v1.17.27',
    subtitle: 'Shared pagination',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Added',
        text: 'Paged lists can now use a consistent, accessible pagination pattern with clear current, previous, next, and overflow states.',
      },
    ],
  },
  {
    version: 'v1.17.26',
    subtitle: 'Clearer notifications',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'In-app notifications now share clearer message and alert layouts with visible icons, actions, and dismissal controls.',
      },
    ],
  },
  {
    version: 'v1.17.25',
    subtitle: 'Shared navigation',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Navigation controls now share consistent icon, label, active, hover, and spacing behavior.',
      },
    ],
  },
  {
    version: 'v1.17.24',
    subtitle: 'Clearer menus',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Menus now share clearer spacing, hierarchy, separators, and shortcut styling across the website.',
      },
    ],
  },
  {
    version: 'v1.17.23',
    subtitle: 'Consistent form fields',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Form controls now share clearer labels, selection rows, descriptions, and search fields throughout the website.',
      },
    ],
  },
  {
    version: 'v1.17.22',
    subtitle: 'Clearer dialogs',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Dialogs now use a clearer shared layout with more comfortable spacing and easier-to-scan headings.',
      },
    ],
  },
  {
    version: 'v1.17.21',
    subtitle: 'Shared card patterns',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Existing content cards now share clearer layouts and spacing across the website.',
      },
    ],
  },
  {
    version: 'v1.17.20',
    subtitle: 'Consistent date fields',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Form date and birthday questions now always open the app calendar instead of the browser calendar.',
      },
    ],
  },
  {
    version: 'v1.17.19',
    subtitle: 'Reliable forms',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Forms now load reliably after deployment, including when Firebase credentials use different secure formats.',
      },
    ],
  },
  {
    version: 'v1.17.18',
    subtitle: 'Smoother form entry',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Forms now provide a clear way back before you begin or continue a response.',
      },
      {
        type: 'Improved',
        text: 'Form deadlines and date fields now use the same calendar experience as the rest of the app.',
      },
    ],
  },
  {
    version: 'v1.17.17',
    subtitle: 'Clearer calendars',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Date pickers now use clearer month and year controls with easier-to-scan day states.',
      },
      {
        type: 'Improved',
        text: 'Selected, ranged, outside-month, and disabled dates are easier to distinguish.',
      },
    ],
  },
  {
    version: 'v1.17.16',
    subtitle: 'Aligned worship tools',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Rosters and setlists now use the same list pattern across em. and NDCPC.',
      },
      {
        type: 'Fixed',
        text: 'Worship entries are easier to scan without opening expandable sections first.',
      },
    ],
  },
  {
    version: 'v1.17.15',
    subtitle: 'Unified worship lists',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Worship rosters and setlists now share the same clear, compact list layout.',
      },
      {
        type: 'Fixed',
        text: 'Worship list actions and empty states are easier to find and understand.',
      },
    ],
  },
  {
    version: 'v1.17.14',
    subtitle: 'Unified actions',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Buttons now share clearer medium, small, icon, and action-group sizing across screens.',
      },
      {
        type: 'Changed',
        text: 'Existing colour choices remain the same while spacing and shape are more consistent.',
      },
    ],
  },
  {
    version: 'v1.17.13',
    subtitle: 'Flexible avatars',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Avatars now share consistent size, shape, grouping, and identity details across the app.',
      },
      {
        type: 'Improved',
        text: 'Member identity blocks are easier to scan in shared roster and chat information.',
      },
    ],
  },
  {
    version: 'v1.17.12',
    subtitle: 'Clearer accordions',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Expandable sections now use clearer cards, spacing, and open and closed states.',
      },
      {
        type: 'Improved',
        text: 'Accordion headings and chevrons are easier to scan across schedules, resources, and admin tools.',
      },
    ],
  },
  {
    version: 'v1.17.11',
    subtitle: 'Consistent layouts',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'More screens now use the same page spacing and responsive layout foundation.',
      },
      {
        type: 'Improved',
        text: 'Lists, forms, photos, documents, and community tools feel more consistent from screen to screen.',
      },
    ],
  },
  {
    version: 'v1.17.10',
    subtitle: 'Simpler components',
    date: 'September 6, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Buttons, cards, forms, and page surfaces now share clearer spacing, sizing, and elevation.',
      },
      {
        type: 'Changed',
        text: 'Your chosen colour themes remain unchanged while the component system becomes easier to use.',
      },
      {
        type: 'Improved',
        text: 'Common interface icons now use a more consistent size across navigation, actions, and compact controls.',
      },
    ],
  },
  {
    version: 'v1.17.9',
    subtitle: 'Offline home',
    date: 'September 5, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Opening the app offline from the home screen no longer shows a blank white page.',
      },
      {
        type: 'Fixed',
        text: 'Signed-in visits to home jump straight to your last app — no more stuck Loading spinner.',
      },
    ],
  },
  {
    version: 'v1.17.8',
    subtitle: 'Worship rosters',
    date: 'September 5, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Worship roster lists expand to show who’s assigned — tap Edit when you need to make changes.',
      },
      {
        type: 'Fixed',
        text: 'Preschool roster New and Delete now work while you’re editing a roster, not only after you leave.',
      },
    ],
  },
  {
    version: 'v1.17.7',
    subtitle: 'Faster first load',
    date: 'September 5, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Home, chat, and the hub open faster — screens appear sooner while the rest loads in the background.',
      },
      {
        type: 'Improved',
        text: 'Signed-in visits to the site home take you straight back to the app you last used.',
      },
    ],
  },
  {
    version: 'v1.17.6',
    subtitle: 'Worship Rosters',
    date: 'September 2, 2026',
    changes: [
      {
        type: 'Added',
        text: 'You can add and remove the roles people are assigned to on worship rosters.',
      },
    ],
  },

  {
    version: 'v1.17.5',
    subtitle: 'Reading plan & charts',
    date: 'September 2, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'This week and overdue reading rows show how many chapters you have read (for example, 3/5 chapters read).',
      },
      {
        type: 'Fixed',
        text: 'Pasted text chord charts always use a dark background with white text so your note markings stay visible in any theme.',
      },
    ],
  },

  {
    version: 'v1.17.4',
    subtitle: 'Reading plan & polish',
    date: 'September 1, 2026',
    changes: [
      {
        type: 'Improved',
        text: 'Reading plan progress, pace stats, and weekly breakdown are easier to scan on one screen.',
      },
      {
        type: 'Improved',
        text: 'The reading leaderboard is easier to scan — search members and see progress against passages due through today.',
      },
      {
        type: 'Added',
        text: 'You can download pasted text charts from a setlist, including note markings saved on that song.',
      },
      {
        type: 'Improved',
        text: 'Home groups your schedule, reading, and notices so the page is easier to scan.',
      },
      {
        type: 'Changed',
        text: 'Memory verses and the separate full-plan page are gone — use Reading plan and the leaderboard.',
      },
    ],
  },

  {
    version: 'v1.15.6',
    subtitle: 'Worship Charts',
    date: 'August 29, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Pasted charts no longer treat lyric words like “breath”, “Ev’ry”, or “Great” as chord symbols.',
      },
      {
        type: 'Fixed',
        text: 'Chord detection only kicks in when a symbol has a space on each side, so lyrics are not misread.',
      },
    ],
  },
  {
    version: 'v1.15.5',
    subtitle: 'Worship Charts',
    date: 'August 29, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Pasting a chart from SongSelect keeps chords above lyrics instead of gluing them into words like “Dlife”.',
      },
    ],
  },
  {
    version: 'v1.15.4',
    subtitle: 'Stability',
    date: 'August 23, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'On iPhone, the app recovers more cleanly after a storage glitch instead of getting stuck.',
      },
      {
        type: 'Fixed',
        text: 'em. Worship opens a roster, setlist, song, or chord chart on the first tap.',
      },
      {
        type: 'Improved',
        text: 'Bible popup: pick a book and chapter from one list — full names, Korean when you’re on KRV.',
      },
      {
        type: 'Fixed',
        text: 'Preschool rosters only list people with preschool access — you can still add guests the same way as em. Worship.',
      },
      {
        type: 'Changed',
        text: 'The community app icon and home-screen shortcut now use the NDC logo.',
      },
    ],
  },

  {
    version: 'v1.15.3',
    subtitle: 'Stability',
    date: 'August 20, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Some members can see their chats and schedules again after signing in.',
      },
      {
        type: 'Fixed',
        text: 'You can add the same song more than once to a setlist.',
      },
      {
        type: 'Fixed',
        text: 'The Bible reader button is back on Home.',
      },
      {
        type: 'Fixed',
        text: 'Switching from em. to Account no longer crashes when the Bible reader was open.',
      },
      {
        type: 'Fixed',
        text: 'The first screen loads without a theme flash, and Safari recovers more cleanly after a storage glitch.',
      },
    ],
  },

  {
    version: 'v1.15.2',
    subtitle: 'Worship rosters',
    date: 'August 17, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'em. Worship rosters show the current Sundays after a refresh — a phone no longer keeps a deleted roster that was already replaced.',
      },
    ],
  },

  {
    version: 'v1.15.1',
    subtitle: 'Stability',
    date: 'August 16, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Preschool YouTube chapter clips show a normal play button again — they start at the chapter and stop at the next, only after you press play.',
      },
      {
        type: 'Fixed',
        text: 'Updates and Bible reading open reliably while you’re signing in — they no longer crash on the way in.',
      },
      {
        type: 'Fixed',
        text: 'First load is smoother: theme and offline banner no longer flash the wrong state.',
      },
      {
        type: 'Fixed',
        text: 'Preschool Photos no longer crashes Safari when the album is large — photos load as you scroll, a page at a time.',
      },
      {
        type: 'Improved',
        text: 'On Safari, the app recovers more cleanly after storage glitches instead of getting stuck.',
      },
    ],
  },

  {
    version: 'v1.15.0',
    subtitle: 'Community Apps',
    date: 'August 15, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Opening an em. chat shows the conversation again — it was blank after the community apps move.',
      },
      {
        type: 'Fixed',
        text: 'em. and Preschool chats stay in their own apps — each list only shows that app’s rooms.',
      },
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
        text: 'Updates — what’s new and feedback, available to everyone.',
      },
      {
        type: 'Changed',
        text: 'Preschool Worship now has Rosters, Setlists, Resources, and Order in one place.',
      },
      {
        type: 'Changed',
        text: 'Old preschool links (ndcpc.vercel.app) now open Preschool inside Community Apps.',
      },
      {
        type: 'Added',
        text: 'You can paste a chord chart (SongSelect or similar). Paste is the usual way; charts show larger type in two columns, transpose in any setlist key, and you can pick or add notes while adding the song.',
      },
      {
        type: 'Fixed',
        text: 'Pasted charts keep bar lines and titles intact, don’t turn words like “But” or “(To Ch. 1a)” into chords, and lyrics no longer run off the edge.',
      },
      {
        type: 'Fixed',
        text: 'Drawing notes on a chart while adding or editing a setlist song works again — you can scroll, draw, and pick tools.',
      },
      {
        type: 'Improved',
        text: 'You can adjust an existing profile photo (move and zoom), and photos no longer look removed when the installed app fails to load them briefly.',
      },
      {
        type: 'Improved',
        text: 'In setlist chord sheets, you can zoom out past the default size to see more of the page.',
      },
      {
        type: 'Fixed',
        text: '“Set up” notifications opens the Notifications settings tab, not your profile.',
      },
    ],
  },

  {
    version: 'v1.14.3',
    subtitle: 'Form date field sizing',
    date: 'August 9, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Native Date (and time) inputs match the same field height as other form questions on phones.',
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
