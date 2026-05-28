"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import MiniBibleReader from "@/components/bible/mini-bible-reader";
import { useGlobalBibleReader } from "@/contexts/global-bible-reader-context";
import { usePathname } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function GlobalBibleReader() {
  const { isOpen, setIsOpen } = useGlobalBibleReader();
  const pathname = usePathname();

  const hasReadingsHubPopup =
    pathname.startsWith('/bible-checklist') ||
    pathname.startsWith('/full-plan') ||
    pathname.startsWith('/memorize') ||
    pathname.startsWith('/leaderboard');
  const isAllowedPage = pathname === '/';

  if (hasReadingsHubPopup) {
    return null;
  }

  if (!isAllowedPage && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <BookOpen className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[calc(100vw-3rem)] sm:w-[380px] p-0 h-[600px] max-h-[calc(100vh-8rem)] border shadow-2xl overflow-hidden rounded-xl flex flex-col"
        >
          <MiniBibleReader onClose={() => setIsOpen(false)} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
