"use client";

import React from 'react';
import { ArrowRight, BookOpenText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { makePassageKey } from '@/hooks/use-user-bible-checklist';

interface ReadingSectionProps {
  title: { labelKey: string; titleKey: string };
  reading: { date: string; passages: any[] } | null;
  completedPassages: string[];
  togglePassageCompletion: (displayText: string, date?: string) => void;
  handlePassageClick: (displayText: string) => void;
  t: any;
  handleLink: (path: string) => void;
  emptyMsg: string;
  showArchiveLink?: boolean;
}

export const ReadingSection = React.memo(({ title, reading, completedPassages, togglePassageCompletion, handlePassageClick, t, handleLink, emptyMsg, showArchiveLink }: ReadingSectionProps) => (
    <section className="stack-gap">
        <div className="panel-header border-b border-border/50 pb-3">
          <div>
            <p className="text-micro-label">{t[title.labelKey]}</p>
            <h2 className="panel-title">{t[title.titleKey]}</h2>
          </div>
          {showArchiveLink && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleLink('/bible-checklist')} 
                className="text-primary"
            >
                {t.fullPlan} <ArrowRight className="ml-1 h-3 w-3"/>
            </Button>
          )}
        </div>
        <div className="stack-gap-sm">
          <AnimatePresence mode="popLayout">
          {!reading ? (
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="empty-inline glass-thin border-dashed border-border/50 rounded-lg"
            >
                {t[emptyMsg]}
            </motion.p>
          ) : (
            reading.passages.map((p: any, i: number) => (
              <motion.div 
                key={p.displayText} 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="surface-row group/passage"
              >
                <Checkbox 
                    checked={reading.date 
                      ? completedPassages.includes(makePassageKey(reading.date, p.displayText)) || completedPassages.includes(p.displayText)
                      : completedPassages.includes(p.displayText)} 
                    onCheckedChange={() => togglePassageCompletion(p.displayText, reading.date)} 
                    className="h-4 w-4" 
                />
                <button 
                    onClick={() => handlePassageClick(p.displayText)} 
                    className={cn(
                        "text-sm font-medium hover:text-primary transition-all text-left flex items-center gap-2 flex-grow", 
                        (reading.date
                          ? completedPassages.includes(makePassageKey(reading.date, p.displayText)) || completedPassages.includes(p.displayText)
                          : completedPassages.includes(p.displayText)) && "line-through opacity-50"
                    )}
                >
                    {p.displayText}
                    <BookOpenText className="h-4 w-4 opacity-0 group-hover/passage:opacity-40 transition-opacity" />
                </button>
              </motion.div>
            ))
          )}
          </AnimatePresence>
        </div>
    </section>
));

ReadingSection.displayName = 'ReadingSection';
