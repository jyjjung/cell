"use client";

import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BibleReaderOverlay } from "@/components/bible/bible-reader-overlay";
import { useGlobalBibleReader } from "@/contexts/global-bible-reader-context";
import { usePathname } from "next/navigation";
import { isCellHomePath } from "@/lib/app-access";
import { cn } from "@/lib/utils";

export function GlobalBibleReader() {
  const { isOpen, setIsOpen } = useGlobalBibleReader();
  const pathname = usePathname();

  const hasReadingsHubPopup =
    pathname.startsWith('/bible-checklist') ||
    pathname.startsWith('/full-plan') ||
    pathname.startsWith('/memorize') ||
    pathname.startsWith('/leaderboard');
  const isAllowedPage = isCellHomePath(pathname);
  // Public landing only — Terms footer sits under the FAB.
  const clearFooter = pathname === '/';

  if (hasReadingsHubPopup) {
    return null;
  }

  if (!isAllowedPage && !isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed right-6 z-50",
          clearFooter ? "bottom-24" : "bottom-6",
        )}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open bible reader"
        >
          <BookOpen className="h-6 w-6" />
        </Button>
      </div>
      <BibleReaderOverlay placement="fab" />
    </>
  );
}
