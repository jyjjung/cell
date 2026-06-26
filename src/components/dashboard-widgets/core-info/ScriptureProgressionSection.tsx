"use client";

import React from 'react';
import { BookOpen, Timer, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScriptureProgressionSectionProps {
  bibleStats: { passagesLeft: number; daysLeft: number } | null;
  t: any;
}

export const ScriptureProgressionSection = React.memo(({ bibleStats, t }: ScriptureProgressionSectionProps) => (
    <section className="stack-gap">
        <div className="border-b border-border/50 pb-3">
          <p className="text-micro-label">{t.journeyPath}</p>
          <h2 className="panel-title">{t.scriptureProgression}</h2>
        </div>
        {bibleStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-semibold leading-none tabular-nums">{bibleStats.passagesLeft}</p>
                <p className="text-micro-label mt-1">{t.passagesRemainingLabel}</p>
              </div>
            </motion.div>
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-4"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Timer className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-semibold leading-none tabular-nums">{bibleStats.daysLeft}</p>
                <p className="text-micro-label mt-1">{t.daysUntilCompletion}</p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-micro-label">{t.loading}</p>
          </div>
        )}
    </section>
));

ScriptureProgressionSection.displayName = 'ScriptureProgressionSection';
