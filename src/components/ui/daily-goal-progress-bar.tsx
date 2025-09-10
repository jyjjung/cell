
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DailyGoalProgressBarProps {
  completedPercentage: number;
  behindPercentage: number;
  todayGoalPercentage: number;
  className?: string;
}

export function DailyGoalProgressBar({
  completedPercentage,
  behindPercentage,
  todayGoalPercentage,
  className,
}: DailyGoalProgressBarProps) {
  // Clamp values between 0 and 100 to prevent overflow
  const clampedCompleted = Math.max(0, Math.min(100, completedPercentage));
  const clampedBehind = Math.max(0, Math.min(100, behindPercentage));
  const clampedTodayGoal = Math.max(0, Math.min(100, todayGoalPercentage));

  return (
    <div
      className={cn(
        "relative h-3 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
    >
      {/* Green layer for completed work, always starts from left */}
      <motion.div
        className="absolute top-0 left-0 h-full bg-green-500"
        initial={{ width: 0 }}
        animate={{ width: `${clampedCompleted}%` }}
        transition={{ ease: "easeInOut", duration: 0.8 }}
        style={{ zIndex: 1 }} // Ensure green is on top
      />
      {/* Red layer for past-due work */}
      <motion.div
        className="absolute top-0 left-0 h-full bg-red-500"
        initial={{ width: 0 }}
        animate={{ width: `${clampedBehind}%` }}
        transition={{ ease: "easeInOut", duration: 0.8, delay: 0.2 }}
      />
      {/* Blue layer for today's goal, starts after the 'behind' portion */}
      <motion.div
        className="absolute top-0 h-full bg-blue-500"
        style={{ left: `${clampedBehind}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${clampedTodayGoal}%` }}
        transition={{ ease: "easeInOut", duration: 0.8, delay: 0.4 }}
      />
    </div>
  );
}

    