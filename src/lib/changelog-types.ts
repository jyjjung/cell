export type ChangelogChangeType =
  | 'Added'
  | 'Changed'
  | 'Fixed'
  | 'Improved'
  | 'Security';

export type ChangelogChange = {
  type: ChangelogChangeType;
  text: string;
};

export type ChangelogEntry = {
  version: string;
  subtitle?: string;
  date: string;
  changes: ChangelogChange[];
};

/** Display / sort order aligned with Keep a Changelog (+ Improved). */
export const CHANGELOG_TYPE_ORDER: ChangelogChangeType[] = [
  'Added',
  'Changed',
  'Fixed',
  'Improved',
  'Security',
];

export const CHANGELOG_TYPE_CLASSES: Record<ChangelogChangeType, string> = {
  Added: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  Changed: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  Fixed: 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
  Improved: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  Security: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};
