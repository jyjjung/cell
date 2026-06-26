import type { HaloPalette } from '@/lib/halo-palette-builder';
import { buildHaloPalette } from '@/lib/halo-palette-builder';
import { HALO_TIER_DEFINITIONS } from '@/lib/halo-tier-definitions';
import type { GeneratedHaloTierId } from '@/lib/halo-tier-definitions';

export type { HaloPalette };

export const HALO_PALETTES: Record<GeneratedHaloTierId, HaloPalette> = Object.fromEntries(
  HALO_TIER_DEFINITIONS.map((tier) => [tier.id, buildHaloPalette(tier.hue, tier.variant)]),
) as Record<GeneratedHaloTierId, HaloPalette>;
