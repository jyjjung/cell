"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CoreInfoSkeleton() {
  return (
    <div className="w-full bg-card/10 backdrop-blur-3xl border border-white/5 p-8 md:p-12 rounded-[3.5rem] space-y-24">
      {/* Header */}
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-32 rounded-full opacity-20" />
          <Skeleton className="h-10 w-64 rounded-2xl" />
        </div>
        <Skeleton className="h-1 w-24 rounded-full opacity-30" />
      </div>

      {/* Broadcasts */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-2 w-20 rounded-full opacity-20" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
          <Skeleton className="h-8 w-20 rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[2rem] opacity-40" />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {[1, 2].map((i) => (
          <div key={i} className="flex items-center gap-6">
            <Skeleton className="h-14 w-14 rounded-[1.2rem] opacity-40" />
            <div className="space-y-3">
              <Skeleton className="h-8 w-12 rounded-lg" />
              <Skeleton className="h-2 w-24 rounded-full opacity-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Readings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-8">
            <div className="space-y-2 border-b border-border/50 pb-4">
              <Skeleton className="h-2 w-20 rounded-full opacity-20" />
              <Skeleton className="h-4 w-32 rounded-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-[2rem] opacity-40" />
              <Skeleton className="h-20 w-full rounded-[2rem] opacity-20" />
            </div>
          </div>
        ))}
      </div>

      {/* Circles */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="space-y-2">
            <Skeleton className="h-2 w-20 rounded-full opacity-20" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[2.2rem] opacity-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
