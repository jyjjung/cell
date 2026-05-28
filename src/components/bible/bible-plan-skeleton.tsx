"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function BiblePlanSkeleton() {
  return (
    <div className="page-container space-y-8 pb-32 animate-in fade-in duration-500">
      
      {/* ── Page Header Skeleton ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>

      {/* ── Overall Progress Section Skeleton ── */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-48 rounded-lg ml-1" />
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Skeleton className="h-2 flex-grow rounded-full" />
              <Skeleton className="h-6 w-12 rounded-md" />
            </div>
            <Skeleton className="h-3 w-64 rounded-md" />
          </div>
          
          <div className="pt-8 border-t border-border/50 space-y-6">
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-thin p-6 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-[1.2rem]" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Heatmap Skeleton ── */}
      <Skeleton className="h-[150px] w-full rounded-2xl" />

      {/* ── Weekly Breakdown Skeleton ── */}
      <section className="space-y-4">
        <Skeleton className="h-6 w-48 rounded-lg ml-1" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass-card p-5 rounded-3xl flex justify-between items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-full max-w-lg" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-6 w-12 rounded-md" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
