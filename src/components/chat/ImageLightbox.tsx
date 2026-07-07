"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Download, X, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RemoteImage } from '@/components/ui/remote-image';

interface ChatImageGalleryProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (url: string) => void;
  altText?: string;
}

export function ChatImageGallery({
  images,
  initialIndex,
  onClose,
  onDownload,
  altText = 'Image',
}: ChatImageGalleryProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const transformRef = useRef<{
    zoomIn: (step?: number) => void;
    zoomOut: (step?: number) => void;
    resetTransform: () => void;
  } | null>(null);

  const imageUrl = images[idx] ?? images[0];
  const hasMultiple = images.length > 1;

  useEffect(() => {
    setIdx(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    transformRef.current?.resetTransform();
    setIsZoomed(false);
    setScale(1);
  }, [idx]);

  const goPrev = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setIdx((i) => Math.min(images.length - 1, i + 1));
  }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goPrev, goNext, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed || e.touches.length !== 1) return;
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeStart.current || isZoomed) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  if (!imageUrl) return null;

  const controlBtn =
    'h-9 w-9 md:h-10 md:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md shrink-0';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/95 flex flex-col select-none"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2 shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            {hasMultiple && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={goPrev}
                  disabled={idx === 0}
                  className={cn(controlBtn, idx === 0 && 'opacity-30')}
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-white/70 text-[11px] font-bold tabular-nums px-1">
                  {idx + 1} / {images.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={goNext}
                  disabled={idx === images.length - 1}
                  className={cn(controlBtn, idx === images.length - 1 && 'opacity-30')}
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => transformRef.current?.zoomIn(0.5)}
              className={controlBtn}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => transformRef.current?.zoomOut(0.5)}
              disabled={scale <= 1.01}
              className={cn(controlBtn, scale <= 1.01 && 'opacity-30')}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => transformRef.current?.resetTransform()}
              className={cn(controlBtn, 'hidden sm:inline-flex')}
              aria-label="Reset zoom"
            >
              <Maximize className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <div className="w-px h-5 bg-white/20 mx-0.5 hidden sm:block" />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDownload(imageUrl)}
              className={cn(controlBtn, 'hover:bg-primary/80')}
              aria-label="Download"
            >
              <Download className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className={cn(controlBtn, 'hover:bg-red-500/80')}
              aria-label="Close"
            >
              <X className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>

        <div
          className="flex-1 min-h-0 relative"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <TransformWrapper
            key={imageUrl}
            initialScale={1}
            minScale={1}
            maxScale={5}
            centerOnInit
            limitToBounds
            centerZoomedOut
            wheel={{ step: 0.1 }}
            panning={{ disabled: !isZoomed }}
            onTransformed={(_, state) => {
              setScale(state.scale);
              setIsZoomed(state.scale > 1.05);
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => {
              transformRef.current = { zoomIn, zoomOut, resetTransform };
              return (
                <TransformComponent
                  wrapperClass="!w-full !h-full"
                  contentClass="!w-full !h-full flex items-center justify-center"
                >
                  <RemoteImage
                    src={imageUrl}
                    alt={altText}
                    width={1920}
                    height={1080}
                    draggable={false}
                    className="max-w-[95vw] max-h-[calc(100dvh-4.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] object-contain select-none"
                    sizes="95vw"
                  />
                </TransformComponent>
              );
            }}
          </TransformWrapper>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
