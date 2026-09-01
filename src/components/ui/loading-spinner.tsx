import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type LoadingSpinnerProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Accessible name when used without visible text. */
  label?: string;
};

const sizeClass = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function LoadingSpinner({ className, size = "md", label = "Loading" }: LoadingSpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn(
        "text-primary motion-safe:animate-spin",
        sizeClass[size],
        className,
      )}
    />
  );
}

/** Inline spinner for buttons — decorative; parent button supplies accessible name. */
export function ButtonSpinner({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Loader2
      aria-hidden
      className={cn("motion-safe:animate-spin", sizeClass[size], className)}
    />
  );
}

type PageLoadingProps = {
  className?: string;
  label?: string;
  /** Prefer skeleton placeholders over a centered spinner (HIG). */
  variant?: "spinner" | "skeleton";
};

export function PageLoading({ className, label = "Loading page", variant = "skeleton" }: PageLoadingProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("page-shell space-y-2 py-4", className)} aria-busy="true" aria-live="polite">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full rounded-xl" />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex min-h-[40vh] items-center justify-center py-16", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}
