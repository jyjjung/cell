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
    <section className="stack-gap">
        <div className="panel-header border-b border-border/50 pb-3">
          <div>
            <p className="text-micro-label">{t.schedule}</p>
            <h2 className="panel-title">{t.communityTimeline}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleLink('/events')} 
            className="text-primary"
          >
            {t.calendar} <ArrowRight className="ml-1 h-3 w-3"/>
          </Button>
        </div>
        <div className="stack-gap-sm">
          <AnimatePresence mode="popLayout">
          {timelineItems.length === 0 ? (
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="empty-inline glass-thin rounded-lg"
            >
                {t.clearHorizon}
            </motion.p>
          ) : (
            timelineItems.map((item, i) => (
              <motion.button 
                key={item.id} 
                initial={{ opacity: 0, scale: 0.98, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onItemSelect(item)} 
                className="surface-row w-full hover:ring-primary/20 transition-all group/event text-left"
              >
                <div className="text-center w-12 shrink-0 border-r border-border/30 pr-3">
                  <p className="text-micro-label">
                    {format(item.date, "EEE")}
                  </p>
                  <p className="text-lg font-semibold leading-none mt-0.5 tabular-nums">
                    {format(item.date, "d")}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {item.title}
                  </p>
                  <span className={cn(
                    "inline-block text-micro-label mt-1 px-2 py-0.5 rounded-full border",
                    item.type === 'cleaning' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                    item.type === 'qt' ? "bg-primary/10 text-primary border-primary/20" : 
                    "bg-orange-500/10 text-orange-500 border-orange-500/20"
                  )}>
                    {item.type === 'cleaning' ? t.cleaningDuty : item.type === 'qt' ? t.qtSharing : item.category || t.eventLabel}
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
