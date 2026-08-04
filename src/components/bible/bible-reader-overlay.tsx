"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useGlobalBibleReader } from "@/contexts/global-bible-reader-context";
import MiniBibleReader from "@/components/bible/mini-bible-reader";
import { cn } from "@/lib/utils";

type BibleReaderOverlayProps = {
  placement: "hub" | "fab";
};

const COMPACT_WIDTH = "min(380px, calc(100vw - 1.5rem))";
const COMPACT_HEIGHT = "min(600px, calc(100dvh - 8rem))";

export function BibleReaderOverlay({ placement }: BibleReaderOverlayProps) {
  const { isOpen, isExpanded, setIsOpen, setIsExpanded } = useGlobalBibleReader();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // Match GlobalBibleReader FAB offset above the home footer.
  const fabBottom = pathname === "/" ? "10rem" : "6rem";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isExpanded) {
        setIsExpanded(false);
        return;
      }
      setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isExpanded, setIsExpanded, setIsOpen]);

  useEffect(() => {
    if (!isOpen || !isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isExpanded]);

  if (!mounted || !isOpen) return null;

  const compactStyle: React.CSSProperties =
    placement === "hub"
      ? {
          bottom: "5rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: COMPACT_WIDTH,
          height: COMPACT_HEIGHT,
        }
      : {
          bottom: fabBottom,
          right: "1.5rem",
          width: COMPACT_WIDTH,
          height: COMPACT_HEIGHT,
        };

  return createPortal(
    <>
      {!isExpanded ? (
        <button
          type="button"
          aria-label="Close bible reader"
          className="fixed inset-0 z-[120] ui-scrim"
          onClick={() => setIsOpen(false)}
        />
      ) : null}
      <div
        className={cn(
          "fixed z-[130] flex flex-col overflow-hidden bg-background",
          isExpanded ? "inset-0 rounded-none" : "glass-card rounded-xl border shadow-2xl",
        )}
        style={
          isExpanded
            ? {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                width: "100vw",
                height: "100dvh",
                maxHeight: "100dvh",
              }
            : compactStyle
        }
      >
        <MiniBibleReader onClose={() => setIsOpen(false)} />
      </div>
    </>,
    document.body,
  );
}
