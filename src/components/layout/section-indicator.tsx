
"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

interface SectionIndicatorProps {
  sections: string[];
}

export default function SectionIndicator({ sections }: SectionIndicatorProps) {
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    const handleIntersect = (entry: IntersectionObserverEntry) => {
      if (entry.isIntersecting) {
        setActiveSection(entry.target.id);
      }
    };
    
    // Timer to delay visibility, avoids flash on load
    const timer = setTimeout(() => setIsVisible(true), 1000);

    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(handleIntersect);
          },
          { threshold: 0.5 } // 50% of the section must be visible
        );
        observer.observe(el);
        observers.push(observer);
      }
    });

    return () => {
      clearTimeout(timer);
      observers.forEach(observer => observer.disconnect());
    };
  }, [sections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center space-x-2 bg-background/50 backdrop-blur-sm p-2 rounded-full shadow-lg border">
            {sections.map((id) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  activeSection === id ? "w-6 bg-primary" : "w-2 bg-muted-foreground hover:bg-primary/80"
                )}
                aria-label={`Go to section ${id.replace('-section', '')}`}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
