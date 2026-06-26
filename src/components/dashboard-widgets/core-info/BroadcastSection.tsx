"use client";

import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface BroadcastSectionProps {
  unreadAnnouncements: any[];
  t: any;
  markAsRead: (id: string) => void;
  handleLink: (path: string) => void;
}

export const BroadcastSection = React.memo(({ unreadAnnouncements, t, markAsRead, handleLink }: BroadcastSectionProps) => (
    <section className="stack-gap">
        <div className="panel-header border-b border-border/50 pb-3">
          <div>
            <p className="text-micro-label">{t.broadcasts}</p>
            <h2 className="panel-title">{t.globalAlerts}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleLink('/announcements')} className="text-primary">
            {t.archive} <ArrowRight className="ml-1 h-3 w-3"/>
          </Button>
        </div>
        <div className="stack-gap-sm">
          {unreadAnnouncements.length === 0 ? (
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="empty-inline border border-dashed border-border/50 rounded-lg"
            >
                {t.frequencySilent}
            </motion.p>
          ) : (
            <AnimatePresence mode="popLayout">
                {unreadAnnouncements.slice(0, 3).map((n: any, i: number) => (
                <motion.div 
                    key={n.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.1 }}
                    className="surface-row group/alert"
                >
                    <div className="min-w-0 flex-grow">
                        <p className="font-semibold text-sm truncate">{n.title}</p>
                        <p className="text-micro-label mt-0.5 truncate">{n.message}</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => markAsRead(n.id)} 
                        className="h-8 w-8 shrink-0"
                        aria-label={t.markAsRead}
                    >
                        <Check className="h-4 w-4"/>
                    </Button>
                </motion.div>
                ))}
            </AnimatePresence>
          )}
        </div>
    </section>
));

BroadcastSection.displayName = 'BroadcastSection';
