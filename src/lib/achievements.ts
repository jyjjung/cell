export type AchievementId = string;

export type AchievementMetric = 'bible' | 'messages' | 'feedback' | 'click' | 'hybrid';

export interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  metric: AchievementMetric;
  requirements: {
    completedPassages?: number;
    messageCount?: number;
    feedbackCount?: number;
    clickMeCount?: number;
  };
}

export interface AchievementStats {
  completedPassages: number;
  messageCount: number | null;
  feedbackCount: number | null;
  clickMeCount: number | null;
}

export const HIDDEN_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'bible-1',
    title: 'First Reading',
    description: 'Read your first Bible passage.',
    metric: 'bible',
    requirements: { completedPassages: 1 },
  },
  {
    id: 'bible-5',
    title: 'Opening the Word',
    description: 'Read 5 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 5 },
  },
  {
    id: 'bible-10',
    title: 'Daily Bread',
    description: 'Read 10 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 10 },
  },
  {
    id: 'bible-15',
    title: 'Quiet Time',
    description: 'Read 15 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 15 },
  },
  {
    id: 'bible-25',
    title: 'First Steps',
    description: 'Read 25 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 25 },
  },
  {
    id: 'bible-50',
    title: 'Verse Walker',
    description: 'Read 50 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 50 },
  },
  {
    id: 'bible-75',
    title: 'Pathfinder',
    description: 'Read 75 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 75 },
  },
  {
    id: 'bible-100',
    title: 'Steady Reader',
    description: 'Read 100 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 100 },
  },
  {
    id: 'bible-150',
    title: 'Lamp Bearer',
    description: 'Read 150 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 150 },
  },
  {
    id: 'bible-200',
    title: 'Covenant Keeper',
    description: 'Read 200 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 200 },
  },
  {
    id: 'bible-250',
    title: 'Chapter Chaser',
    description: 'Read 250 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 250 },
  },
  {
    id: 'bible-300',
    title: 'Scripture Anchor',
    description: 'Read 300 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 300 },
  },
  {
    id: 'bible-400',
    title: 'Testimony Builder',
    description: 'Read 400 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 400 },
  },
  {
    id: 'bible-500',
    title: 'Morning Watchman',
    description: 'Read 500 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 500 },
  },
  {
    id: 'bible-600',
    title: 'Faithful Scribe',
    description: 'Read 600 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 600 },
  },
  {
    id: 'bible-750',
    title: 'Scroll Scholar',
    description: 'Read 750 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 750 },
  },
  {
    id: 'bible-900',
    title: 'Word Seeker',
    description: 'Read 900 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 900 },
  },
  {
    id: 'bible-1000',
    title: 'Faithful Finisher',
    description: 'Read 1,000 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1000 },
  },
  {
    id: 'bible-1100',
    title: 'Steadfast Reader',
    description: 'Read 1,100 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1100 },
  },
  {
    id: 'bible-1200',
    title: 'Word Dweller',
    description: 'Read 1,200 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1200 },
  },
  {
    id: 'bible-1300',
    title: 'Rooted in Truth',
    description: 'Read 1,300 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1300 },
  },
  {
    id: 'bible-1400',
    title: 'Deep Roots',
    description: 'Read 1,400 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1400 },
  },
  {
    id: 'bible-1500',
    title: 'Scripture Pilgrim',
    description: 'Read 1,500 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1500 },
  },
  {
    id: 'bible-1599',
    title: 'Plan Completer',
    description: 'Read 1,599 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1599 },
  },
  {
    id: 'bible-1800',
    title: 'Canon Companion',
    description: 'Read 1,800 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 1800 },
  },
  {
    id: 'bible-2000',
    title: 'Scripture Marathoner',
    description: 'Read 2,000 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 2000 },
  },
  {
    id: 'bible-2500',
    title: 'Living Testament',
    description: 'Read 2,500 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 2500 },
  },
  {
    id: 'bible-3000',
    title: 'Living Epistle',
    description: 'Read 3,000 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 3000 },
  },
  {
    id: 'bible-3500',
    title: 'Word Ambassador',
    description: 'Read 3,500 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 3500 },
  },
  {
    id: 'bible-4000',
    title: 'Eternal Student',
    description: 'Read 4,000 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 4000 },
  },
  {
    id: 'bible-5000',
    title: 'Scripture Sage',
    description: 'Read 5,000 Bible passages.',
    metric: 'bible',
    requirements: { completedPassages: 5000 },
  },
  {
    id: 'messages-1',
    title: 'First Message',
    description: 'Send your first chat message.',
    metric: 'messages',
    requirements: { messageCount: 1 },
  },
  {
    id: 'messages-25',
    title: 'Conversation Starter',
    description: 'Send 25 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 25 },
  },
  {
    id: 'messages-50',
    title: 'Circle Talker',
    description: 'Send 50 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 50 },
  },
  {
    id: 'messages-100',
    title: 'Encourager',
    description: 'Send 100 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 100 },
  },
  {
    id: 'messages-250',
    title: 'Fellowship Friend',
    description: 'Send 250 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 250 },
  },
  {
    id: 'messages-500',
    title: 'Shepherd Heart',
    description: 'Send 500 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 500 },
  },
  {
    id: 'messages-1000',
    title: 'Always Present',
    description: 'Send 1,000 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 1000 },
  },
  {
    id: 'messages-2000',
    title: 'Voice of Fellowship',
    description: 'Send 2,000 chat messages.',
    metric: 'messages',
    requirements: { messageCount: 2000 },
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
    description: 'Read 10 passages, send 10 messages, and submit 1 feedback suggestion.',
    metric: 'hybrid',
    requirements: { completedPassages: 10, messageCount: 10, feedbackCount: 1 },
  },
  {
    id: 'community-rhythm',
    title: 'Steady Rhythm',
    description: 'Read 50 passages, send 25 messages, and press "Click me!" 5 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 50, messageCount: 25, clickMeCount: 5 },
  },
  {
    id: 'community-harmony',
    title: 'Harmony Seeker',
    description: 'Read 75 passages, send 50 messages, and submit 2 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 75, messageCount: 50, feedbackCount: 2 },
  },
  {
    id: 'community-allrounder',
    title: 'All-Round Servant',
    description: 'Read 100 passages, send 25 messages, submit 1 feedback suggestion, and press "Click me!" once.',
    metric: 'hybrid',
    requirements: { completedPassages: 100, messageCount: 25, feedbackCount: 1, clickMeCount: 1 },
  },
  {
    id: 'community-torch',
    title: 'Torch Bearer',
    description: 'Read 150 passages, send 50 messages, submit 3 feedback suggestions, and press "Click me!" 7 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 150, messageCount: 50, feedbackCount: 3, clickMeCount: 7 },
  },
  {
    id: 'community-builder',
    title: 'Community Builder',
    description: 'Read 300 passages, send 100 messages, and submit 3 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 300, messageCount: 100, feedbackCount: 3 },
  },
  {
    id: 'community-diplomat',
    title: 'Circle Diplomat',
    description: 'Read 250 passages, send 100 messages, submit 4 feedback suggestions, and press "Click me!" 10 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 250, messageCount: 100, feedbackCount: 4, clickMeCount: 10 },
  },
  {
    id: 'community-pillar',
    title: 'Community Pillar',
    description: 'Read 500 passages, send 150 messages, and submit 5 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 500, messageCount: 150, feedbackCount: 5 },
  },
  {
    id: 'community-steward',
    title: 'House Steward',
    description: 'Read 600 passages, send 200 messages, submit 8 feedback suggestions, and press "Click me!" 14 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 600, messageCount: 200, feedbackCount: 8, clickMeCount: 14 },
  },
  {
    id: 'community-sentinel',
    title: 'Watchful Sentinel',
    description: 'Read 750 passages, send 250 messages, submit 10 feedback suggestions, and press "Click me!" 21 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 750, messageCount: 250, feedbackCount: 10, clickMeCount: 21 },
  },
  {
    id: 'community-legacy',
    title: 'Legacy of Service',
    description: 'Read 1,000 passages, send 1,000 messages, and submit 10 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 1000, messageCount: 1000, feedbackCount: 10 },
  },
  {
    id: 'community-covenant',
    title: 'Fourfold Covenant',
    description: 'Read 1,000 passages, send 1,000 messages, submit 15 feedback suggestions, and press "Click me!" 30 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 1000, messageCount: 1000, feedbackCount: 15, clickMeCount: 30 },
  },
  {
    id: 'community-shepherd',
    title: 'Shepherd of the House',
    description: 'Read 1,200 passages, send 500 messages, and submit 20 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 1200, messageCount: 500, feedbackCount: 20 },
  },
  {
    id: 'community-cornerstone',
    title: 'Cornerstone Contributor',
    description: 'Read 1,599 passages, send 1,000 messages, and submit 30 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 1599, messageCount: 1000, feedbackCount: 30 },
  },
  {
    id: 'community-flame',
    title: 'Flame Keeper',
    description: 'Read 2,000 passages, send 1,000 messages, and submit 40 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 2000, messageCount: 1000, feedbackCount: 40 },
  },
  {
    id: 'community-jubilee',
    title: 'Jubilee Herald',
    description: 'Read 3,000 passages, send 2,000 messages, and submit 75 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 3000, messageCount: 2000, feedbackCount: 75 },
  },
  {
    id: 'community-evergreen',
    title: 'Evergreen Witness',
    description: 'Read 3,000 passages, send 2,000 messages, and submit 100 feedback suggestions.',
    metric: 'hybrid',
    requirements: { completedPassages: 3000, messageCount: 2000, feedbackCount: 100 },
  },
  {
    id: 'community-immortal',
    title: 'Immortal Witness',
    description: 'Read 5,000 passages, send 2,000 messages, submit 150 feedback suggestions, and press "Click me!" 365 times.',
    metric: 'hybrid',
    requirements: { completedPassages: 5000, messageCount: 2000, feedbackCount: 150, clickMeCount: 365 },
  },
];

export function getUnlockedAchievements(stats: AchievementStats): AchievementDefinition[] {
  return HIDDEN_ACHIEVEMENTS.filter((achievement) => {
    const { requirements } = achievement;

    if (typeof requirements.completedPassages === 'number' && stats.completedPassages < requirements.completedPassages) {
      return false;
    }

    if (typeof requirements.messageCount === 'number') {
      if (typeof stats.messageCount !== 'number' || stats.messageCount < requirements.messageCount) {
        return false;
      }
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
  const requirements = achievement.requirements;
  const fractions: number[] = [];

  if (typeof requirements.completedPassages === 'number') {
    const ratio = stats.completedPassages / requirements.completedPassages;
    fractions.push(Math.max(0, Math.min(1, ratio)));
  }

  if (typeof requirements.messageCount === 'number') {
    const ratio = typeof stats.messageCount === 'number' ? stats.messageCount / requirements.messageCount : 0;
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
