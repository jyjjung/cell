"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, FileText } from 'lucide-react';
import { cn, isPdfUrl } from '@/lib/utils';
import type { ChordKey } from '@/types';

export interface ViewerSlide {
  songTitle: string;
  key: ChordKey;
  imageUrls: string[];
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
  } catch { window.open(url, '_blank'); }
}

function KeyBadge({ keyName, accent = false }: { keyName: ChordKey; accent?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[2rem] h-6 px-1.5 rounded-lg text-[11px] font-black tracking-tight border',
      accent ? 'bg-rose-500/15 border-rose-500/30 text-rose-500' : 'bg-muted/40 border-border/40 text-muted-foreground'
    )}>
      {keyName === 'numbers' ? '#' : keyName}
    </span>
  );
}

function useImagePreloader(slides: ViewerSlide[]) {
  useEffect(() => {
    const imgs = slides.flatMap(s => s.imageUrls ?? []).filter(u => !isPdfUrl(u)).map(url => {
      const img = new Image(); img.src = url; return img;
    });
    return () => { imgs.forEach(img => { img.src = ''; }); };
  }, [slides]);
}

export function FullScreenViewer({
  slides, startIndex = 0, onClose,
}: { slides: ViewerSlide[]; startIndex?: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);

  // Pixel width of images — drives zoom. null = CSS-contained (loading state).
  // We use pixel width (not CSS transform) so the scroll container always
  // matches the content size exactly — no blank overflow areas.
  const [imgPxWidth, setImgPxWidth] = useState<number | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const scrollRef     = useRef<HTMLDivElement>(null);
  const fitWidthRef   = useRef<number>(0); // the "fit-to-page" pixel width

  // Pinch tracking
  const lastPinchDist = useRef<number | null>(null);
  const pinchStartW   = useRef<number>(0);
  const isPinching    = useRef(false);
  const swipeStartX   = useRef<number | null>(null);

  useImagePreloader(slides);

  // Reset when slide changes
  useEffect(() => {
    setImgPxWidth(null); // trigger re-fit on image load
    fitWidthRef.current = 0;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [idx]);

  // Calculate the "fit the whole page" pixel width from the first image's natural dims
  const handleFirstImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    if (!container || fitWidthRef.current > 0) return;

    const cW = container.clientWidth;
    const cH = container.clientHeight;
    const aspect = img.naturalWidth / img.naturalHeight;

    // Fit-to-contain: largest size where BOTH width and height fit
    const fitByWidth  = cW;
    const fitByHeight = cH * aspect;
    const fitW = Math.min(fitByWidth, fitByHeight);

    fitWidthRef.current = fitW;
    setImgPxWidth(fitW);
  }, []);

  const clampWidth = useCallback((w: number) => {
    const cW = containerRef.current?.clientWidth ?? 400;
    return Math.max(cW * 0.25, Math.min(cW * 6, w));
  }, []);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0));
      if (e.key === '=' || e.key === '+') setImgPxWidth(w => clampWidth((w ?? fitWidthRef.current) * 1.25));
      if (e.key === '-') setImgPxWidth(w => clampWidth((w ?? fitWidthRef.current) / 1.25));
      if (e.key === '0') setImgPxWidth(fitWidthRef.current || null);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [slides.length, onClose, clampWidth]);

  // ── Touch ─────────────────────────────────────────────────────────────────
  const getTouchDist = (t: React.TouchList | TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current) {
      if (e.cancelable) e.preventDefault(); // Block native zoom
      isPinching.current = true;
      const dist  = getTouchDist(e.touches);
      const ratio = dist / lastPinchDist.current;
      setImgPxWidth(clampWidth(pinchStartW.current * ratio));
    }
  }, [clampWidth]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (e.touches.length === 0) {
      const wasPinching   = isPinching.current;
      isPinching.current  = false;
      lastPinchDist.current = null;

      const currentW = imgPxWidth ?? fitWidthRef.current;
      const cW       = containerRef.current?.clientWidth ?? 400;
      const isAtFit  = Math.abs(currentW - fitWidthRef.current) < 2;

      if (!wasPinching && isAtFit && swipeStartX.current !== null) {
        const dx = e.changedTouches[0].clientX - swipeStartX.current;
        if (Math.abs(dx) > 55) {
          if (dx < 0) setIdx(i => Math.min(i + 1, slides.length - 1));
          else        setIdx(i => Math.max(i - 1, 0));
        }
      }
      swipeStartX.current = null;
    }
  }, [imgPxWidth, slides.length]);

  const handleTouchStartRaw = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      isPinching.current  = true;
      swipeStartX.current = null;
      lastPinchDist.current = getTouchDist(e.touches);
      pinchStartW.current   = imgPxWidth ?? fitWidthRef.current;
    } else if (e.touches.length === 1 && !isPinching.current) {
      swipeStartX.current = e.touches[0].clientX;
    }
  }, [imgPxWidth]);

  // Use useEffect to attach non-passive listeners to block native zoom
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.93 : 1.07;
        setImgPxWidth(w => clampWidth((w ?? fitWidthRef.current) * factor));
      }
    };

    scrollEl.addEventListener('touchstart', handleTouchStartRaw, { passive: false });
    scrollEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    scrollEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    scrollEl.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      scrollEl.removeEventListener('touchstart', handleTouchStartRaw);
      scrollEl.removeEventListener('touchmove', handleTouchMove);
      scrollEl.removeEventListener('touchend', handleTouchEnd);
      scrollEl.removeEventListener('wheel', onWheel);
    };
  }, [handleTouchStartRaw, handleTouchMove, handleTouchEnd, clampWidth]);

  const resetZoom = () => setImgPxWidth(fitWidthRef.current || null);

  const slide = slides[idx];
  if (!slide) return null;

  const currentW  = imgPxWidth ?? fitWidthRef.current;
  const fitW      = fitWidthRef.current;
  const zoomPct   = fitW > 0 ? Math.round((currentW / fitW) * 100) : 100;
  const isZoomed  = fitW > 0 && Math.abs(currentW - fitW) > 3;

  const viewerContent = (
    <AnimatePresence>
        <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black flex flex-col select-none"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white shrink-0">
              <X className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{slide.songTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <KeyBadge keyName={slide.key} accent />
                {(slide.imageUrls?.length ?? 0) > 1 && (
                  <span className="text-white/40 text-[11px] font-bold">{slide.imageUrls.length} pages</span>
                )}
                {isZoomed && (
                  <button onClick={resetZoom}
                    className="text-[10px] font-black text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                    {zoomPct}% · Reset
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-white/40 text-xs font-bold mr-1">{idx + 1} / {slides.length}</span>
            <button onClick={() => setImgPxWidth(w => clampWidth((w ?? fitWidthRef.current) / 1.35))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white" title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </button>
            <button onClick={() => setImgPxWidth(w => clampWidth((w ?? fitWidthRef.current) * 1.35))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white" title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </button>
            <button onClick={() => (slide.imageUrls ?? []).forEach((url, i) =>
              setTimeout(() => downloadFile(url, `${slide.songTitle} - ${slide.key}${(slide.imageUrls?.length ?? 0) > 1 ? ` pg${i + 1}` : ''}.jpg`), i * 300)
            )} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scroll container — always the right size, no blank overflow */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0"
        >
          <div
            ref={scrollRef}
            className="w-full h-full overflow-auto"
            style={{ touchAction: 'pan-y' }}
          >
            {/* Center column — images stack vertically, centered horizontally */}
            <div className="flex flex-col items-center gap-3 py-2 px-0 min-h-full justify-center">
              {(slide.imageUrls ?? []).map((url, i) => {
                if (isPdfUrl(url)) {
                  return (
                    <div key={url} className="w-full flex flex-col shrink-0" style={{ height: '85vh' }}>
                      <iframe src={`${url}#toolbar=0&navpanes=0`}
                        className="w-full flex-1 border-none bg-white/5" title={`PDF pg ${i + 1}`} />
                      <div className="flex flex-col items-center py-8 px-6 bg-black/20 sm:hidden">
                        <FileText className="h-10 w-10 text-rose-500/50 mb-3" />
                        <button onClick={() => window.open(url, '_blank')}
                          className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black flex items-center justify-center gap-3">
                          <Maximize className="h-5 w-5" /> OPEN PDF
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <img
                    key={url}
                    src={url}
                    alt={`chord sheet pg ${i + 1}`}
                    draggable={false}
                    onLoad={i === 0 ? handleFirstImageLoad : undefined}
                    style={{
                      // If we have a calculated pixel width, use it directly.
                      // This means the scroll container exactly wraps the content — no blank space.
                      // If not yet calculated, fall back to CSS contain so it fits on screen.
                      ...(imgPxWidth != null
                        ? { width: `${imgPxWidth}px`, height: 'auto', maxWidth: 'none' }
                        : { maxWidth: '100%', maxHeight: 'calc(100vh - 140px)', width: 'auto', height: 'auto', objectFit: 'contain' }
                      ),
                      display: 'block',
                      borderRadius: 12,
                      pointerEvents: 'none',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="shrink-0 flex items-center justify-center gap-4 pb-6 pt-2 px-6">
          <button onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx === 0}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none text-white backdrop-blur-sm">
            <ChevronLeft className="h-6 w-6" />
          </button>
          {slides.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center max-w-[55vw]">
              {slides.map((s, i) => (
                <button key={i} onClick={() => setIdx(i)} title={`${s.songTitle} (${s.key})`}
                  className={cn('rounded-full transition-all',
                    i === idx ? 'w-4 h-2 bg-rose-500' : 'w-2 h-2 bg-white/25 hover:bg-white/50')} />
              ))}
            </div>
          )}
          <button onClick={() => setIdx(i => Math.min(i + 1, slides.length - 1))} disabled={idx === slides.length - 1}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:pointer-events-none text-white backdrop-blur-sm">
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(viewerContent, document.body);
}
