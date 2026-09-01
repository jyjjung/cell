"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Languages,
  CheckSquare,
  Check,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER, bibleBookLabel, bibleTestamentLabel } from '@/lib/bible-data';
import { getPreviousChapterRef, getNextChapterRef } from '@/lib/bible-navigation';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { fetchPassageHtml } from '@/lib/bible-passage-cache';
import { bibleVersionLabel, type BibleTextVersion } from '@/lib/bible-versions';
import { useBibleTextVersion } from '@/hooks/use-bible-text-version';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import {
  makeManualPassageKey,
} from '@/lib/passage-keys';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import {
  findEarliestIncompletePlanPassageKeyForChapter,
  getChapterPlanAssignmentStatus,
  isChapterMarkedCompleteInPlan,
  type ChapterPlanAssignment,
} from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';

const OT_BOOKS = CANONICAL_BIBLE_ORDER.filter((b) => (BIBLE_BOOKS_DATA[b]?.order ?? 0) <= 39);
const NT_BOOKS = CANONICAL_BIBLE_ORDER.filter((b) => (BIBLE_BOOKS_DATA[b]?.order ?? 0) >= 40);

interface MiniBibleReaderProps {
  onClose: () => void;
}

export default function MiniBibleReader({ onClose }: MiniBibleReaderProps) {
  const { targetPassage, isExpanded, setIsExpanded } = useGlobalBibleReader();
  const { currentUser } = useAuth();
  const { version, setVersion } = useBibleTextVersion();
  const { plan } = useBiblePlan();
  const { completedPassages, markMultiplePassages, markPassageCompleteWithLegacyCleanup } = useUserBibleChecklist();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const [book, setBook] = useState(targetPassage?.book || 'Genesis');
  const [chapter, setChapter] = useState(targetPassage?.chapter || 1);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingChapter, setIsMarkingChapter] = useState(false);
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browsingBook, setBrowsingBook] = useState<string | null>(null);
  const [showAssignmentPanel, setShowAssignmentPanel] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const assignmentPanelRef = useRef<HTMLDivElement>(null);
  const markButtonRef = useRef<HTMLButtonElement>(null);
  const chapterRef = `${book} ${chapter}`;

  const openBookPicker = () => {
    setBrowsingBook(null);
    setIsBrowsing(true);
    setShowAssignmentPanel(false);
  };

  const closeBookPicker = () => {
    setIsBrowsing(false);
    setBrowsingBook(null);
  };
  const chapterPlanStatus = getChapterPlanAssignmentStatus(
    plan?.dailyReadings,
    book,
    chapter,
    completedPassages,
  );
  const isChapterComplete = isChapterMarkedCompleteInPlan(
    plan?.dailyReadings,
    book,
    chapter,
    completedPassages,
  );
  const chapterProgressPercent =
    chapterPlanStatus.total > 0
      ? Math.round((chapterPlanStatus.completedCount / chapterPlanStatus.total) * 100)
      : isChapterComplete
        ? 100
        : 0;
  const isFullyRead = chapterPlanStatus.hasMultipleAssignments
    ? chapterProgressPercent === 100
    : isChapterComplete;
  const hasPartialRead =
    chapterPlanStatus.hasMultipleAssignments &&
    chapterProgressPercent > 0 &&
    chapterProgressPercent < 100;

  const markButtonLabel = chapterPlanStatus.hasMultipleAssignments
    ? isFullyRead
      ? t.chapterMarkedComplete
      : hasPartialRead
        ? t.chapterPlanAssignmentsStatus
            .replace('{completed}', String(chapterPlanStatus.completedCount))
            .replace('{total}', String(chapterPlanStatus.total))
        : t.markChapterAsRead
    : isChapterComplete
      ? t.unmarkChapterAsRead
      : t.markChapterAsRead;

  const markButtonVariant = 'outline' as const;
  const markButtonClassName = cn(
    'relative h-9 w-full overflow-hidden rounded-full border text-xs font-semibold transition-colors',
    isFullyRead
      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
      : hasPartialRead
        ? 'border-border bg-muted text-foreground hover:bg-accent'
        : 'border-border bg-muted/80 text-muted-foreground hover:bg-muted',
  );
  const showMarkButtonProgress = hasPartialRead;

  const formatPlanAssignmentDate = (date: string) => {
    const parsed = parseISO(date);
    return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : date;
  };

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
  }, [html, book, chapter]);

  useEffect(() => {
    if (!targetPassage) return;
    setBook(targetPassage.book);
    setChapter(targetPassage.chapter);
    setIsBrowsing(false);
    setBrowsingBook(null);
    setShowAssignmentPanel(false);
  }, [targetPassage]);

  const fetchPassage = useCallback(async (b: string, c: number, v: BibleTextVersion, signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const { html: nextHtml } = await fetchPassageHtml(`${b} ${c}`, v, signal);
      setHtml(nextHtml);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        const offline =
          typeof navigator !== 'undefined' && navigator.onLine === false;
        setError(offline ? t.bibleOfflineUnavailable : t.bibleConnectionError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [t.bibleOfflineUnavailable, t.bibleConnectionError]);

  useEffect(() => {
    const abortController = new AbortController();
    fetchPassage(book, chapter, version, abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [book, chapter, version, fetchPassage]);

  useEffect(() => {
    setShowAssignmentPanel(false);
  }, [book, chapter]);

  useEffect(() => {
    if (!showAssignmentPanel) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (assignmentPanelRef.current?.contains(target)) return;
      if (markButtonRef.current?.contains(target)) return;
      setShowAssignmentPanel(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showAssignmentPanel]);

  const handlePrev = () => {
    const prev = getPreviousChapterRef(book, chapter);
    if (prev) {
      const parts = prev.split(' ');
      const newBook = parts.slice(0, -1).join(' ');
      const newChap = parseInt(parts[parts.length - 1]);
      setBook(newBook);
      setChapter(newChap);
    }
  };

  const handleNext = () => {
    const next = getNextChapterRef(book, chapter);
    if (next) {
      const parts = next.split(' ');
      const newBook = parts.slice(0, -1).join(' ');
      const newChap = parseInt(parts[parts.length - 1]);
      setBook(newBook);
      setChapter(newChap);
    }
  };

  const handleMarkChapter = async () => {
    if (!currentUser || isChapterComplete) return;

    setIsMarkingChapter(true);
    try {
      const earliestPlanKey = findEarliestIncompletePlanPassageKeyForChapter(
        plan?.dailyReadings,
        book,
        chapter,
        completedPassages,
      );
      if (earliestPlanKey) {
        await markPassageCompleteWithLegacyCleanup(earliestPlanKey, chapterRef);
      } else {
        await markMultiplePassages([makeManualPassageKey(chapterRef)], true);
      }
    } catch (e) {
      console.error('Failed to mark chapter as read:', e);
    } finally {
      setIsMarkingChapter(false);
    }
  };

  const handleUnmarkChapter = async () => {
    if (!currentUser || !isChapterComplete || isMarkingChapter) return;

    setIsMarkingChapter(true);
    try {
      const keysToRemove = new Set<string>();
      if (chapterPlanStatus.assignments.length > 0) {
        chapterPlanStatus.assignments
          .filter((assignment) => assignment.completed)
          .forEach((assignment) => keysToRemove.add(assignment.key));
      } else {
        keysToRemove.add(makeManualPassageKey(chapterRef));
      }
      if (completedPassages.includes(chapterRef)) {
        keysToRemove.add(chapterRef);
      }
      if (keysToRemove.size > 0) {
        await markMultiplePassages([...keysToRemove], false);
      }
    } catch (e) {
      console.error('Failed to unmark chapter as read:', e);
    } finally {
      setIsMarkingChapter(false);
    }
  };

  const handleToggleAssignment = async (assignment: ChapterPlanAssignment) => {
    if (!currentUser || isMarkingChapter) return;

    setIsMarkingChapter(true);
    try {
      if (assignment.completed) {
        await markMultiplePassages([assignment.key], false);
      } else {
        await markMultiplePassages([assignment.key], true);
      }
    } catch (e) {
      console.error('Failed to toggle plan assignment:', e);
    } finally {
      setIsMarkingChapter(false);
      setShowAssignmentPanel(false);
    }
  };

  const handlePrimaryChapterAction = () => {
    if (chapterPlanStatus.hasMultipleAssignments) {
      setShowAssignmentPanel((open) => !open);
      return;
    }
    if (isChapterComplete) {
      void handleUnmarkChapter();
      return;
    }
    void handleMarkChapter();
  };

  const isKoreanLabels = version === 'krv';
  const bookLabel = bibleBookLabel(book, isKoreanLabels);

  const toggleBookAccordion = (bookName: string) => {
    setBrowsingBook((prev) => (prev === bookName ? null : bookName));
  };

  const selectChapter = (bookName: string, chapterNum: number) => {
    setBook(bookName);
    setChapter(chapterNum);
    closeBookPicker();
  };

  const renderBookAccordion = (books: string[]) => (
    <div className="flex flex-col gap-1.5">
      {books.map((b) => {
        const open = browsingBook === b;
        const isCurrent = book === b;
        const chapterTotal = BIBLE_BOOKS_DATA[b]?.chapters ?? 1;
        return (
          <div key={b}>
            <Button
              type="button"
              variant="ghost"
              title={b}
              aria-expanded={open}
              onClick={() => toggleBookAccordion(b)}
              className={cn(
                'flex h-11 w-full items-center justify-start rounded-xl px-3 text-sm font-semibold',
                open || isCurrent
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/70 text-foreground hover:bg-muted',
              )}
            >
              {bibleBookLabel(b, isKoreanLabels)}
            </Button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  key={`${b}-chapters`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                    {Array.from({ length: chapterTotal }, (_, i) => i + 1).map((c) => {
                      const selected = isCurrent && chapter === c;
                      return (
                        <Button
                          key={c}
                          type="button"
                          variant="ghost"
                          onClick={() => selectChapter(b, c)}
                          className={cn(
                            'flex h-11 items-center justify-center rounded-xl text-sm font-semibold tabular-nums',
                            selected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'border border-border/70 bg-background text-foreground hover:bg-muted',
                          )}
                        >
                          {c}
                        </Button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-card overflow-hidden">
      <div className="z-20 flex items-center justify-between gap-2 border-b border-border/70 bg-muted/10 p-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'inline-flex h-auto min-h-11 shrink-0 items-center rounded-full border px-3 text-sm font-semibold shadow-sm',
              isBrowsing
                ? 'border-primary/40 bg-primary text-primary-foreground'
                : 'border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
            )}
            onClick={() => {
              if (isBrowsing) closeBookPicker();
              else openBookPicker();
            }}
            aria-expanded={isBrowsing}
            aria-label="Choose book and chapter"
          >
            {bookLabel} {chapter}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 rounded-full bg-background px-3 text-xs font-bold shadow-sm transition-all hover:shadow-md"
            onClick={() => setVersion(version === 'krv' ? 'esv' : 'krv')}
          >
            <Languages className="mr-1.5 h-4 w-4 text-primary" />
            {bibleVersionLabel(version)}
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? t.shrinkBible : t.expandBible}
            icon={isExpanded ? Minimize2 : Maximize2}
          />
          <IconButton
            variant="ghost"
            className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
            aria-label="Close"
            icon={X}
          />
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {isBrowsing ? (
          <ScrollArea className="h-full min-h-0">
            <div className="space-y-4 p-2.5 pb-6">
              {(
                [
                  { id: 'ot' as const, books: OT_BOOKS },
                  { id: 'nt' as const, books: NT_BOOKS },
                ] as const
              ).map((section) => (
                <div key={section.id}>
                  <div className="sticky top-0 z-10 -mx-2.5 mb-1.5 bg-background/95 px-2.5 py-1 backdrop-blur">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {bibleTestamentLabel(section.id, isKoreanLabels)}
                    </p>
                  </div>
                  {renderBookAccordion(section.books)}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
                <LoadingSpinner size="md" className="text-primary" />
              </div>
            )}
            <ScrollArea ref={scrollRef} className="h-full px-6 py-8 md:px-10">
              {error ? (
                <div className="rounded-2xl bg-destructive/10 py-20 text-center font-bold text-destructive">
                  <p>{error}</p>
                </div>
              ) : (
                <div
                  className="prose prose-lg lg:prose-xl prose-p:my-2 dark:prose-invert max-w-none bible-prose pb-12 bible-text opacity-90 transition-opacity"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {!isBrowsing && (
        <div className="z-20 flex shrink-0 flex-col gap-2 border-t bg-background/95 p-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur">
          {currentUser ? (
            <>
              {showAssignmentPanel && chapterPlanStatus.hasMultipleAssignments ? (
                <div
                  ref={assignmentPanelRef}
                  className="rounded-2xl border border-border bg-muted/60 p-3 text-xs text-foreground"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 space-y-2">
                      <p className="font-semibold">{t.chapterMultipleMatchesWarningTitle}</p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {chapterPlanStatus.completedCount > 0
                          ? t.chapterPlanAssignmentsStatus
                              .replace('{completed}', String(chapterPlanStatus.completedCount))
                              .replace('{total}', String(chapterPlanStatus.total))
                          : t.chapterMultipleMatchesWarningDescription}
                      </p>
                      <div className="space-y-2">
                        {chapterPlanStatus.assignments.map((assignment) => (
                          <Button
                            key={assignment.key}
                            type="button"
                            variant="ghost"
                            disabled={isMarkingChapter}
                            onClick={() => void handleToggleAssignment(assignment)}
                            className={cn(
                              'flex h-auto w-full items-start gap-3 rounded-xl border p-3 text-left',
                              assignment.completed
                                ? 'border-primary/30 bg-primary/10 hover:bg-primary/15'
                                : 'border-border bg-background/80 hover:bg-accent/60',
                              isMarkingChapter && 'opacity-70',
                            )}
                          >
                            <div
                              className={cn(
                                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                assignment.completed
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40 bg-background',
                              )}
                            >
                              {assignment.completed ? <Check className="h-3 w-3" /> : null}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold">{assignment.displayText}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {t.chapterPlanAssignmentLabel} {formatPlanAssignmentDate(assignment.date)}
                              </div>
                              <div
                                className={cn(
                                  'mt-1 text-[11px] font-semibold',
                                  assignment.completed
                                    ? 'text-primary'
                                    : 'text-muted-foreground',
                                )}
                              >
                                {assignment.completed
                                  ? t.chapterPlanAssignmentTapToUnmark
                                  : t.chapterPlanAssignmentTapToMark}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-4 text-xs font-semibold shadow-sm transition-all hover:bg-primary/10"
              onClick={handlePrev}
              disabled={!getPreviousChapterRef(book, chapter)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-4 text-xs font-semibold shadow-sm transition-all hover:bg-primary/10"
              onClick={handleNext}
              disabled={!getNextChapterRef(book, chapter)}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          {currentUser ? (
            <Button
              ref={markButtonRef}
              type="button"
              variant={markButtonVariant}
              size="sm"
              className={markButtonClassName}
              onClick={() => handlePrimaryChapterAction()}
              disabled={isMarkingChapter}
            >
              {showMarkButtonProgress ? (
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${chapterProgressPercent}%` }}
                />
              ) : null}
              <span className="relative z-10 inline-flex items-center">
                {isMarkingChapter ? (
                  <ButtonSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckSquare className="mr-2 h-3.5 w-3.5" />
                )}
                {markButtonLabel}
              </span>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
