"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";

type LightPhase = "dawn" | "morning" | "afternoon" | "sunset";
type DarkPhase = "thunder-clouds" | "rain" | "thunder" | "moon-clear";

function getLightPhaseByHour(now: Date): LightPhase {
  const h = now.getHours();
  if (h >= 5 && h < 9) return "dawn";
  if (h >= 9 && h < 13) return "morning";
  if (h >= 13 && h < 17) return "afternoon";
  return "sunset";
}

function getDarkPhaseByHour(now: Date): DarkPhase {
  const h = now.getHours();
  if (h >= 20 || h < 1) return "thunder-clouds";
  if (h >= 1 && h < 4) return "rain";
  if (h >= 4 && h < 7) return "thunder";
  return "moon-clear";
}

const LIGHT_IMAGES: Record<LightPhase, string> = {
  dawn: "/wallpapers/light-dawn.svg",
  morning: "/wallpapers/light-morning.svg",
  afternoon: "/wallpapers/light-afternoon.svg",
  sunset: "/wallpapers/light-sunset.svg",
};

const DARK_IMAGES: Record<DarkPhase, string> = {
  "thunder-clouds": "/wallpapers/dark-thunder-clouds.svg",
  rain: "/wallpapers/dark-rain.svg",
  thunder: "/wallpapers/dark-thunder.svg",
  "moon-clear": "/wallpapers/dark-moon-clear.svg",
};

const PHASE_STYLE_LIGHT: Record<LightPhase, { filter: string; overlay: string; baseVeil: string }> = {
  dawn: {
    filter: "saturate(1.08) brightness(0.96)",
    overlay: "rgba(255, 165, 112, 0.16)",
    baseVeil: "rgba(12, 18, 30, 0.18)",
  },
  morning: {
    filter: "saturate(1.04) brightness(0.98) contrast(1.03)",
    overlay: "rgba(105, 194, 255, 0.08)",
    baseVeil: "rgba(12, 18, 30, 0.14)",
  },
  afternoon: {
    filter: "saturate(1.06) brightness(0.97) contrast(1.02)",
    overlay: "rgba(110, 203, 234, 0.11)",
    baseVeil: "rgba(10, 15, 24, 0.16)",
  },
  sunset: {
    filter: "saturate(1.12) brightness(0.82)",
    overlay: "rgba(124, 84, 176, 0.24)",
    baseVeil: "rgba(10, 14, 25, 0.26)",
  },
};

const PHASE_STYLE_DARK: Record<DarkPhase, { filter: string; overlay: string; baseVeil: string }> = {
  "thunder-clouds": {
    filter: "saturate(1.02) brightness(0.88) contrast(1.16)",
    overlay: "rgba(28, 36, 66, 0.18)",
    baseVeil: "rgba(2, 4, 8, 0.16)",
  },
  rain: {
    filter: "saturate(1.03) brightness(0.84) contrast(1.18)",
    overlay: "rgba(36, 50, 86, 0.2)",
    baseVeil: "rgba(2, 4, 8, 0.2)",
  },
  thunder: {
    filter: "saturate(1.0) brightness(0.8) contrast(1.2)",
    overlay: "rgba(26, 40, 74, 0.22)",
    baseVeil: "rgba(2, 4, 8, 0.22)",
  },
  "moon-clear": {
    filter: "saturate(1.04) brightness(0.9) contrast(1.16)",
    overlay: "rgba(34, 48, 82, 0.16)",
    baseVeil: "rgba(2, 4, 8, 0.14)",
  },
};

export default function DynamicLakeWallpaper() {
  const [lightPhase, setLightPhase] = useState<LightPhase>(() => getLightPhaseByHour(new Date()));
  const [darkPhase, setDarkPhase] = useState<DarkPhase>(() => getDarkPhaseByHour(new Date()));
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLightPhase(getLightPhaseByHour(now));
      setDarkPhase(getDarkPhaseByHour(now));
    };

    tick();
    const id = window.setInterval(tick, 1000 * 60 * 5);
    return () => window.clearInterval(id);
  }, []);

  const isDark = resolvedTheme === "dark";
  const image = isDark ? DARK_IMAGES[darkPhase] : LIGHT_IMAGES[lightPhase];
  const phaseStyle = useMemo(
    () => (isDark ? PHASE_STYLE_DARK[darkPhase] : PHASE_STYLE_LIGHT[lightPhase]),
    [darkPhase, lightPhase, isDark]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-[1200ms]"
        style={{
          backgroundImage: `url("${image}")`,
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
      {isDark && (
        <div
          className="absolute inset-0 transition-opacity duration-[1200ms]"
          style={{
            backgroundImage:
              "radial-gradient(110% 85% at 50% 28%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 34%, rgba(0,0,0,0.18) 100%)",
            mixBlendMode: "soft-light",
            opacity: 0.72,
          }}
        />
      )}
    </div>
  );
}
