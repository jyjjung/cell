
"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  activateWaitingServiceWorkers,
  clearAppCachesPreservingMedia,
} from '@/lib/sw-cache-utils';
import { APP_VERSION } from '@/lib/app-version';

/**
 * @fileOverview Detects iOS Safari users and prompts them to install the PWA.
 * Also detects version mismatches to prompt re-installation if notification logic changed.
 */
export function PWAInstallPrompt() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // 1. Version Check
    const currentVersion = APP_VERSION;
    const storedVersion = localStorage.getItem('pwa_app_version');
    
    // 2. iOS Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');

    // Handle Version Mismatch (Requires potential re-installation for core logic updates like Notifications)
    if (storedVersion && storedVersion !== currentVersion && isStandalone) {
        setShowUpdatePrompt(true);
    } else {
        localStorage.setItem('pwa_app_version', currentVersion);
    }

    // Handle initial install prompt
    if (isIOS && !isStandalone && !isDismissed) {
      const timer = setTimeout(() => setShowInstallPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setShowUpdatePrompt(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleUpdateRefresh = async () => {
    const currentVersion = APP_VERSION;
    localStorage.setItem('pwa_app_version', currentVersion);

    try {
      await clearAppCachesPreservingMedia();
      await activateWaitingServiceWorkers();
    } catch (e) {
      console.warn('[PWAInstallPrompt] Cache cleanup failed:', e);
    }

    window.location.reload();
  };

  return (
    <AnimatePresence>
      {(showInstallPrompt || showUpdatePrompt) && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-6 left-4 right-4 z-[150] md:left-auto md:right-8 md:w-[400px]"
        >
          <div className="relative p-6 rounded-[2.5rem] bg-card/80 backdrop-blur-3xl border border-primary/20 shadow-2xl overflow-hidden">
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {showUpdatePrompt ? (
                <div className="flex items-start gap-5">
                    <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-500 shrink-0">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div className="space-y-3 pr-6">
                        <h3 className="text-lg font-black tracking-tight uppercase leading-none">Sync Required.</h3>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                            The portal has been updated. If notifications aren't appearing, please refresh. 
                            If issues persist, you may need to delete and re-add the app to your Home Screen.
                        </p>
                        <Button onClick={handleUpdateRefresh} className="h-10 w-full rounded-xl font-black text-[10px] uppercase tracking-widest">
                            <RefreshCcw className="mr-2 h-3 w-3" /> Sync Identity
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-5">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
                        <Download className="h-6 w-6" />
                    </div>
                    <div className="space-y-3 pr-6">
                        <h3 className="text-lg font-black tracking-tight uppercase leading-none">Enable Sync.</h3>
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                            To receive real-time notifications for chats and events on iOS, you must add the portal to your home screen.
                        </p>
                        <div className="pt-2 space-y-3">
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary/80">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">1</span>
                                <span>Tap the Share button <Share className="inline h-3 w-3 ml-1 mb-1" /></span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary/80">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">2</span>
                                <span>Select "Add to Home Screen"</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute -bottom-4 -right-4 opacity-[0.03] pointer-events-none rotate-12">
              <Download className="h-24 w-24" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
