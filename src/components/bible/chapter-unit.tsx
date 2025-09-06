
"use client";

import { Button } from '@/components/ui/button';
import { Check, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChapterUnitProps {
  chapterNumber: number;
  isCompleted: boolean;
  onClick: () => void;
}

export default function ChapterUnit({ chapterNumber, isCompleted, onClick }: ChapterUnitProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant={isCompleted ? "default" : "outline"}
        onClick={onClick}
        className={cn(
          "relative w-14 h-14 rounded-full p-0 flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-110",
          isCompleted 
            ? "bg-yellow-400 text-yellow-900 border-2 border-yellow-500 hover:bg-yellow-500 shadow-lg" 
            : "bg-background/70 border-2"
        )}
        aria-label={`Chapter ${chapterNumber}`}
      >
        <div className="absolute inset-0 rounded-full" />
        <span className="relative z-10 text-lg font-bold">
            {isCompleted ? <Star className="w-6 h-6 fill-current" /> : chapterNumber}
        </span>
      </Button>
      <div 
        className={cn(
            "w-3 h-3 rounded-full border-2",
            isCompleted ? "bg-yellow-400 border-yellow-500" : "bg-muted border-border"
        )}
      />
    </div>
  );
}
