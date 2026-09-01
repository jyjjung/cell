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
  X, Download, ZoomIn, ZoomOut, Maximize, FileText, Headphones, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { RemoteImage } from '@/components/ui/remote-image';
import { cn, isPdfUrl } from '@/lib/utils';
import { filesFromViewerSlides } from '@/lib/setlist-download';
import { DownloadCancelledError, downloadNamedFiles } from '@/lib/setlist-download-client';
import type { ChordKey } from '@/types';
import { TrackPicker, YoutubePlayerPanel } from '@/components/worship/YoutubeReferenceEmbed';
import type { ViewerSlide } from '@/components/worship/viewer-types';
import { EmbeddedTextChart } from '@/components/worship/text-chord-chart-viewer';
import {
  useViewerTheme,
  viewerControlBtn,
  viewerEmptyState,
  viewerFooter,
  viewerKeyBadge,
  viewerListenBtn,
  viewerSectionBar,
  viewerShell,
  viewerTitleMuted,
  viewerTitlePrimary,
  viewerZoomBadge,
} from '@/components/worship/viewer-theme';

function KeyBadge({ keyName, isDark }: { keyName: ChordKey; isDark: boolean }) {
  return (
    <span className={viewerKeyBadge(isDark)}>
      {keyName === 'numbers' ? '#' : keyName}
    </span>
  );
}

function SectionTitleBar({
  sectionIdx,
  title,
  keyName,
  hasTracks,
  listening,
  isDark,
  onListen,
}: {
  sectionIdx: number;
  title: string;
  keyName: ChordKey;
  hasTracks: boolean;
  listening: boolean;
  isDark: boolean;
  onListen: () => void;
}) {
  return (
    <div className={cn(viewerSectionBar(isDark), 'rounded-none border-x-0 leading-normal')}>
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold', viewerTitlePrimary(isDark))}>
          {sectionIdx + 1}. {title}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <KeyBadge keyName={keyName} isDark={isDark} />
        {hasTracks && (
          <Button
            type="button"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onListen(); }}
            className={cn(
              'setlist-control inline-flex h-auto items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold',
              viewerListenBtn(isDark, listening),
            )}
          >
            <Headphones className="h-3.5 w-3.5" />
            Listen
          </Button>
        )}
      </div>
    </div>
  );
}

