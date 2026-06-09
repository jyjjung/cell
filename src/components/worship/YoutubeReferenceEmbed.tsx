"use client";

import { useState } from 'react';
import { Play, Youtube } from 'lucide-react';
import { parseYoutubeVideoId } from '@/lib/worship-utils';
import { cn } from '@/lib/utils';

export function YoutubeReferenceEmbed({
  url,
  variant = 'bar',
}: {
  url: string;
  variant?: 'bar' | 'large';
}) {
  const [playing, setPlaying] = useState(false);
  const videoId = parseYoutubeVideoId(url);
  if (!videoId) return null;

  if (playing) {
    return (
      <div
        className={cn(
          'rounded-xl overflow-hidden bg-black w-full',
          variant === 'large' ? 'aspect-video max-w-2xl mx-auto' : 'aspect-video max-w-md',
        )}
      >
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title="YouTube reference track"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (variant === 'large') {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="relative w-full max-w-2xl mx-auto aspect-video rounded-xl overflow-hidden border border-white/20 group"
        aria-label="Play reference track"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt="YouTube thumbnail"
          className="w-full h-full object-cover"
        />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 group-hover:bg-black/50 transition-colors">
          <Play className="h-12 w-12 text-white fill-white" />
          <span className="text-sm font-bold text-white">Play reference track</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="flex items-center gap-3 w-full rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 transition-colors text-left"
      aria-label="Play reference track"
    >
      <div className="relative w-14 h-10 rounded-lg overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt=""
          className="w-full h-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Play className="h-4 w-4 text-white fill-white" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1">
          <Youtube className="h-3 w-3 text-red-400" /> Reference track
        </p>
        <p className="text-xs font-semibold text-white truncate">Tap to play</p>
      </div>
    </button>
  );
}
