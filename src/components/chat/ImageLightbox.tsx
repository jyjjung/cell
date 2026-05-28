"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Download, X, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface ImageLightboxProps {
  imageUrl: string;
  altText?: string;
  onDownload: (url: string) => void;
  trigger: React.ReactNode;
}

export function ImageLightbox({ imageUrl, altText = "Image", onDownload, trigger }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent 
        className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black/95 backdrop-blur-2xl flex items-center justify-center m-0 !rounded-none"
        showCloseButton={false}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full h-full flex items-center justify-center group/lightbox"
            >
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={5}
                centerOnInit={true}
                wheel={{ step: 0.1 }}
              >
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <>
                    <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover/lightbox:opacity-100 transition-opacity duration-300">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => zoomIn(0.5)}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                      >
                        <ZoomIn className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => zoomOut(0.5)}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                      >
                        <ZoomOut className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => resetTransform()}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md hidden sm:flex"
                      >
                        <Maximize className="h-5 w-5" />
                      </Button>
                      <div className="w-[1px] h-6 bg-white/20 mx-1 hidden sm:block" />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDownload(imageUrl)}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 hover:bg-primary text-white backdrop-blur-md transition-colors"
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/10 hover:bg-red-500/80 text-white backdrop-blur-md transition-colors ml-2"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    <TransformComponent
                      wrapperClass="!w-full !h-full"
                      contentClass="!w-full !h-full flex items-center justify-center cursor-move"
                    >
                      <img
                        src={imageUrl}
                        alt={altText}
                        className="max-w-[95vw] max-h-[95vh] object-contain select-none"
                        draggable={false}
                        onClick={(e) => {
                          // Prevent closing when clicking the image itself
                          e.stopPropagation();
                        }}
                      />
                    </TransformComponent>
                  </>
                )}
              </TransformWrapper>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
