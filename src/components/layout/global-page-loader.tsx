
"use client";

import { usePageLoading } from '@/contexts/page-loading-context';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLoadingVerse } from '@/hooks/use-loading-verse';

export default function GlobalPageLoader() {
  const { isPageLoading } = usePageLoading();
  const loadingVerse = useLoadingVerse(isPageLoading);

  return (
    <AnimatePresence>
      {isPageLoading && (
        <motion.div
          key="global-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl px-8 text-center"
          aria-label="Loading page"
          role="status"
        >
          <div className="mb-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
          </div>

          {loadingVerse && (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md space-y-4"
            >
                <p className="text-lg font-black tracking-tight leading-snug italic opacity-90">
                    "{loadingVerse.text}"
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-primary">
                    — {loadingVerse.reference}
                </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
