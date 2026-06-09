export type AchievementId = string;

export type AchievementMetric = 'bible' | 'feedback' | 'click' | 'hybrid' | 'secret';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  metric: AchievementMetric;
  requirements?: {
    /** Bible & hybrid achievements: minimum % of the full reading plan completed. */
    planProgressPercent?: number;
    feedbackCount?: number;
    clickMeCount?: number;
  };
  /** Firestore `unlockedSecrets` entry; used when metric is `secret`. */
  secretKey?: string;
}

export interface AchievementStats {
  planProgressPercent: number;
  feedbackCount: number | null;
  clickMeCount: number | null;
  unlockedSecrets?: string[];
}

export const HIDDEN_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'bible-pct-1',
    title: 'First Step',
    description: 'Reach 1% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 1 },
  },
  {
    id: 'bible-pct-2',
    title: 'Early Momentum',
    description: 'Reach 2% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 2 },
  },
  {
    id: 'bible-pct-5',
    title: 'Opening the Word',
    description: 'Reach 5% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 5 },
  },
  {
    id: 'bible-pct-10',
    title: 'Daily Bread',
    description: 'Reach 10% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 10 },
  },
  {
    id: 'bible-pct-15',
    title: 'Quiet Time',
    description: 'Reach 15% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 15 },
  },
  {
    id: 'bible-pct-20',
    title: 'Steady Reader',
    description: 'Reach 20% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 20 },
  },
  {
    id: 'bible-pct-25',
    title: 'First Quarter',
    description: 'Reach 25% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 25 },
  },
  {
    id: 'bible-pct-30',
    title: 'Pathfinder',
    description: 'Reach 30% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 30 },
  },
  {
    id: 'bible-pct-35',
    title: 'Growing Roots',
    description: 'Reach 35% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 35 },
  },
  {
    id: 'bible-pct-40',
    title: 'Lamp Bearer',
    description: 'Reach 40% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 40 },
  },
  {
    id: 'bible-pct-45',
    title: 'Covenant Keeper',
    description: 'Reach 45% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 45 },
  },
  {
    id: 'bible-pct-50',
    title: 'Halfway Herald',
    description: 'Reach 50% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 50 },
  },
  {
    id: 'bible-pct-55',
    title: 'Scripture Anchor',
    description: 'Reach 55% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 55 },
  },
  {
    id: 'bible-pct-60',
    title: 'Testimony Builder',
    description: 'Reach 60% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 60 },
  },
  {
    id: 'bible-pct-65',
    title: 'Morning Watchman',
    description: 'Reach 65% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 65 },
  },
  {
    id: 'bible-pct-70',
    title: 'Faithful Scribe',
    description: 'Reach 70% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 70 },
  },
  {
    id: 'bible-pct-75',
    title: 'Scroll Scholar',
    description: 'Reach 75% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 75 },
  },
  {
    id: 'bible-pct-80',
    title: 'Word Seeker',
    description: 'Reach 80% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 80 },
  },
  {
    id: 'bible-pct-85',
    title: 'Word Dweller',
    description: 'Reach 85% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 85 },
  },
  {
    id: 'bible-pct-90',
    title: 'Steadfast Finisher',
    description: 'Reach 90% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 90 },
  },
  {
    id: 'bible-pct-95',
    title: 'Scripture Pilgrim',
    description: 'Reach 95% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 95 },
  },
  {
    id: 'bible-pct-100',
    title: 'Plan Completer',
    description: 'Complete 100% of the reading plan.',
    metric: 'bible',
    requirements: { planProgressPercent: 100 },
  },
  {
    id: 'feedback-1',
    title: 'First Feedback',
    description: 'Submit your first feedback suggestion.',
    metric: 'feedback',
    requirements: { feedbackCount: 1 },
  },
  {
    id: 'feedback-2',
    title: 'Second Thought',
    description: 'Submit 2 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 2 },
  },
  {
    id: 'feedback-3',
    title: 'Helpful Eye',
    description: 'Submit 3 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 3 },
  },
  {
    id: 'feedback-4',
    title: 'Idea Sharer',
    description: 'Submit 4 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 4 },
  },
  {
    id: 'feedback-5',
    title: 'Builder Mindset',
    description: 'Submit 5 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 5 },
  },
  {
    id: 'feedback-6',
    title: 'Thoughtful Contributor',
    description: 'Submit 6 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 6 },
  },
  {
    id: 'feedback-8',
    title: 'Feature Friend',
    description: 'Submit 8 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 8 },
  },
  {
    id: 'feedback-10',
    title: 'Product Partner',
    description: 'Submit 10 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 10 },
  },
  {
    id: 'feedback-15',
    title: 'Quality Notes',
    description: 'Submit 15 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 15 },
  },
  {
    id: 'feedback-20',
    title: 'Vision Contributor',
    description: 'Submit 20 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 20 },
  },
  {
    id: 'feedback-25',
    title: 'Improvement Ally',
    description: 'Submit 25 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 25 },
  },
  {
    id: 'feedback-30',
    title: 'Insight Architect',
    description: 'Submit 30 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 30 },
  },
  {
    id: 'feedback-40',
    title: 'Roadmap Shaper',
    description: 'Submit 40 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 40 },
  },
  {
    id: 'feedback-35',
    title: 'UX Advocate',
    description: 'Submit 35 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 35 },
  },
  {
    id: 'feedback-45',
    title: 'Product Ally',
    description: 'Submit 45 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 45 },
  },
  {
    id: 'feedback-50',
    title: 'Voice of Improvement',
    description: 'Submit 50 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 50 },
  },
  {
    id: 'feedback-60',
    title: 'Iteration Partner',
    description: 'Submit 60 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 60 },
  },
  {
    id: 'feedback-75',
    title: 'Refinement Partner',
    description: 'Submit 75 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 75 },
  },
  {
    id: 'feedback-90',
    title: 'Blueprint Helper',
    description: 'Submit 90 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 90 },
  },
  {
    id: 'feedback-100',
    title: 'Master Builder',
    description: 'Submit 100 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 100 },
  },
  {
    id: 'feedback-125',
    title: 'Platform Architect',
    description: 'Submit 125 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 125 },
  },
  {
    id: 'feedback-150',
    title: 'Legendary Contributor',
    description: 'Submit 150 feedback suggestions.',
    metric: 'feedback',
    requirements: { feedbackCount: 150 },
  },
  {
    id: 'click-1',
    title: 'Curious Tap',
    description: 'Press "Click me!" once.',
    metric: 'click',
    requirements: { clickMeCount: 1 },
  },
  {
    id: 'click-2',
    title: 'Double Tap',
    description: 'Press "Click me!" 2 times.',
    metric: 'click',
    requirements: { clickMeCount: 2 },
  },
  {
    id: 'click-3',
    title: 'Button Regular',
    description: 'Press "Click me!" 3 times.',
    metric: 'click',
    requirements: { clickMeCount: 3 },
  },
  {
    id: 'click-5',
    title: 'Button Buddy',
    description: 'Press "Click me!" 5 times.',
    metric: 'click',
    requirements: { clickMeCount: 5 },
  },
  {
    id: 'click-7',
    title: 'Week Streaker',
    description: 'Press "Click me!" 7 times.',
    metric: 'click',
    requirements: { clickMeCount: 7 },
  },
  {
    id: 'click-10',
    title: 'Ten Taps',
    description: 'Press "Click me!" 10 times.',
    metric: 'click',
    requirements: { clickMeCount: 10 },
  },
  {
    id: 'click-14',
    title: 'Fortnight Finder',
    description: 'Press "Click me!" 14 times.',
    metric: 'click',
    requirements: { clickMeCount: 14 },
  },
  {
    id: 'click-21',
    title: 'Three-Week Tapper',
    description: 'Press "Click me!" 21 times.',
    metric: 'click',
    requirements: { clickMeCount: 21 },
  },
  {
    id: 'click-30',
    title: 'Daily Habit',
    description: 'Press "Click me!" 30 times.',
    metric: 'click',
    requirements: { clickMeCount: 30 },
  },
  {
    id: 'click-45',
    title: 'Persistent Tapper',
    description: 'Press "Click me!" 45 times.',
    metric: 'click',
    requirements: { clickMeCount: 45 },
  },
  {
    id: 'click-60',
    title: 'Steady Collector',
    description: 'Press "Click me!" 60 times.',
    metric: 'click',
    requirements: { clickMeCount: 60 },
  },
  {
    id: 'click-75',
    title: 'Quarter-Year Tap',
    description: 'Press "Click me!" 75 times.',
    metric: 'click',
    requirements: { clickMeCount: 75 },
  },
  {
    id: 'click-90',
    title: 'Seasoned Clicker',
    description: 'Press "Click me!" 90 times.',
    metric: 'click',
    requirements: { clickMeCount: 90 },
  },
  {
    id: 'click-100',
    title: 'Tap Veteran',
    description: 'Press "Click me!" 100 times.',
    metric: 'click',
    requirements: { clickMeCount: 100 },
  },
  {
    id: 'click-120',
    title: 'Button Devotee',
    description: 'Press "Click me!" 120 times.',
    metric: 'click',
    requirements: { clickMeCount: 120 },
  },
  {
    id: 'click-150',
    title: 'Click Champion',
    description: 'Press "Click me!" 150 times.',
    metric: 'click',
    requirements: { clickMeCount: 150 },
  },
  {
    id: 'click-200',
    title: 'Tap Legend',
    description: 'Press "Click me!" 200 times.',
    metric: 'click',
    requirements: { clickMeCount: 200 },
  },
  {
    id: 'click-250',
    title: 'Eternal Tapper',
    description: 'Press "Click me!" 250 times.',
    metric: 'click',
    requirements: { clickMeCount: 250 },
  },
  {
    id: 'click-365',
    title: 'Year of Clicks',
    description: 'Press "Click me!" 365 times.',
    metric: 'click',
    requirements: { clickMeCount: 365 },
  },
  {
    id: 'community-spark',
    title: 'Community Spark',
    description: 'Reach 5% of the reading plan and submit 1 feedback suggestion.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 5, feedbackCount: 1 },
  },
  {
    id: 'community-rhythm',
    title: 'Steady Rhythm',
    description: 'Reach 10% of the reading plan and press "Click me!" 5 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 10, clickMeCount: 5 },
  },
  {
    id: 'community-harmony',
    title: 'Harmony Seeker',
    description: 'Reach 15% of the reading plan and submit 2 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 15, feedbackCount: 2 },
  },
  {
    id: 'community-allrounder',
    title: 'All-Round Servant',
    description: 'Reach 20% of the reading plan, submit 1 feedback suggestion, and press "Click me!" once.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 20, feedbackCount: 1, clickMeCount: 1 },
  },
  {
    id: 'community-torch',
    title: 'Torch Bearer',
    description: 'Reach 25% of the reading plan, submit 3 feedback suggestions, and press "Click me!" 7 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 25, feedbackCount: 3, clickMeCount: 7 },
  },
  {
    id: 'community-diplomat',
    title: 'Circle Diplomat',
    description: 'Reach 30% of the reading plan, submit 4 feedback suggestions, and press "Click me!" 10 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 30, feedbackCount: 4, clickMeCount: 10 },
  },
  {
    id: 'community-builder',
    title: 'Community Builder',
    description: 'Reach 35% of the reading plan and submit 3 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 35, feedbackCount: 3 },
  },
  {
    id: 'community-pillar',
    title: 'Community Pillar',
    description: 'Reach 50% of the reading plan and submit 5 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 50, feedbackCount: 5 },
  },
  {
    id: 'community-steward',
    title: 'House Steward',
    description: 'Reach 55% of the reading plan, submit 8 feedback suggestions, and press "Click me!" 14 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 55, feedbackCount: 8, clickMeCount: 14 },
  },
  {
    id: 'community-sentinel',
    title: 'Watchful Sentinel',
    description: 'Reach 65% of the reading plan, submit 10 feedback suggestions, and press "Click me!" 21 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 65, feedbackCount: 10, clickMeCount: 21 },
  },
  {
    id: 'community-legacy',
    title: 'Legacy of Service',
    description: 'Reach 75% of the reading plan and submit 10 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 75, feedbackCount: 10 },
  },
  {
    id: 'community-covenant',
    title: 'Fourfold Covenant',
    description: 'Reach 80% of the reading plan, submit 15 feedback suggestions, and press "Click me!" 30 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 80, feedbackCount: 15, clickMeCount: 30 },
  },
  {
    id: 'community-shepherd',
    title: 'Shepherd of the House',
    description: 'Reach 85% of the reading plan and submit 20 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 85, feedbackCount: 20 },
  },
  {
    id: 'community-cornerstone',
    title: 'Cornerstone Contributor',
    description: 'Reach 95% of the reading plan and submit 30 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 95, feedbackCount: 30 },
  },
  {
    id: 'community-flame',
    title: 'Flame Keeper',
    description: 'Complete the reading plan and submit 40 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 100, feedbackCount: 40 },
  },
  {
    id: 'community-jubilee',
    title: 'Jubilee Herald',
    description: 'Complete the reading plan and submit 75 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 100, feedbackCount: 75 },
  },
  {
    id: 'community-evergreen',
    title: 'Evergreen Witness',
    description: 'Complete the reading plan and submit 100 feedback suggestions.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 100, feedbackCount: 100 },
  },
  {
    id: 'community-immortal',
    title: 'Immortal Witness',
    description: 'Complete the reading plan, submit 150 feedback suggestions, and press "Click me!" 365 times.',
    metric: 'hybrid',
    requirements: { planProgressPercent: 100, feedbackCount: 150, clickMeCount: 365 },
  },
  // ── Secret easter eggs (not tied to bible / feedback / clicks) ──
  {
    id: 'secret-midnight',
    title: 'Midnight Oil',
    description: 'You showed up when most of the house was asleep.',
    metric: 'secret',
    secretKey: 'midnight',
  },
  {
    id: 'secret-early-bird',
    title: 'Early Riser',
    description: 'You opened the portal before the sun was fully up.',
    metric: 'secret',
    secretKey: 'early-bird',
  },
  {
    id: 'secret-apps',
    title: 'App Drawer',
    description: 'You browsed the full apps grid.',
    metric: 'secret',
    secretKey: 'apps',
  },
  {
    id: 'secret-memorize',
    title: 'Memory Lane',
    description: 'You opened the memory verses hub.',
    metric: 'secret',
    secretKey: 'memorize',
  },
  {
    id: 'secret-halo',
    title: 'Halo Bearer',
    description: 'You equipped an avatar halo.',
    metric: 'secret',
    secretKey: 'halo',
  },
  {
    id: 'secret-changelog',
    title: 'Patch Notes Historian',
    description: 'You read through the release changelog.',
    metric: 'secret',
    secretKey: 'changelog',
  },
  {
    id: 'secret-members',
    title: 'Directory Drifter',
    description: 'You browsed the members directory.',
    metric: 'secret',
    secretKey: 'members',
  },
  {
    id: 'secret-events',
    title: 'Calendar Keeper',
    description: 'You checked the community events calendar.',
    metric: 'secret',
    secretKey: 'events',
  },
  {
    id: 'secret-chat',
    title: 'Thread Hopper',
    description: 'You opened the chat hub.',
    metric: 'secret',
    secretKey: 'chat',
  },
  {
    id: 'secret-media',
    title: 'Link Curator',
    description: 'You visited the media and links page.',
    metric: 'secret',
    secretKey: 'media',
  },
  {
    id: 'secret-full-plan',
    title: 'Big Picture',
    description: 'You opened the full Bible reading plan.',
    metric: 'secret',
    secretKey: 'full-plan',
  },
  {
    id: 'secret-leaderboard',
    title: 'Friendly Rival',
    description: 'You peeked at community progress.',
    metric: 'secret',
    secretKey: 'leaderboard',
  },
  {
    id: 'secret-sunday',
    title: 'Sabbath Scroll',
    description: 'You opened the portal on a Sunday.',
    metric: 'secret',
    secretKey: 'sunday',
  },
  {
    id: 'secret-command-menu',
    title: 'Power User',
    description: 'You opened the command menu.',
    metric: 'secret',
    secretKey: 'command-menu',
  },
  {
    id: 'secret-qt',
    title: 'QT Crew',
    description: 'You visited the QT roster.',
    metric: 'secret',
    secretKey: 'qt',
  },
  {
    id: 'secret-cleaning',
    title: 'Sparkle Squad',
    description: 'You checked the cleaning roster.',
    metric: 'secret',
    secretKey: 'cleaning',
  },
  {
    id: 'secret-bible-checklist',
    title: 'Daily Pathfinder',
    description: 'You opened the Bible reading checklist.',
    metric: 'secret',
    secretKey: 'bible-checklist',
  },
  {
    id: 'secret-avatar-studio',
    title: 'Mirror Check',
    description: 'You opened the avatar studio.',
    metric: 'secret',
    secretKey: 'avatar-studio',
  },
];

