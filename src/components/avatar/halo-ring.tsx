"use client";

import type { HaloPowerLevel, HaloStylePreset } from '@/lib/avatar-cosmetics';
import { cn } from '@/lib/utils';
import { HALO_PALETTES } from './halo-palette';

function HaloMask({ insetPercent }: { insetPercent: number }) {
  return (
    <span
      className="absolute rounded-full bg-background/[0.84] backdrop-blur-[2px] dark:bg-background/[0.9]"
      style={{ inset: `${insetPercent}%` }}
    />
  );
}

function SparkleOrbs({ color }: { color: string }) {
  const dots = [
    { top: '6%', left: '50%', delay: '0s' },
    { top: '50%', left: '94%', delay: '0.4s' },
    { top: '88%', left: '22%', delay: '0.8s' },
    { top: '28%', left: '8%', delay: '1.2s' },
  ];
  return (
    <>
      {dots.map((dot) => (
        <span
          key={`${dot.top}-${dot.left}`}
          className="absolute h-1 w-1 rounded-full animate-pulse-subtle motion-reduce:animate-none"
          style={{
            top: dot.top,
            left: dot.left,
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
            animationDelay: dot.delay,
          }}
        />
      ))}
    </>
  );
}

interface HaloRingProps {
  preset: HaloStylePreset;
  powerLevel: HaloPowerLevel;
}

export function HaloRing({ preset, powerLevel }: HaloRingProps) {
  if (preset === 'none' || powerLevel === 0) return null;

  const palette = HALO_PALETTES[preset];
  if (!palette) return null;

  // Level 1 — whisper: thin static ring only
  if (powerLevel === 1) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <span
          className="absolute -inset-[0.5%] rounded-full border-[1.5px] opacity-70"
          style={{ borderColor: palette.accent }}
        />
        <HaloMask insetPercent={4} />
      </div>
    );
  }

  // Level 2 — glimmer: soft glow + thin gradient rim, no motion
  if (powerLevel === 2) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <span
          className="absolute -inset-[8%] rounded-full blur-md opacity-40"
          style={{ background: palette.bloomSoft }}
        />
        <span
          className="absolute -inset-[1.5%] rounded-full opacity-80"
          style={{ background: palette.ring }}
        />
        <span
          className="absolute -inset-[0.5%] rounded-full border border-white/20 dark:border-white/10"
          style={{ borderColor: palette.accent }}
        />
        <HaloMask insetPercent={7} />
      </div>
    );
  }

  // Level 3 — arc: single spinning band + light bloom
  if (powerLevel === 3) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
        <span
          className="absolute -inset-[10%] rounded-full blur-lg opacity-45"
          style={{ background: palette.bloomSoft }}
        />
        <span
          className={cn(
            'absolute -inset-[2.5%] rounded-full opacity-90 motion-reduce:animate-none animate-halo-spin-slow',
          )}
          style={{ background: palette.ring, boxShadow: `0 0 12px ${palette.glow}` }}
        />
        <span
          className="absolute -inset-[1%] rounded-full opacity-75"
          style={{ background: palette.innerRing }}
        />
        <HaloMask insetPercent={10} />
        <span
          className="absolute rounded-full border border-white/25 dark:border-white/15"
          style={{ inset: '8.5%', borderColor: palette.accent }}
        />
      </div>
    );
  }

  // Level 4 — radiance: full bloom, dual rings, shimmer optional
  if (powerLevel === 4) {
    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
        <span
          className="absolute -inset-[14%] rounded-full blur-xl opacity-60"
          style={{ background: palette.bloom }}
        />
        <span
          className="absolute -inset-[9%] rounded-full blur-md opacity-50"
          style={{ background: palette.bloomSoft }}
        />
        <span
          className={cn(
            'absolute -inset-[3.5%] rounded-full opacity-95 motion-reduce:animate-none animate-halo-spin',
          )}
          style={{ background: palette.ring, boxShadow: `0 0 20px ${palette.glow}` }}
        />
        {palette.shimmer ? (
          <span
            className={cn(
              'absolute -inset-[3.5%] rounded-full opacity-40 mix-blend-overlay motion-reduce:animate-none animate-halo-spin-reverse',
            )}
            style={{ background: palette.shimmer }}
          />
        ) : null}
        <span
          className="absolute -inset-[1.5%] rounded-full opacity-90"
          style={{ background: palette.innerRing }}
        />
        <HaloMask insetPercent={11} />
        <span
          className="absolute rounded-full border-[1.5px]"
          style={{ inset: '9%', borderColor: palette.accent }}
        />
        <span
          className="absolute rounded-full opacity-35"
          style={{
            inset: '7%',
            background: 'conic-gradient(from 300deg, transparent, rgba(255,255,255,0.3) 28deg, transparent 72deg)',
          }}
        />
      </div>
    );
  }

  // Level 5 — ascended: maximum presence (master tier)
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-visible" aria-hidden>
      <span
        className="absolute -inset-[24%] rounded-full blur-3xl opacity-75 motion-reduce:opacity-55 animate-pulse-subtle motion-reduce:animate-none"
        style={{ background: palette.bloom }}
      />
      <span
        className="absolute -inset-[16%] rounded-full blur-2xl opacity-65"
        style={{ background: palette.bloomSoft }}
      />
      <span
        className={cn(
          'absolute -inset-[7%] rounded-full opacity-50 motion-reduce:animate-none animate-halo-spin-slow',
        )}
        style={{ background: palette.ring, filter: 'blur(1px)' }}
      />
      <span
        className={cn(
          'absolute -inset-[4%] rounded-full opacity-100 motion-reduce:animate-none animate-halo-spin',
        )}
        style={{
          background: palette.ring,
          boxShadow: `0 0 28px ${palette.glow}, 0 0 56px ${palette.glow}`,
        }}
      />
      <span
        className={cn(
          'absolute -inset-[4%] rounded-full opacity-55 mix-blend-overlay motion-reduce:animate-none animate-halo-spin-reverse',
        )}
        style={{ background: palette.shimmer || 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.45), transparent)' }}
      />
      <span
        className={cn(
          'absolute -inset-[2%] rounded-full opacity-95 motion-reduce:animate-none animate-halo-spin-slow',
        )}
        style={{ background: palette.innerRing }}
      />
      <HaloMask insetPercent={12} />
      <span
        className="absolute rounded-full border-2"
        style={{ inset: '9.5%', borderColor: palette.accent }}
      />
      <span
        className="absolute rounded-full opacity-50"
        style={{
          inset: '7%',
          background: 'conic-gradient(from 280deg, transparent, rgba(255,255,255,0.45) 32deg, transparent 78deg)',
        }}
      />
      <SparkleOrbs color={palette.glow} />
    </div>
  );
}
