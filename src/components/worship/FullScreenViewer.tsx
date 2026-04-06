"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight, Maximize, FileText } from 'lucide-react';
import { cn, isPdfUrl } from '@/lib/utils';
import type { ChordKey } from '@/types';

export interface ViewerSlide {
  imageUrl: string;
  songTitle: string;
  key: ChordKey;
  page: number;
  totalPages: number;
}

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (e) {
    window.open(url, '_blank');
  }
}

function KeyBadge({ keyName, accent = false }: { keyName: ChordKey; accent?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[11px] font-black tracking-tight border',
      accent
        ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
        : 'bg-muted/40 border-border/40 text-muted-foreground'
    )}>
      {keyName === 'numbers' ? '#' : keyName}
    </span>
  );
}

export function FullScreenViewer({
  slides, startIndex = 0, onClose,
}: { slides: ViewerSlide[]; startIndex?: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) setIdx(i => Math.min(i + 1, slides.length - 1));
    else         setIdx(i => Math.max(i - 1, 0));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setIdx(i => Math.max(i - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slides.length, onClose]);

  const slide = slides[idx];
  if (!slide) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black flex flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors shrink-0">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{slide.songTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <KeyBadge keyName={slide.key} accent />
                {slide.totalPages > 1 && (
                  <span className="text-white/40 text-[11px] font-bold">
                    pg {slide.page}/{slide.totalPages}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-white/40 text-xs font-bold">
              {idx + 1} / {slides.length}
            </span>
            <button
              onClick={() => {
                const isPdf = isPdfUrl(slide.imageUrl);
                const ext = isPdf ? '.pdf' : '.png';
                downloadFile(slide.imageUrl, `${slide.songTitle} - Key ${slide.key}${slide.totalPages > 1 ? ` (Pg ${slide.page})` : ''}${ext}`);
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download Chord Sheet">
              <Download className="h-5 w-5" />
            </button>
            {isPdfUrl(slide.imageUrl) && (
              <button
                onClick={() => window.open(slide.imageUrl, '_blank')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Open PDF in New Tab">
                <Maximize className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className={cn(
          "flex-1 flex flex-col px-0 sm:px-4 py-2 min-h-0 relative", // Remove side padding on mobile for full-width PDF
          isPdfUrl(slide.imageUrl) 
            ? "overflow-hidden" 
            : "items-center justify-center overflow-hidden"
        )}>
          {isPdfUrl(slide.imageUrl) ? (
            <div className="w-full h-full flex flex-col">
              <iframe
                src={`${slide.imageUrl}#toolbar=0&navpanes=0`}
                className="w-full flex-1 rounded-none sm:rounded-2xl border-none bg-white/5 shadow-2xl"
                title="PDF Chord Sheet"
                key={slide.imageUrl}
              />
              
              {/* Intelligent Mobile Fallback: Visible if iframe fails or on small screens */}
              <div className="flex flex-col items-center justify-center py-10 px-6 bg-black/20 border-t border-white/5 sm:hidden shrink-0">
                <FileText className="h-10 w-10 text-rose-500/50 mb-3" />
                <p className="text-white/80 text-sm font-bold text-center mb-1">
                  Viewing on Mobile?
                </p>
                <p className="text-white/40 text-xs text-center mb-5">
                  Some mobile browsers block embedded PDFs.
                </p>
                <button
                  onClick={() => window.open(slide.imageUrl, '_blank')}
                  className="w-full py-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-rose-500/20"
                >
                  <Maximize className="h-5 w-5" /> OPEN HIGH-RES PDF
                </button>
              </div>
            </div>
          ) : (
            <motion.img
              key={slide.imageUrl}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              src={slide.imageUrl}
              alt="chord sheet"
              className="max-w-full max-h-full object-contain rounded-2xl select-none"
              draggable={false}
            />
          )}
        </div>

        <div className="shrink-0 flex items-center justify-center gap-4 pb-8 pt-2 px-6">
          <button
            onClick={() => setIdx(i => Math.max(i - 1, 0))}
            disabled={idx === 0}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none text-white transition-colors backdrop-blur-sm">
            <ChevronLeft className="h-6 w-6" />
          </button>

          {slides.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIdx(i)}
                  className={cn(
                    'rounded-full transition-all',
                    i === idx ? 'w-4 h-2 bg-rose-500' : 'w-2 h-2 bg-white/25 hover:bg-white/50'
                  )}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => setIdx(i => Math.min(i + 1, slides.length - 1))}
            disabled={idx === slides.length - 1}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none text-white transition-colors backdrop-blur-sm">
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