function normalizedPlanProgressPercent(value: number | undefined | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function getUnlockedAchievements(stats: AchievementStats): AchievementDefinition[] {
  const planProgressPercent = normalizedPlanProgressPercent(stats.planProgressPercent);

  return HIDDEN_ACHIEVEMENTS.filter((achievement) => {
    if (achievement.metric === 'secret') {
      const key = achievement.secretKey;
      return !!key && (stats.unlockedSecrets?.includes(key) ?? false);
    }

    const requirements = achievement.requirements;
    if (!requirements) return false;

    if (
      typeof requirements.planProgressPercent === 'number' &&
      planProgressPercent < requirements.planProgressPercent
    ) {
      return false;
    }

    if (typeof requirements.feedbackCount === 'number') {
      if (typeof stats.feedbackCount !== 'number' || stats.feedbackCount < requirements.feedbackCount) {
        return false;
      }
    }

    if (typeof requirements.clickMeCount === 'number') {
      if (typeof stats.clickMeCount !== 'number' || stats.clickMeCount < requirements.clickMeCount) {
        return false;
      }
    }

    return true;
  });
}

export function getAchievementProgress(stats: AchievementStats, achievement: AchievementDefinition): number {
  if (achievement.metric === 'secret') {
    const key = achievement.secretKey;
    return key && stats.unlockedSecrets?.includes(key) ? 1 : 0;
  }

  const requirements = achievement.requirements;
  if (!requirements) return 0;

  const fractions: number[] = [];
  const planProgressPercent = normalizedPlanProgressPercent(stats.planProgressPercent);

  if (typeof requirements.planProgressPercent === 'number') {
    const ratio = planProgressPercent / requirements.planProgressPercent;
    fractions.push(Math.max(0, Math.min(1, ratio)));
  }

  if (typeof requirements.feedbackCount === 'number') {
    const ratio = typeof stats.feedbackCount === 'number' ? stats.feedbackCount / requirements.feedbackCount : 0;
    fractions.push(Math.max(0, Math.min(1, ratio)));
  }

  if (typeof requirements.clickMeCount === 'number') {
    const ratio = typeof stats.clickMeCount === 'number' ? stats.clickMeCount / requirements.clickMeCount : 0;
    fractions.push(Math.max(0, Math.min(1, ratio)));
  }

  if (fractions.length === 0) return 0;
  return fractions.reduce((sum, value) => sum + value, 0) / fractions.length;
}
