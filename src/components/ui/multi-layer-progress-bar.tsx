
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MultiLayerProgressBarProps {
  completedPercentage: number;
  scheduledPercentage: number;
  className?: string;
}

export function MultiLayerProgressBar({
  completedPercentage,
  scheduledPercentage,
  className,
}: MultiLayerProgressBarProps) {
  // Clamp values between 0 and 100
  const clampedCompleted = Math.max(0, Math.min(100, completedPercentage));
  const clampedScheduled = Math.max(0, Math.min(100, scheduledPercentage));

  // Determine which layers to show
  const completedWidth = Math.min(clampedCompleted, clampedScheduled);
  const behindWidth = Math.max(0, clampedScheduled - clampedCompleted);
  const aheadWidth = Math.max(0, clampedCompleted - clampedScheduled);

  return (
    <div
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
    >
      {/* Layer 1: Completed readings (on track) */}
      <motion.div
        className="absolute top-0 left-0 h-full bg-green-500"
        initial={{ width: 0 }}
        animate={{ width: `${completedWidth}%` }}
        transition={{ ease: "easeInOut", duration: 0.8 }}
      />
      {/* Layer 2: Readings user is behind on (now red) */}
      <motion.div
        className="absolute top-0 h-full bg-red-500"
        style={{ left: `${completedWidth}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${behindWidth}%` }}
        transition={{ ease: "easeInOut", duration: 0.8, delay: 0.2 }}
      />
      {/* Layer 3: Readings user has completed ahead of schedule (goal) */}
      <motion.div
        className="absolute top-0 h-full bg-blue-500"
        style={{ left: `${clampedScheduled}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${aheadWidth}%` }}
        transition={{ ease: "easeInOut", duration: 0.8, delay: 0.4 }}
      />
    </div>
  );
}
