export type AvatarBackgroundStop = { offset: string; color: string };

export type AvatarBackgroundDef = {
  stops: AvatarBackgroundStop[];
  group: 'neutral' | 'solid' | 'pastel' | 'gradient';
  label: string;
};

function solid(color: string): AvatarBackgroundStop[] {
  return [
    { offset: '0%', color },
    { offset: '100%', color },
  ];
}

function gradient(...colors: string[]): AvatarBackgroundStop[] {
  if (colors.length === 1) return solid(colors[0]);
  const step = 100 / (colors.length - 1);
  return colors.map((color, index) => ({
    offset: `${Math.round(index * step)}%`,
    color,
  }));
}

export const AVATAR_BACKGROUND_GROUPS = [
  { id: 'neutral' as const, label: 'Neutrals' },
  { id: 'solid' as const, label: 'Bold solids' },
  { id: 'pastel' as const, label: 'Pastels' },
  { id: 'gradient' as const, label: 'Gradients' },
];

export const AVATAR_BACKGROUNDS: Record<string, AvatarBackgroundDef> = {
  none: { stops: solid('transparent'), group: 'neutral', label: 'None' },

  // Neutrals — warm & cool, not just black/white
  ivory: { stops: solid('#FFFFF0'), group: 'neutral', label: 'Ivory' },
  cream: { stops: solid('#FFF8E7'), group: 'neutral', label: 'Cream' },
  sand: { stops: solid('#F5E6D3'), group: 'neutral', label: 'Sand' },
  linen: { stops: solid('#FAF0E6'), group: 'neutral', label: 'Linen' },
  white: { stops: solid('#FFFFFF'), group: 'neutral', label: 'White' },
  pearl: { stops: solid('#F4F4F5'), group: 'neutral', label: 'Pearl' },
  mist: { stops: solid('#E4E4E7'), group: 'neutral', label: 'Mist' },
  stone: { stops: solid('#D6D3D1'), group: 'neutral', label: 'Stone' },
  slate: { stops: solid('#64748B'), group: 'neutral', label: 'Slate' },
  graphite: { stops: solid('#3F3F46'), group: 'neutral', label: 'Graphite' },
  charcoal: { stops: solid('#27272A'), group: 'neutral', label: 'Charcoal' },
  espresso: { stops: solid('#3E2723'), group: 'neutral', label: 'Espresso' },
  black: { stops: solid('#111111'), group: 'neutral', label: 'Black' },

  // Bold solids
  red: { stops: solid('#EF4444'), group: 'solid', label: 'Red' },
  orange: { stops: solid('#F97316'), group: 'solid', label: 'Orange' },
  amber: { stops: solid('#F59E0B'), group: 'solid', label: 'Amber' },
  yellow: { stops: solid('#EAB308'), group: 'solid', label: 'Yellow' },
  lime: { stops: solid('#84CC16'), group: 'solid', label: 'Lime' },
  green: { stops: solid('#22C55E'), group: 'solid', label: 'Green' },
  emerald: { stops: solid('#10B981'), group: 'solid', label: 'Emerald' },
  teal: { stops: solid('#14B8A6'), group: 'solid', label: 'Teal' },
  cyan: { stops: solid('#06B6D4'), group: 'solid', label: 'Cyan' },
  sky: { stops: solid('#0EA5E9'), group: 'solid', label: 'Sky' },
  blue: { stops: solid('#3B82F6'), group: 'solid', label: 'Blue' },
  indigo: { stops: solid('#6366F1'), group: 'solid', label: 'Indigo' },
  violet: { stops: solid('#8B5CF6'), group: 'solid', label: 'Violet' },
  purple: { stops: solid('#A855F7'), group: 'solid', label: 'Purple' },
  fuchsia: { stops: solid('#D946EF'), group: 'solid', label: 'Fuchsia' },
  pink: { stops: solid('#EC4899'), group: 'solid', label: 'Pink' },
  rose: { stops: solid('#F43F5E'), group: 'solid', label: 'Rose' },
  crimson: { stops: solid('#BE123C'), group: 'solid', label: 'Crimson' },
  maroon: { stops: solid('#881337'), group: 'solid', label: 'Maroon' },
  forest: { stops: solid('#166534'), group: 'solid', label: 'Forest' },
  navy: { stops: solid('#1E3A8A'), group: 'solid', label: 'Navy' },
  cobalt: { stops: solid('#1D4ED8'), group: 'solid', label: 'Cobalt' },
  rust: { stops: solid('#C2410C'), group: 'solid', label: 'Rust' },
  gold: { stops: solid('#CA8A04'), group: 'solid', label: 'Gold' },

  // Pastels
  'pastel-blush': { stops: solid('#FECDD3'), group: 'pastel', label: 'Blush' },
  'pastel-peach': { stops: solid('#FED7AA'), group: 'pastel', label: 'Peach' },
  'pastel-lemon': { stops: solid('#FEF08A'), group: 'pastel', label: 'Lemon' },
  'pastel-mint': { stops: solid('#A7F3D0'), group: 'pastel', label: 'Mint' },
  'pastel-seafoam': { stops: solid('#99F6E4'), group: 'pastel', label: 'Seafoam' },
  'pastel-sky': { stops: solid('#BAE6FD'), group: 'pastel', label: 'Sky' },
  'pastel-periwinkle': { stops: solid('#C7D2FE'), group: 'pastel', label: 'Periwinkle' },
  'pastel-lilac': { stops: solid('#E9D5FF'), group: 'pastel', label: 'Lilac' },
  'pastel-rose': { stops: solid('#FBCFE8'), group: 'pastel', label: 'Rose' },
  'pastel-sage': { stops: solid('#BBF7D0'), group: 'pastel', label: 'Sage' },
  'pastel-lavender': { stops: solid('#DDD6FE'), group: 'pastel', label: 'Lavender' },
  'pastel-coral': { stops: solid('#FECACA'), group: 'pastel', label: 'Coral' },
  'pastel-butter': { stops: solid('#FDE68A'), group: 'pastel', label: 'Butter' },
  'pastel-ice': { stops: solid('#E0F2FE'), group: 'pastel', label: 'Ice' },
  'pastel-mauve': { stops: solid('#F5D0FE'), group: 'pastel', label: 'Mauve' },

  // Gradients
  'blue-gradient': { stops: gradient('#6280D5', '#3A508C'), group: 'gradient', label: 'Blue dusk' },
  'teal-gradient': { stops: gradient('#64C4D8', '#3A8D5B'), group: 'gradient', label: 'Teal meadow' },
  'orange-gradient': { stops: gradient('#F5A623', '#D95763'), group: 'gradient', label: 'Sunset spice' },
  'sunset-gradient': { stops: gradient('#FF5F6D', '#FFC371'), group: 'gradient', label: 'Sunset' },
  'forest-gradient': { stops: gradient('#134E5E', '#71B280'), group: 'gradient', label: 'Forest' },
  'aurora-gradient': { stops: gradient('#22D3EE', '#6366F1', '#EC4899'), group: 'gradient', label: 'Aurora' },
  'candy-gradient': { stops: gradient('#F472B6', '#FACC15', '#34D399'), group: 'gradient', label: 'Candy' },
  'ocean-gradient': { stops: gradient('#0EA5E9', '#1D4ED8', '#0F766E'), group: 'gradient', label: 'Ocean' },
  'berry-gradient': { stops: gradient('#BE185D', '#7C3AED', '#312E81'), group: 'gradient', label: 'Berry night' },
  'citrus-gradient': { stops: gradient('#FDE047', '#F97316', '#EF4444'), group: 'gradient', label: 'Citrus' },
  'meadow-gradient': { stops: gradient('#84CC16', '#22C55E', '#14B8A6'), group: 'gradient', label: 'Meadow' },
  'lavender-gradient': { stops: gradient('#C4B5FD', '#818CF8', '#F0ABFC'), group: 'gradient', label: 'Lavender' },
  'peach-gradient': { stops: gradient('#FDBA74', '#FB7185', '#FDE68A'), group: 'gradient', label: 'Peach glow' },
  'midnight-gradient': { stops: gradient('#1E1B4B', '#312E81', '#4C1D95'), group: 'gradient', label: 'Midnight' },
  'dawn-gradient': { stops: gradient('#FDE68A', '#FDA4AF', '#C4B5FD'), group: 'gradient', label: 'Dawn' },
  'tropical-gradient': { stops: gradient('#2DD4BF', '#38BDF8', '#A78BFA'), group: 'gradient', label: 'Tropical' },
  'ember-gradient': { stops: gradient('#7F1D1D', '#EA580C', '#FACC15'), group: 'gradient', label: 'Ember' },
  'frost-gradient': { stops: gradient('#E0F2FE', '#BAE6FD', '#7DD3FC'), group: 'gradient', label: 'Frost' },
  'rosegold-gradient': { stops: gradient('#F9A8D4', '#FDE68A', '#FDBA74'), group: 'gradient', label: 'Rose gold' },
  'sapphire-gradient': { stops: gradient('#1E40AF', '#3B82F6', '#67E8F9'), group: 'gradient', label: 'Sapphire' },
  'moss-gradient': { stops: gradient('#365314', '#4D7C0F', '#A3E635'), group: 'gradient', label: 'Moss' },
  'wine-gradient': { stops: gradient('#4C0519', '#9F1239', '#FB7185'), group: 'gradient', label: 'Wine' },
  'honey-gradient': { stops: gradient('#FEF3C7', '#FCD34D', '#F59E0B'), group: 'gradient', label: 'Honey' },
  'cosmic-gradient': { stops: gradient('#0F172A', '#4C1D95', '#DB2777'), group: 'gradient', label: 'Cosmic' },
  'spring-gradient': { stops: gradient('#BBF7D0', '#86EFAC', '#FDE68A'), group: 'gradient', label: 'Spring' },
};

/** Legacy flat map used by PixelAvatar rendering. */
export const BACKGROUNDS: Record<string, { stops: AvatarBackgroundStop[] }> = Object.fromEntries(
  Object.entries(AVATAR_BACKGROUNDS).map(([key, value]) => [key, { stops: value.stops }]),
);
