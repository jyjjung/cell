'use client';

/** Lightweight home shell shown while the dashboard chunk loads. */
export function DashboardSkeleton() {
  return (
    <div className="page-container stack-gap animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-28 rounded-md bg-muted/50" />
        <div className="h-8 w-48 rounded-lg bg-muted/60" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-full bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-2xl border border-border/40 bg-muted/30" />
        <div className="h-40 rounded-2xl border border-border/40 bg-muted/30" />
      </div>
      <div className="h-56 rounded-2xl border border-border/40 bg-muted/25" />
    </div>
  );
}
