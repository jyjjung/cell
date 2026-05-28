"use client";

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ShieldCheck, BookOpenText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { InternalTimelineItem } from '@/hooks/use-dashboard-data';

interface TimelineDetailsDialogProps {
  item: InternalTimelineItem | null;
  onClose: () => void;
  t: any;
}

export const TimelineDetailsDialog = ({ item, onClose, t }: TimelineDetailsDialogProps) => (
  <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="rounded-[3rem] p-10 overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 rounded-full" />

      <DialogHeader className="space-y-6">
        <div className="flex items-center gap-4">
            <div className={cn(
                "p-3 rounded-2xl",
                item?.type === 'cleaning' ? "bg-green-500/10 text-green-500" : 
                item?.type === 'qt' ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
            )}>
                {item?.type === 'cleaning' ? <ShieldCheck className="h-6 w-6" /> : item?.type === 'qt' ? <BookOpenText className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
            </div>
            <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/60">Community Timeline</p>
                <DialogDescription className="text-xs font-bold uppercase tracking-[0.1em] text-primary">
                    Record ID: {item?.id.slice(0, 8)}
                </DialogDescription>
            </div>
        </div>
        <DialogTitle className="text-3xl font-black tracking-tighter uppercase leading-tight text-white/95">
            {item?.title}
        </DialogTitle>
        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] opacity-60">
            <Calendar className="h-3 w-3" />
            {item && format(item.date, "EEEE, MMMM do, yyyy")}
        </div>
      </DialogHeader>
      
      <div className="mt-10 space-y-8">
        {item?.type === 'event' && item.details && (
          <div className="glass-thin p-8 rounded-[2.5rem]">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-4">Brief Context</p>
            <p className="text-sm font-medium leading-relaxed opacity-90 text-white/80">{item.details}</p>
          </div>
        )}
        
        {item?.type === 'qt' && (
          <div className="space-y-4">
            {item.qtTitle && (
              <div className="glass-thin p-8 rounded-[2.5rem]">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-4">Teaching Topic</p>
                <p className="text-xl font-black leading-tight text-white/90">{item.qtTitle}</p>
              </div>
            )}
            <div className="glass-thin flex items-center justify-between p-8 rounded-[2.5rem]">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Scripture Assignment</p>
                <p className="text-2xl font-black tracking-tighter text-white/90">{item.passage}</p>
              </div>
              <BookOpenText className="h-10 w-10 text-primary/20" />
            </div>
          </div>
        )}
        
        {item?.type === 'cleaning' && (
          <div className="grid grid-cols-1 gap-4">
            <div className="glass-thin p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40 mb-4">Duty Classification</p>
              <p className="text-xl font-black text-white/90">{item.dayName || 'Standard Roster'}</p>
            </div>
            <div className="glass-thin p-8 rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500 mb-3">Assigned Stewards</p>
              <p className="text-xl font-black text-white/90">{item.assignedNames}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <Button 
            className="w-full h-16 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 active:scale-[0.98] transition-all bg-primary hover:bg-primary/90" 
            onClick={onClose}
        >
            {t.confirm}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
