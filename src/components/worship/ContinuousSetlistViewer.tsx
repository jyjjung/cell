"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import {
  X, Download, ZoomIn, ZoomOut, Maximize, FileText, Headphones,
} from 'lucide-react';
import { RemoteImage } from '@/components/ui/remote-image';
import { cn, isPdfUrl } from '@/lib/utils';
import type { ChordKey } from '@/types';
import { TrackPicker, YoutubePlayerPanel } from '@/components/worship/YoutubeReferenceEmbed';
import type { ViewerSlide } from '@/components/worship/viewer-types';

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
  } catch {
    window.open(url, '_blank');
  }
}

function KeyBadge({ keyName }: { keyName: ChordKey }) {
  return (
    <span className="inline-flex min-w-[2rem] h-6 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-1.5 text-[11px] font-semibold tracking-tight text-white/80">
      {keyName === 'numbers' ? '#' : keyName}
    </span>
  );
}

function ChordPage({ url, pageIndex, songTitle }: { url: string; pageIndex: number; songTitle: string }) {
  if (isPdfUrl(url)) {
    return (
      <div className="flex w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5" style={{ minHeight: '70vh' }}>
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          className="min-h-[60vh] w-full flex-1 border-none bg-white/5"
          title={`${songTitle} PDF page ${pageIndex + 1}`}
        />
      </div>
    );
  }

  return (
    <RemoteImage
      src={url}
      alt={`${songTitle} page ${pageIndex + 1}`}
      width={1400}
      height={1800}
      draggable={false}
      className="block w-full h-auto rounded-xl"
      sizes="(max-width: 768px) 100vw, 48rem"
    />
  );
}

function SectionTitleBar({
  sectionIdx,
  title,
  keyName,
  hasTracks,
  listenOpen,
  isActive,
  onListen,
}: {
  sectionIdx: number;
  title: string;
  keyName: ChordKey;
  hasTracks: boolean;
  listenOpen: boolean;
  isActive: boolean;
  onListen: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {sectionIdx + 1}. {title}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <KeyBadge keyName={keyName} />
        {hasTracks && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onListen(); }}
            className={cn(
              'setlist-control inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors',
              listenOpen && isActive
                ? 'border-rose-400/40 bg-rose-500/20 text-rose-200'
                : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/20',
            )}
          >
            <Headphones className="h-3.5 w-3.5" />
            Listen
          </button>
        )}
      </div>
    </div>
  );
}