function ChordPage({
  url, pageIndex, songTitle,
}: { url: string; pageIndex: number; songTitle: string }) {
  if (isPdfUrl(url)) {
    return (
      <div className="flex w-full flex-col bg-white leading-[0]" style={{ minHeight: '70vh' }}>
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          className="min-h-[60vh] w-full flex-1 border-none bg-white"
          title={`${songTitle} PDF page ${pageIndex + 1}`}
        />
      </div>
    );
  }

  return (
    <div className="leading-[0]">
      <RemoteImage
        src={url}
        alt={`${songTitle} page ${pageIndex + 1}`}
        width={1400}
        height={1800}
        draggable={false}
        className="block h-auto w-full rounded-none"
        sizes="(max-width: 768px) 100vw, 56rem"
      />
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
  // Pinned to the song the user started, not the one in view, so scrolling
  // through the setlist doesn't interrupt playback.
  const [listenSection, setListenSection] = useState<number | null>(null);
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const didInitialScroll = useRef(false);
  const viewerTheme = useViewerTheme();
  const isDark = viewerTheme === 'dark';

  const activeSlide = slides[activeSection] ?? slides[0];
  const isZoomed = Math.abs(scale - 1) > 0.05;
  const zoomPct = Math.round(scale * 100);
  const minScale = 0.35;

  const contentWidth = 'min(100vw, 56rem)';

  /** Lock horizontal position when the scaled page is narrower than the viewport. */
  const centerHorizontallyIfFits = useCallback((ref: ReactZoomPanPinchRef, animationTime = 0) => {
    const wrapper = ref.instance.wrapperComponent;
    const content = ref.instance.contentComponent;
    if (!wrapper || !content) return;

    const { scale, positionY, positionX } = ref.instance.transformState;
    const scaledWidth = content.offsetWidth * scale;
    if (scaledWidth >= wrapper.offsetWidth - 0.5) return;

    const targetX = (wrapper.offsetWidth - scaledWidth) / 2;
    if (Math.abs(positionX - targetX) < 0.5) return;
    ref.setTransform(targetX, positionY, scale, animationTime);
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
        centerHorizontallyIfFits(transformRef.current);
      }
      updateActiveSectionFromView();
      didInitialScroll.current = true;
    }, 80);
    return () => window.clearTimeout(timer);
  }, [startIndex, jumpToSection, centerHorizontallyIfFits, updateActiveSectionFromView]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      if (transformRef.current) {
        centerHorizontallyIfFits(transformRef.current);
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [centerHorizontallyIfFits]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const downloadAll = async () => {
    if (downloading) return;
    const files = filesFromViewerSlides(slides);
    if (files.length === 0) {
      setDownloadError('No chord sheets to download');
      return;
    }
    setDownloading(true);
    setDownloadError(null);
    setDownloadProgress(`Saving 0 of ${files.length}`);
    try {
      await downloadNamedFiles(files, {
        onProgress: (done, total) => setDownloadProgress(`Saving ${done} of ${total}`),
      });
    } catch (error) {
      if (error instanceof DownloadCancelledError) {
        setDownloadError('Choose a folder to save every photo');
      } else {
        setDownloadError('Couldn’t save the photos');
      }
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  };

  const openListenForSection = (index: number) => {
    setActiveSection(index);
    setActiveTrackIdx(0);
    setListenSection((current) => (current === index ? null : index));
    jumpToSection(index);
  };

  const handleTransformChange = useCallback(() => {
    window.requestAnimationFrame(updateActiveSectionFromView);
  }, [updateActiveSectionFromView]);

  const controlBtn = viewerControlBtn(isDark);

  const viewer = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('fixed inset-0 z-[300] flex flex-col select-none', viewerShell(isDark))}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton type="button" onClick={onClose} className={controlBtn} aria-label="Close" icon={X} />
          <div className="min-w-0">
            <p className={cn('truncate text-sm font-bold', viewerTitlePrimary(isDark))}>{title || activeSlide?.songTitle}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className={cn('text-[11px] font-semibold', viewerTitleMuted(isDark, 'low'))}>
                {slides.length} songs
              </span>
              {activeSlide && (
                <span className={cn('truncate text-[11px] font-medium', viewerTitleMuted(isDark))}>
                  · {activeSection + 1}. {activeSlide.songTitle}
                </span>
              )}
              {isZoomed && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => controlsRef.current?.resetTransform()}
                  className={cn('h-auto', viewerZoomBadge(isDark))}
                >
                  {zoomPct}% · Reset
                </Button>
              )}
              {downloadProgress && (
                <span className={cn('text-[11px] font-medium', viewerTitleMuted(isDark, 'low'))} role="status">
                  {downloadProgress}
                </span>
              )}
              {downloadError && (
                <span className={cn('text-[11px] font-medium', viewerTitleMuted(isDark, 'low'))}>
                  {downloadError}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <IconButton
            type="button"
            onClick={() => controlsRef.current?.zoomOut(0.35)}
            disabled={scale <= minScale + 0.01}
            className={controlBtn}
            aria-label="Zoom out"
            icon={ZoomOut}
          />
          <IconButton
            type="button"
            onClick={() => controlsRef.current?.zoomIn(0.35)}
            className={controlBtn}
            aria-label="Zoom in"
            icon={ZoomIn}
          />
          <IconButton
            type="button"
            onClick={() => controlsRef.current?.resetTransform()}
            className={cn(controlBtn, 'hidden sm:inline-flex')}
            aria-label="Reset zoom"
            icon={Maximize}
          />
          {activeSlide && (activeSlide.referenceTracks?.length ?? 0) > 0 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => openListenForSection(activeSection)}
              className={cn(
                'setlist-control inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold',
                viewerListenBtn(isDark, listenSection === activeSection),
              )}
            >
              <Headphones className="h-4 w-4" />
              Listen
            </Button>
          )}
          <IconButton
            type="button"
            onClick={() => void downloadAll()}
            disabled={downloading}
            className={controlBtn}
            aria-label={downloading ? 'Downloading photos' : 'Download photos'}
            aria-busy={downloading}
            icon={downloading ? Loader2 : Download}
            iconClassName={downloading ? 'motion-safe:animate-spin' : undefined}
          />
        </div>
      </div>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-hidden">
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={minScale}
          maxScale={5}
          centerOnInit={false}
          limitToBounds
          centerZoomedOut
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
          doubleClick={{ disabled: true }}
          onInit={(ref) => {
            transformRef.current = ref;
            window.requestAnimationFrame(() => {
              centerHorizontallyIfFits(ref);
            });
          }}
          onPanning={handleTransformChange}
          onZoom={handleTransformChange}
          onPanningStop={() => {
            handleTransformChange();
            if (transformRef.current) centerHorizontallyIfFits(transformRef.current, 120);
          }}
          onZoomStop={() => {
            if (transformRef.current) centerHorizontallyIfFits(transformRef.current, 120);
          }}
          onPinchingStop={() => {
            if (transformRef.current) centerHorizontallyIfFits(transformRef.current, 120);
          }}
          onTransformed={(ref, state) => {
            setScale(state.scale);
            handleTransformChange();
            centerHorizontallyIfFits(ref);
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
                  className="px-3 py-4 leading-[0]"
                  style={{ width: contentWidth }}
                >
                  <div className="flex flex-col overflow-hidden bg-white shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
                  {slides.map((section, sectionIdx) => {
                    const hasTracks = (section.referenceTracks?.length ?? 0) > 0;
                    return (
                      <section
                        key={`${section.songTitle}-${section.key}-${sectionIdx}`}
                        id={`setlist-section-${sectionIdx}`}
                        className="flex w-full flex-col leading-[0]"
                      >
                        <div id={`setlist-anchor-${sectionIdx}`} className="h-0 w-full shrink-0" aria-hidden />
                        <SectionTitleBar
                          sectionIdx={sectionIdx}
                          title={section.songTitle}
                          keyName={section.key}
                          hasTracks={hasTracks}
                          listening={listenSection === sectionIdx}
                          isDark={isDark}
                          onListen={() => openListenForSection(sectionIdx)}
                        />
                        {(section.textSheets ?? []).length > 0 && (
                          (section.textSheets ?? []).map((sheet) => (
                            <EmbeddedTextChart
                              key={sheet.id}
                              sheet={sheet}
                              songId={section.songId}
                              songTitle={section.songTitle}
                              displayKey={section.key}
                              annotationId={section.annotationId}
                              className="max-w-none rounded-none border-0"
                            />
                          ))
                        )}
                        {(section.imageUrls ?? []).length > 0 ? (
                          (section.imageUrls ?? []).map((url, pageIdx) => (
                            <ChordPage
                              key={`${url}-${pageIdx}`}
                              url={url}
                              pageIndex={pageIdx}
                              songTitle={section.songTitle}
                            />
                          ))
                        ) : (section.textSheets ?? []).length === 0 ? (
                          <div className={cn(viewerEmptyState(isDark), 'rounded-none leading-normal')}>
                            <FileText className={cn('h-8 w-8', isDark ? 'text-white/25' : 'text-muted-foreground/50')} />
                            <p className={cn('text-sm', isDark ? 'text-white/50' : 'text-muted-foreground')}>No chord sheets for this song</p>
                            {hasTracks && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={(e) => { e.stopPropagation(); openListenForSection(sectionIdx); }}
                                className={cn(
                                  'setlist-control mt-1 inline-flex h-auto items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold',
                                  viewerListenBtn(isDark, false),
                                )}
                              >
                                <Headphones className="h-4 w-4" />
                                Play reference track
                              </Button>
                            )}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                  </div>
                </div>
              </TransformComponent>
            );
          }}
        </TransformWrapper>
      </div>

      {listenSection !== null && (() => {
        const listenSlide = slides[listenSection];
        const tracks = listenSlide?.referenceTracks;
        if (!tracks || tracks.length === 0) return null;
        const activeTrack = tracks[activeTrackIdx] ?? tracks[0];
        const note = [
          listenSection === activeSection ? null : listenSlide.songTitle,
          activeTrack.note,
        ].filter(Boolean).join(' · ');
        return (
          <div className={cn(viewerFooter(isDark), '!gap-1 !pt-2 !pb-3')}>
            <div className="mx-auto w-full max-w-lg space-y-1">
              <TrackPicker
                tracks={tracks}
                activeIndex={activeTrackIdx}
                onSelect={setActiveTrackIdx}
                theme={viewerTheme}
                compact
              />
              <YoutubePlayerPanel
                key={activeTrack.url}
                url={activeTrack.url}
                note={note || undefined}
                enabled
                theme={viewerTheme}
                compact
                onClose={() => setListenSection(null)}
              />
            </div>
          </div>
        );
      })()}
    </motion.div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(viewer, document.body);
}
