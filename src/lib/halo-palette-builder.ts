export type HaloPalette = {
  accent: string;
  ring: string;
  innerRing: string;
  bloom: string;
  bloomSoft: string;
  shimmer?: string;
  glow: string;
};

function hsla(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

/** Build a vivid circular halo palette from a base hue (0–360). */
export function buildHaloPalette(hue: number, variant = 0): HaloPalette {
  const h = (hue + variant * 17) % 360;
  const h2 = (h + 42) % 360;
  const h3 = (h + 84) % 360;
  const h4 = (h + 126) % 360;

  const accent = hsla(h, 78, 62, 0.92);
  const glow = hsla(h, 80, 58, 0.48);

  return {
    accent,
    ring: `conic-gradient(from ${195 + variant * 8}deg, ${hsla(h, 82, 48)}, ${hsla(h2, 76, 56)}, ${hsla(h3, 70, 72)}, ${hsla(h4, 78, 42)}, ${hsla(h, 80, 52)}, ${hsla(h, 82, 48)})`,
    innerRing: `conic-gradient(from ${175 + variant * 6}deg, ${hsla(h, 78, 58)}, ${hsla(h2, 74, 52)}, ${hsla(h3, 55, 88)}, ${hsla(h4, 76, 46)}, ${hsla(h, 78, 58)})`,
    bloom: `radial-gradient(circle at 28% 24%, ${hsla(h, 80, 55, 0.55)}, transparent 62%), radial-gradient(circle at 72% 76%, ${hsla(h2, 75, 50, 0.48)}, transparent 58%)`,
    bloomSoft: `radial-gradient(circle, ${hsla(h, 70, 65, 0.32)}, transparent 70%)`,
    shimmer: `conic-gradient(from ${60 + variant * 12}deg, transparent, ${hsla(h3, 40, 95, 0.55)}, transparent)`,
    glow,
  };
}
