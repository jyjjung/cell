'use client';

/** Lightweight home shell shown while the dashboard chunk loads. */
export function DashboardSkeleton() {
  return (
    <div className="page-container animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-muted/60" />
        <div className="h-4 w-40 rounded-md bg-muted/40" />
      </div>

      <div className="ui-card space-y-4">
        <div className="h-4 w-28 rounded bg-muted/50" />
        <div className="h-2 w-full rounded bg-muted/40" />
        <div className="h-4 w-44 rounded bg-muted/30" />
        <div className="h-4 w-36 rounded bg-muted/30" />
      </div>

      <div className="stack-gap-sm">
        {Array.from({ length: 2 }).map((_, group) => (
          <div key={group} className="ui-card !p-0">
            <div className="border-b border-border/60 px-4 py-3">
              <div className="h-3 w-24 rounded bg-muted/50" />
            </div>
            <div className="ui-list px-2">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-center gap-3 px-1 py-3">
                  <div className="h-8 w-10 shrink-0 rounded bg-muted/40" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-40 rounded bg-muted/40" />
                    <div className="h-3 w-24 rounded bg-muted/25" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
