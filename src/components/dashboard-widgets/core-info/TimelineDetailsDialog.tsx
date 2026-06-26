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
    <DialogContent>
      <DialogHeader>
        <div className="flex items-center gap-3">
            <div className={cn(
                "p-2 rounded-lg",
                item?.type === 'cleaning' ? "bg-green-500/10 text-green-500" : 
                item?.type === 'qt' ? "bg-primary/10 text-primary" : "bg-orange-500/10 text-orange-500"
            )}>
                {item?.type === 'cleaning' ? <ShieldCheck className="h-5 w-5" /> : item?.type === 'qt' ? <BookOpenText className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            </div>
            <div>
                <p className="text-micro-label">{t.communityTimeline}</p>
                <DialogDescription className="text-micro-label text-primary">
                    {item?.type === 'cleaning' ? t.cleaningDuty : item?.type === 'qt' ? t.qtRoster : item?.category || t.eventLabel}
                </DialogDescription>
            </div>
        </div>
        <DialogTitle className="text-section-title pt-2">
            {item?.title}
        </DialogTitle>
        <div className="flex items-center gap-2 text-micro-label">
            <Calendar className="h-3 w-3" />
            {item && format(item.date, "EEEE, MMMM do, yyyy")}
        </div>
      </DialogHeader>
      
      <div className="stack-gap pt-3">
        {item?.type === 'event' && item.details && (
          <div className="glass-thin p-3 rounded-lg">
            <p className="text-micro-label mb-2">{t.details}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.details}</p>
          </div>
        )}
        
        {item?.type === 'qt' && (
          <div className="stack-gap-sm">
            {item.qtTitle && (
              <div className="glass-thin p-3 rounded-lg">
                <p className="text-micro-label mb-1">{t.topic}</p>
                <p className="font-semibold text-sm leading-tight">{item.qtTitle}</p>
              </div>
            )}
            <div className="glass-thin flex items-center justify-between p-3 rounded-lg">
              <div>
                <p className="text-micro-label text-primary mb-1">{t.passage}</p>
                <p className="text-sm font-medium">{item.passage}</p>
              </div>
              <BookOpenText className="h-5 w-5 text-primary/30" />
            </div>
          </div>
        )}
        
        {item?.type === 'cleaning' && (
          <div className="stack-gap-sm">
            <div className="glass-thin p-3 rounded-lg">
              <p className="text-micro-label mb-1">{t.dayType}</p>
              <p className="font-semibold text-sm">{item.dayName || t.standardCleaning}</p>
            </div>
            <div className="glass-thin p-3 rounded-lg">
              <p className="text-micro-label text-green-500 mb-1">{t.team}</p>
              <p className="text-sm font-medium">{item.assignedNames}</p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-3">
        <Button className="w-full" onClick={onClose}>
            {t.confirm}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