export function ContinuousSetlistViewer({
  slides,
  title,
  startIndex = 0,
  onClose,
}: {
  slides: ViewerSlide[];
  title?: string;
  startIndex?: number;
  onClose: () => void;
}) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<{
    zoomIn: (step?: number) => void;
    zoomOut: (step?: number) => void;
    resetTransform: () => void;
    zoomToElement: (node: HTMLElement, scale?: number, animationTime?: number) => void;
  } | null>(null);

  const [scale, setScale] = useState(1);
  const [activeSection, setActiveSection] = useState(startIndex);
  const [listenOpen, setListenOpen] = useState(false);
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const didInitialScroll = useRef(false);

  const activeSlide = slides[activeSection] ?? slides[0];
  const isZoomed = scale > 1.05;
  const zoomPct = Math.round(scale * 100);

  const contentWidth = 'min(100vw - 1.5rem, 48rem)';

  const centerContentHorizontally = useCallback((ref: ReactZoomPanPinchRef) => {
    const wrapper = ref.instance.wrapperComponent;
    const content = ref.instance.contentComponent;
    if (!wrapper || !content) return;
    const x = Math.max(0, (wrapper.offsetWidth - content.offsetWidth) / 2);
    ref.setTransform(x, ref.instance.transformState.positionY, ref.instance.transformState.scale);
  }, []);

  const updateActiveSectionFromView = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    let currentSection = 0;

    slides.forEach((_, i) => {
      const anchor = document.getElementById(`setlist-anchor-${i}`);
      if (!anchor) return;

      const anchorRect = anchor.getBoundingClientRect();
      if (anchorRect.top <= viewportRect.top + 96) currentSection = i;
    });

    setActiveSection((prev) => (prev === currentSection ? prev : currentSection));
  }, [slides]);

  const jumpToSection = useCallback((index: number, animationTime = 280) => {
    const clamped = Math.max(0, Math.min(index, slides.length - 1));
    setActiveSection(clamped);
    setActiveTrackIdx(0);
    const el = document.getElementById(`setlist-section-${clamped}`);
    if (el && controlsRef.current) {
      controlsRef.current.zoomToElement(el, scale, animationTime);
    }
  }, [slides.length, scale]);

  useEffect(() => {
    if (didInitialScroll.current) return;
    const timer = window.setTimeout(() => {
      if (startIndex > 0) {
        jumpToSection(startIndex, 0);
      } else if (transformRef.current) {
        centerContentHorizontally(transformRef.current);
      }
      updateActiveSectionFromView();
      didInitialScroll.current = true;
    }, 80);
    return () => window.clearTimeout(timer);
  }, [startIndex, jumpToSection, centerContentHorizontally, updateActiveSectionFromView]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const downloadAll = () => {
    slides.forEach((section) => {
      (section.imageUrls ?? []).forEach((url, i) => {
        window.setTimeout(
          () => downloadFile(
            url,
            `${section.songTitle} - ${section.key}${(section.imageUrls?.length ?? 0) > 1 ? ` pg${i + 1}` : ''}.jpg`,
          ),
          i * 300,
        );
      });
    });
  };

  const openListenForSection = (index: number) => {
    setActiveSection(index);
    setActiveTrackIdx(0);
    setListenOpen(true);
    jumpToSection(index);
  };

  const handleTransformChange = useCallback(() => {
    window.requestAnimationFrame(updateActiveSectionFromView);
  }, [updateActiveSectionFromView]);

  const controlBtn = 'p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30';

  const viewer = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex flex-col bg-black select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <button type="button" onClick={onClose} className={controlBtn} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{title || activeSlide?.songTitle}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-white/45">
                {slides.length} songs
              </span>
              {activeSlide && (
                <span className="truncate text-[11px] font-medium text-white/65">
                  · {activeSlide.songTitle}
                </span>
              )}
              {isZoomed && (
                <button
                  type="button"
                  onClick={() => controlsRef.current?.resetTransform()}
                  className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
                >
                  {zoomPct}% · Reset
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => controlsRef.current?.zoomOut(0.35)}
            disabled={scale <= 1.01}
            className={controlBtn}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => controlsRef.current?.zoomIn(0.35)}
            className={controlBtn}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => controlsRef.current?.resetTransform()}
            className={cn(controlBtn, 'hidden sm:inline-flex')}
            aria-label="Reset zoom"
          >
            <Maximize className="h-4 w-4" />
          </button>
          <button type="button" onClick={downloadAll} className={controlBtn} aria-label="Download all">
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={5}
          centerOnInit={false}
          limitToBounds
          centerZoomedOut={false}
          alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
          // Trackpad scroll on macOS often comes through as wheel events; without `wheelDisabled`,
          // the library interprets that as zoom. We keep pinch/ctrl+wheel zoom behavior,
          // and use wheel-based panning for normal two-finger scrolling.
          wheel={{ step: 0.12, smoothStep: 0.004, wheelDisabled: true }}
          pinch={{ step: 6 }}
          panning={{
            velocityDisabled: false,
            excluded: ['setlist-control'],
            wheelPanning: true,
          }}
          onInit={(ref) => {
            transformRef.current = ref;
            window.requestAnimationFrame(() => {
              centerContentHorizontally(ref);
              updateTitlePositions();
            });
          }}
          onPanning={handleTransformChange}
          onZoom={handleTransformChange}
          onTransformed={(_, state) => {
            setScale(state.scale);
            handleTransformChange();
          }}
        >
          {({ zoomIn, zoomOut, resetTransform, zoomToElement }) => {
            controlsRef.current = { zoomIn, zoomOut, resetTransform, zoomToElement };
            return (
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-fit !max-w-full"
              >
                <div
                  className="flex flex-col gap-8 px-3 pb-4 pt-1"
                  style={{ width: contentWidth }}
                >
                  {slides.map((section, sectionIdx) => {
                    const hasTracks = (section.referenceTracks?.length ?? 0) > 0;
                    return (
                      <section
                        key={`${section.songTitle}-${section.key}-${sectionIdx}`}
                        id={`setlist-section-${sectionIdx}`}
                        className={cn(
                          "flex w-full flex-col gap-3",
                          sectionIdx === 0 && "pt-16",
                        )}
                      >
                        <div id={`setlist-anchor-${sectionIdx}`} className="h-0 w-full shrink-0" aria-hidden />
                        <SectionTitleBar
                          sectionIdx={sectionIdx}
                          title={section.songTitle}
                          keyName={section.key}
                          hasTracks={hasTracks}
                          listenOpen={listenOpen}
                          isActive={activeSection === sectionIdx}
                          onListen={() => openListenForSection(sectionIdx)}
                        />
                        {(section.imageUrls ?? []).length > 0 ? (
                          (section.imageUrls ?? []).map((url, pageIdx) => (
                            <ChordPage
                              key={`${url}-${pageIdx}`}
                              url={url}
                              pageIndex={pageIdx}
                              songTitle={section.songTitle}
                            />
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
                            <FileText className="h-8 w-8 text-white/25" />
                            <p className="text-sm text-white/50">No chord sheets for this song</p>
                            {hasTracks && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openListenForSection(sectionIdx); }}
                                className="setlist-control mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                              >
                                <Headphones className="h-4 w-4" />
                                Play reference track
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </TransformComponent>
            );
          }}
        </TransformWrapper>
      </div>

      <div className="shrink-0 flex flex-col gap-2 border-t border-white/10 bg-black/90 px-4 pb-6 pt-3 backdrop-blur-md">
        {listenOpen && activeSlide?.referenceTracks && activeSlide.referenceTracks.length > 0 && (() => {
          const activeTrack = activeSlide.referenceTracks![activeTrackIdx] ?? activeSlide.referenceTracks![0];
          return (
            <div className="mx-auto w-full max-w-lg space-y-2">
              <TrackPicker
                tracks={activeSlide.referenceTracks!}
                activeIndex={activeTrackIdx}
                onSelect={setActiveTrackIdx}
                theme="dark"
              />
              <YoutubePlayerPanel
                key={activeTrack.url}
                url={activeTrack.url}
                note={activeTrack.note}
                enabled={listenOpen}
                onClose={() => setListenOpen(false)}
              />
            </div>
          );
        })()}

        {slides.length > 1 && (
          <div className="mx-auto flex w-full max-w-lg gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {slides.map((section, i) => (
              <button
                key={`${section.songTitle}-${section.key}-${i}`}
                type="button"
                onClick={() => jumpToSection(i)}
                title={`${section.songTitle} (${section.key})`}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  i === activeSection
                    ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
                    : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white',
                )}
              >
                {i + 1}. {section.songTitle}
                {(section.referenceTracks?.length ?? 0) > 0 ? ' ♪' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(viewer, document.body);
}
