
"use client";

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChapterUnitProps {
  chapterNumber: number;
  isCompleted: boolean;
  isOverdue: boolean;
  onClick: () => void;
}

export default function ChapterUnit({ chapterNumber, isCompleted, isOverdue, onClick }: ChapterUnitProps) {
  return (
    <Button
      variant={"outline"}
      onClick={onClick}
      className={cn(
        "relative w-14 h-14 rounded-full p-0 flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-110 shadow-md border-2",
        isCompleted 
          ? "bg-green-500 text-green-50 border-green-600 hover:bg-green-600" 
          : isOverdue
          ? "bg-red-500 text-red-50 border-red-600 hover:bg-red-600"
          : "bg-background/70 border-border"
      )}
      aria-label={`Chapter ${chapterNumber}`}
    >
      <span className="relative z-10 text-lg font-bold">
        {chapterNumber}
      </span>
    </Button>
  );
}
