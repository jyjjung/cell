export type AvatarCosmeticTier =
  | 'none'
  | 'bronze'
  | 'copper'
  | 'pewter'
  | 'silver'
  | 'jade'
  | 'mint'
  | 'gold'
  | 'rose'
  | 'ruby'
  | 'coral'
  | 'sapphire'
  | 'frost'
  | 'diamond'
  | 'amethyst'
  | 'nebula'
  | 'celestial'
  | 'prism'
  | 'radiant'
  | 'sovereign'
  | 'master';

export type HaloStylePreset =
  | 'none'
  | 'ember'
  | 'blossom'
  | 'slate'
  | 'lunar'
  | 'verdant'
  | 'mint'
  | 'aurora'
  | 'rosegold'
  | 'crimson'
  | 'sunset'
  | 'ocean'
  | 'frost'
  | 'cosmic'
  | 'violet'
  | 'nebula'
  | 'stellar'
  | 'prism'
  | 'radiant'
  | 'sovereign'
  | 'ethereal';

/** Visual intensity: 0 = none, 1 = whisper … 5 = ascended (master). */
export type HaloPowerLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type TierConfig = {
  id: AvatarCosmeticTier;
  label: string;
  minUnlocked: number;
  stylePreset: HaloStylePreset;
  powerLevel: HaloPowerLevel;
};

export const AVATAR_COSMETIC_TIERS: TierConfig[] = [
  { id: 'none', label: 'Standard', minUnlocked: 0, stylePreset: 'none', powerLevel: 0 },
  { id: 'bronze', label: 'Bronze Halo', minUnlocked: 2, stylePreset: 'ember', powerLevel: 1 },
  { id: 'copper', label: 'Copper Halo', minUnlocked: 4, stylePreset: 'blossom', powerLevel: 1 },
  { id: 'pewter', label: 'Pewter Halo', minUnlocked: 6, stylePreset: 'slate', powerLevel: 2 },
  { id: 'silver', label: 'Silver Halo', minUnlocked: 9, stylePreset: 'lunar', powerLevel: 2 },
  { id: 'jade', label: 'Jade Halo', minUnlocked: 12, stylePreset: 'verdant', powerLevel: 2 },
  { id: 'mint', label: 'Mint Halo', minUnlocked: 15, stylePreset: 'mint', powerLevel: 3 },
  { id: 'gold', label: 'Gold Halo', minUnlocked: 18, stylePreset: 'aurora', powerLevel: 3 },
  { id: 'rose', label: 'Rose Gold Halo', minUnlocked: 22, stylePreset: 'rosegold', powerLevel: 3 },
  { id: 'ruby', label: 'Ruby Halo', minUnlocked: 26, stylePreset: 'crimson', powerLevel: 3 },
  { id: 'coral', label: 'Coral Halo', minUnlocked: 30, stylePreset: 'sunset', powerLevel: 3 },
  { id: 'sapphire', label: 'Sapphire Halo', minUnlocked: 34, stylePreset: 'ocean', powerLevel: 4 },
  { id: 'frost', label: 'Frost Halo', minUnlocked: 38, stylePreset: 'frost', powerLevel: 4 },
  { id: 'diamond', label: 'Diamond Halo', minUnlocked: 42, stylePreset: 'cosmic', powerLevel: 4 },
  { id: 'amethyst', label: 'Amethyst Halo', minUnlocked: 48, stylePreset: 'violet', powerLevel: 4 },
  { id: 'nebula', label: 'Nebula Halo', minUnlocked: 54, stylePreset: 'nebula', powerLevel: 4 },
  { id: 'celestial', label: 'Celestial Halo', minUnlocked: 60, stylePreset: 'stellar', powerLevel: 5 },
  { id: 'prism', label: 'Prism Halo', minUnlocked: 68, stylePreset: 'prism', powerLevel: 5 },
  { id: 'radiant', label: 'Radiant Halo', minUnlocked: 76, stylePreset: 'radiant', powerLevel: 5 },
  { id: 'sovereign', label: 'Sovereign Halo', minUnlocked: 88, stylePreset: 'sovereign', powerLevel: 5 },
  { id: 'master', label: 'Master Halo', minUnlocked: 100, stylePreset: 'ethereal', powerLevel: 5 },
];

/** Avatar diameter as % of container — lower = more halo visible around the face. */
export const HALO_AVATAR_SCALE: Record<HaloPowerLevel, string> = {
  0: '100%',
  1: '94%',
  2: '91%',
  3: '87%',
  4: '82%',
  5: '76%',
};

export function getAvatarTierByUnlocked(unlockedCount: number): TierConfig {
  let current = AVATAR_COSMETIC_TIERS[0];
  for (const tier of AVATAR_COSMETIC_TIERS) {
    if (unlockedCount >= tier.minUnlocked) current = tier;
  }
  return current;
}

export function getNextAvatarTier(unlockedCount: number): TierConfig | null {
  return AVATAR_COSMETIC_TIERS.find((tier) => unlockedCount < tier.minUnlocked) || null;
}

export function getAvatarTierConfig(tier: AvatarCosmeticTier | undefined | null): TierConfig {
  return AVATAR_COSMETIC_TIERS.find((candidate) => candidate.id === tier) || AVATAR_COSMETIC_TIERS[0];
}

export function getCosmeticTierProgress(unlockedCount: number) {
  const current = getAvatarTierByUnlocked(unlockedCount);
  const next = getNextAvatarTier(unlockedCount);

  if (!next) {
    return {
      current,
      next: null,
      progressToNext: 1,
      achievementsNeededForNext: 0,
    };
  }

  const rangeStart = current.minUnlocked;
  const rangeEnd = next.minUnlocked;
  const span = Math.max(1, rangeEnd - rangeStart);

  return {
    current,
    next,
    progressToNext: Math.min(1, Math.max(0, (unlockedCount - rangeStart) / span)),
    achievementsNeededForNext: Math.max(0, rangeEnd - unlockedCount),
  };
}
