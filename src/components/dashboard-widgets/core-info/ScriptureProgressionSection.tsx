"use client";

import React from 'react';
import { BookOpen, Timer, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScriptureProgressionSectionProps {
  bibleStats: { chaptersLeft: number; daysLeft: number } | null;
  t: any;
}

export const ScriptureProgressionSection = React.memo(({ bibleStats, t }: ScriptureProgressionSectionProps) => (
    <section className="space-y-8">
        <div className="space-y-1 border-b border-border/50 pb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{t.journeyPath}</p>
          <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.scriptureProgression}</h2>
        </div>
        {bibleStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-6 group/stat hover:scale-[1.02] transition-transform duration-500 ease-out"
            >
              <div className="h-14 w-14 rounded-[1.2rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover/stat:bg-primary/15 transition-colors">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight leading-none tabular-nums text-white/90">{bibleStats.chaptersLeft}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-3">{t.chaptersRemaining}</p>
              </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-6 group/stat hover:scale-[1.02] transition-transform duration-500 ease-out"
            >
              <div className="h-14 w-14 rounded-[1.2rem] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner group-hover/stat:bg-primary/15 transition-colors">
                <Timer className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight leading-none tabular-nums text-white/90">{bibleStats.daysLeft}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mt-3">{t.daysUntilCompletion}</p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="flex items-center gap-2 opacity-30 italic py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest">{t.loading}</p>
          </div>
        )}
    </section>
));

ScriptureProgressionSection.displayName = 'ScriptureProgressionSection';
