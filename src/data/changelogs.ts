/**
 * In-app product changelog (Keep a Changelog + SemVer).
 * Style: `.cursor/rules/changelog-on-push.mdc` — member-facing, benefit-first, short.
 * New releases: add an object at the top of `changelogs`.
 * Older eras stay few and short — do not recreate patch spam.
 */
import type { ChangelogEntry } from '@/lib/changelog-types';

export const changelogs: ChangelogEntry[] = [
  {
    version: 'v1.17.10',
    subtitle: 'Offline launch',
    date: 'September 5, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Opening the installed app offline no longer shows a blank white screen — home opens from this device and takes you back to your last app.',
      },
      {
        type: 'Fixed',
        text: 'Offline mode keeps your saved pages instead of clearing the app cache when a screen fails to load.',
      },
    ],
  },
  {
    version: 'v1.17.9',
    subtitle: 'Offline launch',
    date: 'September 5, 2026',
    changes: [
      {
        type: 'Fixed',
        text: 'Opening the app offline no longer sticks on a blank white screen — your account loads from this device when available, or you see a clear offline message.',
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
