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
    version: 'v1.15.0',
    subtitle: 'Community Apps',
    date: 'August 15, 2026',
    changes: [
      {
        type: 'Added',
        text: 'One sign-in for em., Preschool, Account, and Users — switch apps anytime from the header.',
      },
      {
        type: 'Added',
        text: 'Updates, pasted worship chord charts, and Preschool Worship (rosters, setlists, resources, order) in one place.',
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
        text: 'Forms with guest links, admin maker and responses, deadlines, and CSV/PDF reports.',
      },
    ],
  },
  {
    version: 'v1.7.0',
    subtitle: 'Home & design',
    date: 'July 29, 2026',
    changes: [
      {
        type: 'Changed',
        text: 'Redesigned home agenda, appearance themes, and iMessage-style chat.',
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
        text: 'Community hub: chat, Bible reading, schedule, worship tools, and member profiles.',
      },
    ],
  },
];
