
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import MiniBibleReader from './mini-bible-reader';
import { cn } from '@/lib/utils';

export default function FloatingBibleButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 print:hidden">
        {isOpen && (
          <div className="w-[350px] sm:w-[450px] h-[600px] max-h-[80vh] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
             <MiniBibleReader onClose={() => setIsOpen(false)} />
          </div>
        )}
        
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg ring-4 ring-background transition-all hover:scale-110 active:scale-95",
            isOpen ? "bg-destructive hover:bg-destructive/90 rotate-45" : "bg-primary hover:bg-primary/90"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <BookOpen className="h-7 w-7" />
        </Button>
      </div>
    </>
  );
}
