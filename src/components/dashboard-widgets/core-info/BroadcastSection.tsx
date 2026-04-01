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
    <section className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">{t.broadcasts}</p>
            <h2 className="text-base font-black tracking-tight uppercase tracking-[0.1em]">{t.globalAlerts}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleLink('/announcements')} className="rounded-xl font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/10 transition-all">{t.archive} <ArrowRight className="ml-1 h-3 w-3"/></Button>
        </div>
        <div className="space-y-4">
          {unreadAnnouncements.length === 0 ? (
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 text-center py-10 border border-dashed border-border/50 rounded-[2rem]"
            >
                {t.frequencySilent}
            </motion.p>
          ) : (
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {unreadAnnouncements.slice(0, 3).map((n: any, i: number) => (
                    <motion.div 
                        key={n.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-6 rounded-[2rem] bg-orange-500/5 border border-orange-500/10 flex items-center justify-between group/alert hover:bg-orange-500/10 transition-all shadow-sm"
                    >
                        <div className="min-w-0 pr-4">
                            <p className="font-black text-xs tracking-tight uppercase text-orange-500 truncate">{n.title}</p>
                            <p className="text-[11px] font-medium opacity-70 mt-1 truncate">{n.message}</p>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => markAsRead(n.id)} 
                            className="h-10 w-10 shrink-0 rounded-xl hover:bg-orange-500 hover:text-white transition-all active:scale-90"
                        >
                            <Check className="h-4 w-4"/>
                        </Button>
                    </motion.div>
                    ))}
                </AnimatePresence>
            </div>
          )}
        </div>
    </section>
));

BroadcastSection.displayName = 'BroadcastSection';
