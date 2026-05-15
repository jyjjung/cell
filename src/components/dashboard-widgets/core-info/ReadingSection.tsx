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
    <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{t[title.labelKey]}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t[title.titleKey]}</h2>
          </div>
          {showArchiveLink && (
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleLink('/bible-checklist')} 
                className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
            >
                {t.fullPlan} <ArrowRight className="ml-1 h-3 w-3"/>
            </Button>
          )}
        </div>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
          {!reading ? (
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center py-10 border border-dashed border-border/50 rounded-[2rem]"
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
                className="flex items-center gap-5 p-6 rounded-[2rem] bg-muted/20 border border-transparent hover:border-primary/20 hover:bg-muted/30 transition-all group/passage"
              >
                <Checkbox 
                    checked={reading.date 
                      ? completedPassages.includes(makePassageKey(reading.date, p.displayText)) || completedPassages.includes(p.displayText)
                      : completedPassages.includes(p.displayText)} 
                    onCheckedChange={() => togglePassageCompletion(p.displayText, reading.date)} 
                    className="h-6 w-6 rounded-lg border-primary/20 bg-background/50 hover:bg-primary/10 transition-all" 
                />
                <button 
                    onClick={() => handlePassageClick(p.displayText)} 
                    className={cn(
                        "text-lg font-black tracking-tighter hover:text-primary transition-all text-left flex items-center gap-2", 
                        (reading.date
                          ? completedPassages.includes(makePassageKey(reading.date, p.displayText)) || completedPassages.includes(p.displayText)
                          : completedPassages.includes(p.displayText)) && "line-through opacity-40"
                    )}
                >
                    {p.displayText}
                    <BookOpenText className="h-4 w-4 opacity-0 group-hover/passage:opacity-40 transition-opacity ml-1" />
                </button>
              </motion.div>
            ))
          )}
          </AnimatePresence>
        </div>
    </section>
));

ReadingSection.displayName = 'ReadingSection';
