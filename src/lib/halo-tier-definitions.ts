export type HaloPowerLevel = 0 | 1 | 2 | 3 | 4 | 5;

const HALO_TIER_IDS = [
  'bronze', 'copper', 'pewter', 'onyx', 'silver', 'jade', 'mint', 'teal', 'gold', 'peach',
  'rose', 'ruby', 'coral', 'lavender', 'sapphire', 'frost', 'diamond', 'amethyst', 'topaz', 'nebula',
  'celestial', 'prism', 'radiant', 'sovereign', 'magenta', 'master',
  'garnet', 'citrine', 'peridot', 'aquamarine', 'opal', 'pearl', 'brass', 'titanium', 'champagne', 'apricot',
  'orchid', 'plum', 'wine', 'cherry', 'maple', 'olive', 'sage', 'aqua', 'cerulean', 'cobalt',
  'navy', 'iris', 'lilac', 'dusk', 'dawn', 'spice',
] as const;

export type GeneratedHaloTierId = (typeof HALO_TIER_IDS)[number];

export type HaloTierDefinition = {
  id: GeneratedHaloTierId;
  label: string;
  minPlanProgressPercent: number;
  hue: number;
  variant: number;
  powerLevel: HaloPowerLevel;
};

function titleCase(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function unlockPercentForIndex(index: number, total: number): number {
  return Math.round(((index + 1) * 100) / total);
}

/** Evenly distribute power 1–5 across all halo tiers. */
function powerForIndex(index: number, total: number): HaloPowerLevel {
  const level = Math.ceil(((index + 1) * 5) / total);
  return Math.min(5, Math.max(1, level)) as HaloPowerLevel;
}

/** Hand-tuned hues for the first 26 tiers (keeps familiar colours distinct). */
const LEGACY_HUES: Partial<Record<GeneratedHaloTierId, { hue: number; variant: number }>> = {
  bronze: { hue: 35, variant: 0 },
  copper: { hue: 22, variant: 1 },
  pewter: { hue: 215, variant: 0 },
  onyx: { hue: 220, variant: 2 },
  silver: { hue: 210, variant: 1 },
  jade: { hue: 155, variant: 0 },
  mint: { hue: 168, variant: 1 },
  teal: { hue: 175, variant: 0 },
  gold: { hue: 45, variant: 0 },
  peach: { hue: 28, variant: 2 },
  rose: { hue: 340, variant: 1 },
  ruby: { hue: 0, variant: 0 },
  coral: { hue: 15, variant: 1 },
  lavender: { hue: 265, variant: 2 },
  sapphire: { hue: 225, variant: 0 },
  frost: { hue: 195, variant: 1 },
  diamond: { hue: 185, variant: 0 },
  amethyst: { hue: 275, variant: 0 },
  topaz: { hue: 38, variant: 1 },
  nebula: { hue: 255, variant: 1 },
  celestial: { hue: 48, variant: 2 },
  prism: { hue: 300, variant: 0 },
  radiant: { hue: 32, variant: 0 },
  sovereign: { hue: 280, variant: 1 },
  magenta: { hue: 320, variant: 0 },
  master: { hue: 290, variant: 2 },
};

export const HALO_TIER_DEFINITIONS: HaloTierDefinition[] = HALO_TIER_IDS.map((id, index) => {
  const legacy = LEGACY_HUES[id];
  const hue = legacy?.hue ?? Math.round((index * 360) / HALO_TIER_IDS.length);
  const variant = legacy?.variant ?? index % 3;
  const total = HALO_TIER_IDS.length;

  return {
    id,
    label: `${titleCase(id)} Halo`,
    minPlanProgressPercent: unlockPercentForIndex(index, total),
    hue,
    variant,
    powerLevel: powerForIndex(index, total),
  };
});
