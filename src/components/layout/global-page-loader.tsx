
"use client";

import { usePageLoading } from '@/contexts/page-loading-context';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GlobalPageLoader() {
  const { isPageLoading } = usePageLoading();

  return (
    <AnimatePresence>
      {isPageLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg text-muted-foreground">
            Loading...
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
