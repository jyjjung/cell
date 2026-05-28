"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function DashboardSkeleton() {
  return (
    <div className="page-container space-y-8 pb-32 animate-in fade-in duration-500">
      
      {/* ── Greeting Skeleton ── */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-48 md:h-14 md:w-64 rounded-2xl" />
        <Skeleton className="h-10 w-32 md:h-14 md:w-48 rounded-2xl" />
      </div>

      {/* ── Stats Row Skeleton ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted/20 border border-border/50 p-4 space-y-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Bible Reading Hub Skeleton ── */}
      <div className="p-6 md:p-8 rounded-[2.5rem] border border-border/50 bg-card/30 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>

      {/* ── Community Schedule Skeleton ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 xl:col-span-4">
            <Skeleton className="h-[350px] w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
