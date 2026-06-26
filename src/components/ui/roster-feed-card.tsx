"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface RosterFeedCardProps {
  date: Date;
  label: string;
  title: string;
  description?: React.ReactNode;
  rightElement?: React.ReactNode;
  index?: number;
  className?: string;
}

export function RosterFeedCard({
  date,
  label,
  title,
  description,
  rightElement,
  index = 0,
  className,
}: RosterFeedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      <div
        className={cn(
          "w-full flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-card/50 border border-border/40 hover:border-border transition-all text-left",
          "min-h-[88px]"
        )}
      >
        <div className="w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center border shadow-inner bg-muted border-border">
          <span className="text-micro-label leading-none text-primary">
            {format(date, "MMM")}
          </span>
          <span className="text-2xl font-semibold leading-tight text-primary">{format(date, "d")}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-micro-label text-primary">{label}</span>
          </div>
          <p className="font-semibold text-sm text-foreground tracking-tight">{title}</p>
          {description && <div className="mt-1">{description}</div>}
        </div>

        {rightElement && <div className="shrink-0">{rightElement}</div>}
      </div>
    </motion.div>
  );
}
