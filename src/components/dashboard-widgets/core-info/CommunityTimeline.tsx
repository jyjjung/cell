"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { InternalTimelineItem } from '@/hooks/use-dashboard-data';

interface CommunityTimelineProps {
  timelineItems: InternalTimelineItem[];
  t: any;
  handleLink: (path: string) => void;
  onItemSelect: (item: InternalTimelineItem) => void;
}

export const CommunityTimeline = React.memo(({ timelineItems, t, handleLink, onItemSelect }: CommunityTimelineProps) => (
    <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-success/60">{t.schedule}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.communityTimeline}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleLink('/events')} 
            className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
          >
            {t.calendar} <ArrowRight className="ml-1 h-3 w-3"/>
          </Button>
        </div>
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
          {timelineItems.length === 0 ? (
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="glass-thin text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center py-10 rounded-[2rem]"
            >
                Clear Horizon
            </motion.p>
          ) : (
            timelineItems.map((item, i) => (
              <motion.button 
                key={item.id} 
                initial={{ opacity: 0, scale: 0.98, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onItemSelect(item)} 
                className="w-full flex items-center gap-6 p-6 rounded-[2.5rem] glass-thin hover:ring-primary/30 transition-all group/event text-left"
              >
                <div className="text-center w-16 shrink-0 border-r border-border/30 group-hover/event:border-primary/20 pr-6 transition-colors">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover/event:opacity-90 group-hover/event:text-primary transition-all font-mono">
                    {format(item.date, "EEE")}
                  </p>
                  <p className="text-3xl font-black leading-none mt-1 group-hover/event:scale-110 transition-transform tabular-nums">
                    {format(item.date, "d")}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-black text-lg tracking-tight truncate uppercase tracking-tighter text-white/90 group-hover/event:text-white">
                    {item.title}
                  </p>
                  <span className={cn(
                    "inline-block text-[9px] font-black uppercase tracking-[0.2em] mt-2 px-2 py-0.5 rounded-full border",
                    item.type === 'cleaning' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                    item.type === 'qt' ? "bg-primary/10 text-primary border-primary/20" : 
                    "bg-orange-500/10 text-orange-500 border-orange-500/20"
                  )}>
                    {item.type === 'cleaning' ? 'Cleaning Duty' : item.type === 'qt' ? 'QT Service' : item.category || 'Event'}
                  </span>
                </div>
              </motion.button>
            ))
          )}
          </AnimatePresence>
        </div>
    </section>
));

CommunityTimeline.displayName = 'CommunityTimeline';
