
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import { APP_VERSION } from '@/lib/app-version';
import { IconButton } from '@/components/ui/icon-button';

/**
 * @fileOverview Detects iOS Safari users and prompts them to install the PWA.
 */
export function PWAInstallPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    localStorage.setItem('pwa_app_version', APP_VERSION);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');

    if (isIOS && !isStandalone && !isDismissed) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showInstallPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 left-4 right-4 z-[150] md:left-auto md:right-8 md:w-[400px]"
        >
          <div className="relative p-6 rounded-2xl widget-surface overflow-hidden">
            <IconButton
              aria-label="Dismiss"
              icon={X}
              onClick={handleDismiss}
              className="absolute top-4 right-4"
            />

            <div className="flex items-start gap-5">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                <Download className="h-6 w-6" />
              </div>
              <div className="space-y-3 pr-6">
                <h3 className="text-section-title leading-none">Add to home screen</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Install the app to get push notifications on iOS.
                </p>
                <div className="pt-2 stack-gap-sm">
                  <div className="flex items-center gap-3 text-micro-label text-primary/80">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">1</span>
                    <span>Tap Share <Share className="inline h-3 w-3 ml-1 mb-1" /></span>
                  </div>
                  <div className="flex items-center gap-3 text-micro-label text-primary/80">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">2</span>
                    <span>Choose &quot;Add to Home Screen&quot;</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -right-4 opacity-[0.03] pointer-events-none rotate-12">
              <Download className="h-24 w-24" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
