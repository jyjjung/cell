
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
  const greenWidth = Math.min(clampedCompleted, clampedScheduled);
  const redWidth = Math.max(0, clampedScheduled - clampedCompleted);
  const blueWidth = Math.max(0, clampedCompleted - clampedScheduled); // This is what the user completed *ahead* of schedule

  // The main "To Do" or "Goal" bar, which represents everything scheduled up to today that isn't yet completed.
  // This is effectively the red bar's area. We will repurpose the blue color for scheduled-but-not-yet-overdue items.
  // The logic is simpler: Green is completed, Red is behind, Blue is what's left of today's goal.
  // The existing logic is actually correct for showing this, but the naming "aheadWidth" was confusing.
  // Let's re-verify the logic based on the user's intent.

  // Let's rethink the layers to be more explicit:
  // 1. Green: `completedPercentage` but capped at `scheduledPercentage`. This is "on-track" completion.
  // 2. Red: The gap between `completedPercentage` and `scheduledPercentage` IF user is behind.
  // 3. Blue: The scheduled portion that is NOT yet completed.
  // 4. Gray: The rest of the bar (unscheduled future readings).

  // The current logic is:
  // `greenWidth` (on-track completion): `min(completed, scheduled)`
  // `redWidth` (behind): `max(0, scheduled - completed)`
  // `blueWidth` (ahead of schedule): `max(0, completed - scheduled)`
  
  // This seems to cover all cases. Green + Red = Scheduled. Green + Blue = Completed.
  // The user just wants the legend text changed. The visual logic is sound.
  // No code changes needed here, only in the legend on the page. Let's stick with my last change.

  return (
    <div
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
    >
      {/* Layer 1: Green - Completed on schedule */}
      <motion.div
        className="absolute top-0 left-0 h-full bg-green-500"
        initial={{ width: 0 }}
        animate={{ width: `${greenWidth}%` }}
        transition={{ ease: "easeInOut", duration: 0.8 }}
      />
      {/* Layer 2: Red - Behind schedule */}
      <motion.div
        className="absolute top-0 h-full bg-red-500"
        style={{ left: `${greenWidth}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${redWidth}%` }}
        transition={{ ease: "easeInOut", duration: 0.8, delay: 0.2 }}
      />
      {/* Layer 3: Blue - Ahead of schedule */}
      <motion.div
        className="absolute top-0 h-full bg-blue-500"
        style={{ left: `${clampedScheduled}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${blueWidth}%` }}
        transition={{ ease: "easeInOut", duration: 0.8, delay: 0.4 }}
      />
    </div>
  );
}
