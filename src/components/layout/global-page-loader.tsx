
"use client";

import { useState, useEffect } from 'react';
import { BookOpen, CalendarCheck, Users, CheckSquare } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { motion, AnimatePresence } from 'framer-motion';

const icons = [BookOpen, CalendarCheck, CheckSquare, Users];
const iconContainerVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    }
  },
  exit: { 
    opacity: 0,
    transition: {
        when: "afterChildren",
        staggerChildren: 0.1,
        staggerDirection: -1
    }
  },
};

const iconVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -20, opacity: 0 },
};


export default function GlobalPageLoader() {
  const { isPageLoading } = usePageLoading();

  if (!isPageLoading) {
    return null;
  }

  const numIcons = 4;
  const radius = 60; // Orbit radius

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
      <AnimatePresence>
        {isPageLoading && (
            <motion.div
                variants={iconContainerVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative h-40 w-40"
            >
                {/* Central pulsating point */}
                <motion.div
                    className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                    }}
                    transition={{
                        duration: 1.5,
                        ease: "easeInOut",
                        repeat: Infinity,
                    }}
                />

                {/* Orbiting Icons */}
                {icons.map((Icon, i) => (
                    <motion.div
                        key={i}
                        className="absolute top-1/2 left-1/2"
                        style={{ originX: "50%", originY: "50%" }}
                        variants={iconVariants}
                        animate={{
                            x: `${radius * Math.cos(2 * Math.PI * (i / numIcons))}px`,
                            y: `${radius * Math.sin(2 * Math.PI * (i / numIcons))}px`,
                            rotate: 360,
                        }}
                        transition={{
                            duration: 4,
                            ease: "linear",
                            repeat: Infinity,
                            delay: i * 0.1
                        }}
                    >
                        <Icon className="h-8 w-8 text-primary" style={{ transform: 'translate(-50%, -50%)' }} />
                    </motion.div>
                ))}
            </motion.div>
        )}
      </AnimatePresence>
       <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.3 } }}
        exit={{ opacity: 0 }}
        className="mt-4 text-lg text-muted-foreground"
      >
        Loading...
      </motion.p>
    </div>
  );
}
