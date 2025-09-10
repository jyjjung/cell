
"use client";

import { useState, useEffect } from 'react';
import { Loader2, BookOpen, CalendarCheck, Users, CheckSquare } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { motion, AnimatePresence } from 'framer-motion';

const icons = [BookOpen, CalendarCheck, CheckSquare, Users];
const iconVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.5, ease: "easeIn" } },
};


export default function GlobalPageLoader() {
  const { isPageLoading } = usePageLoading();
  const [iconIndex, setIconIndex] = useState(0);

  useEffect(() => {
    if (isPageLoading) {
      const interval = setInterval(() => {
        setIconIndex((prevIndex) => (prevIndex + 1) % icons.length);
      }, 1500); // Change icon every 1.5 seconds

      return () => clearInterval(interval);
    }
  }, [isPageLoading]);

  if (!isPageLoading) {
    return null;
  }
  
  const Icon = icons[iconIndex];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
        <AnimatePresence mode="wait">
            <motion.div
                key={iconIndex}
                variants={iconVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <Icon className="h-16 w-16 text-primary" />
            </motion.div>
        </AnimatePresence>
      <p className="mt-4 text-lg text-muted-foreground animate-pulse">Loading...</p>
    </div>
  );
}
