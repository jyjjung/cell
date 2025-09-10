"use client";

import { EventCategory } from '@/types';
import { categoryBackgroundColors, categoryTextColors } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function CalendarKey() {
  return (
    <div className="mt-4 p-2 border rounded-md">
        <h4 className="text-sm font-semibold mb-2 text-center">Calendar Key</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {Object.values(EventCategory).map((category) => (
                <div key={category} className={cn("text-xs font-medium px-2 py-1 rounded-full", categoryBackgroundColors[category], categoryTextColors[category])}>
                    {category}
                </div>
            ))}
        </div>
    </div>
  );
}
