"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function ChatListSkeleton() {
  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12 animate-in fade-in duration-500">
      
      {/* ── Page Header Skeleton ── */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      {/* ── Search & Tabs Skeleton ── */}
      <div className="space-y-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="flex gap-1 p-1 rounded-xl bg-muted/30 border border-border/30 w-fit h-10">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-lg" />
          ))}
        </div>
      </div>

      {/* ── Chat List Grid Skeleton ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 p-5 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm">
            <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
               <div className="flex justify-between items-center gap-4">
                 <Skeleton className="h-4 w-24" />
                 <Skeleton className="h-3 w-16" />
               </div>
               <Skeleton className="h-3 w-full opacity-60" />
            </div>
            <Skeleton className="h-4 w-4 rounded-full opacity-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
