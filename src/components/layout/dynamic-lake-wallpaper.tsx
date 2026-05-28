"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

type LakePhase = "night" | "dawn" | "day" | "dusk";

function fallbackPhaseByHour(now: Date): LakePhase {
  const h = now.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 18) return "day";
  if (h >= 18 && h < 20) return "dusk";
  return "night";
}

const LAKE_IMAGES: Record<LakePhase, string> = {
  dawn: "/wallpapers/lake-dawn.svg",
  day: "/wallpapers/lake-day.svg",
  dusk: "/wallpapers/lake-dusk.svg",
  night: "/wallpapers/lake-night.svg",
};

const PHASE_STYLE_LIGHT: Record<LakePhase, { filter: string; overlay: string; baseVeil: string }> = {
  dawn: {
    filter: "saturate(1.08) brightness(0.96)",
    overlay: "rgba(255, 165, 112, 0.16)",
    baseVeil: "rgba(12, 18, 30, 0.18)",
  },
  day: {
    filter: "saturate(1.04) brightness(0.98) contrast(1.03)",
    overlay: "rgba(105, 194, 255, 0.08)",
    baseVeil: "rgba(12, 18, 30, 0.14)",
  },
  dusk: {
    filter: "saturate(1.12) brightness(0.82)",
    overlay: "rgba(124, 84, 176, 0.24)",
    baseVeil: "rgba(10, 14, 25, 0.26)",
  },
  night: {
    filter: "saturate(0.9) brightness(0.53)",
    overlay: "rgba(17, 28, 62, 0.42)",
    baseVeil: "rgba(8, 12, 21, 0.34)",
  },
};

const PHASE_STYLE_DARK: Record<LakePhase, { filter: string; overlay: string; baseVeil: string }> = {
  dawn: {
    filter: "saturate(0.98) brightness(0.72) contrast(1.05)",
    overlay: "rgba(84, 64, 118, 0.28)",
    baseVeil: "rgba(6, 9, 16, 0.42)",
  },
  day: {
    filter: "saturate(0.95) brightness(0.68) contrast(1.07)",
    overlay: "rgba(53, 89, 152, 0.26)",
    baseVeil: "rgba(5, 8, 14, 0.46)",
  },
  dusk: {
    filter: "saturate(0.96) brightness(0.62) contrast(1.08)",
    overlay: "rgba(72, 56, 118, 0.32)",
    baseVeil: "rgba(4, 6, 12, 0.52)",
  },
  night: {
    filter: "saturate(0.9) brightness(0.50) contrast(1.08)",
    overlay: "rgba(18, 28, 58, 0.38)",
    baseVeil: "rgba(3, 5, 10, 0.58)",
  },
};

export default function DynamicLakeWallpaper() {
  const [phase, setPhase] = useState<LakePhase>(() => fallbackPhaseByHour(new Date()));
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const tick = () => {
      setPhase(fallbackPhaseByHour(new Date()));
    };

    tick();
    const id = window.setInterval(tick, 1000 * 60 * 5);
    return () => window.clearInterval(id);
  }, []);

  const phaseStyle = useMemo(
    () => (resolvedTheme === "dark" ? PHASE_STYLE_DARK[phase] : PHASE_STYLE_LIGHT[phase]),
    [phase, resolvedTheme]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-[1200ms]"
        style={{
          backgroundImage: `url("${LAKE_IMAGES[phase]}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: phaseStyle.filter,
        }}
      />
      <div
        className="absolute inset-0 transition-colors duration-[1200ms]"
        style={{ backgroundColor: phaseStyle.overlay }}
      />
      <div
        className="absolute inset-0 transition-colors duration-[1200ms]"
        style={{ backgroundColor: phaseStyle.baseVeil }}
      />
    </div>
  );
}
