
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
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
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
import { getPreviousChapterRef, getNextChapterRef } from '@/lib/bible-navigation';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { fetchPassageHtml, prefetchBibleVersion } from '@/lib/bible-passage-cache';
import { bibleVersionLabel, type BibleTextVersion } from '@/lib/bible-versions';
import { useBibleTextVersion } from '@/hooks/use-bible-text-version';
import { useAuth } from '@/contexts/auth-context';
import { useBiblePlan } from '@/hooks/use-bible-plan';
import { useUserBibleChecklist } from '@/hooks/use-user-bible-checklist';
import {
  getChapterPlanAssignmentStatus,
  isChapterMarkedCompleteInPlan,
  type ChapterPlanAssignment,
} from '@/lib/reading-utils';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import { format, isValid, parseISO } from 'date-fns';

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
  const prefetchControllerRef = useRef<AbortController | null>(null);

  const chapterRef = `${book} ${chapter}`;
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
  const hasAnyPlanCompletion = chapterPlanStatus.hasMultipleAssignments
    ? chapterPlanStatus.completedCount > 0
    : isChapterComplete;

  const markButtonLabel = chapterPlanStatus.hasMultipleAssignments
    ? chapterProgressPercent === 100
      ? t.chapterMarkedComplete
      : chapterProgressPercent > 0
        ? t.chapterPlanAssignmentsStatus
            .replace('{completed}', String(chapterPlanStatus.completedCount))
            .replace('{total}', String(chapterPlanStatus.total))
        : t.markChapterAsRead
    : isChapterComplete
      ? t.unmarkChapterAsRead
      : t.markChapterAsRead;

  const markButtonVariant = chapterPlanStatus.hasMultipleAssignments
    ? chapterProgressPercent === 100
      ? 'primary'
      : 'default'
    : hasAnyPlanCompletion
      ? 'primary'
      : 'default';
  const markButtonClassName = cn(
    'relative w-full h-9 overflow-hidden rounded-full text-xs font-semibold',
  );
  const showMarkButtonProgress =
    chapterPlanStatus.hasMultipleAssignments &&
    chapterProgressPercent > 0 &&
    chapterProgressPercent < 100;

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
  }, [targetPassage?.book, targetPassage?.chapter, targetPassage?.timestamp]);

  useEffect(() => {
    prefetchControllerRef.current?.abort();
    const controller = new AbortController();
    prefetchControllerRef.current = controller;
    void prefetchBibleVersion(version, { signal: controller.signal });
    return () => controller.abort();
  }, [version]);

  const fetchPassage = useCallback(async (b: string, c: number, v: BibleTextVersion, signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const { html: nextHtml } = await fetchPassageHtml(`${b} ${c}`, v, signal);
      setHtml(nextHtml);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message || 'Connection error');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      const assignment = chapterPlanStatus.assignments[0];
      if (assignment) {
        await markPassageCompleteWithLegacyCleanup(assignment.key, chapterRef);
      } else {
        await markMultiplePassages([chapterRef], true);
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
      const assignment = chapterPlanStatus.assignments[0];
      if (assignment) {
        await markMultiplePassages([assignment.key], false);
      } else {
        await markMultiplePassages([chapterRef], false);
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
        await markPassageCompleteWithLegacyCleanup(assignment.key, chapterRef);
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

  return (
    <div className="flex h-full min-h-0 flex-col bg-card overflow-hidden">
      <div className="p-3 border-b flex items-center justify-between gap-2 bg-muted/10 backdrop-blur z-20">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="secondary"
            size="sm"
            className="font-semibold text-sm h-9 px-3 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0"
            onClick={() => {
              setIsBrowsing(!isBrowsing);
              if (!isBrowsing) setBrowsingBook(null);
            }}
          >
            {book} {chapter}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-full shadow-sm hover:shadow-md transition-all font-bold text-xs bg-background shrink-0"
            onClick={() => setVersion(version === 'krv' ? 'esv' : 'krv')}
          >
            <Languages className="h-4 w-4 mr-1.5 text-primary" />
            {bibleVersionLabel(version)}
          </Button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-label={isExpanded ? t.shrinkBible : t.expandBible}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 overflow-hidden">
        {isBrowsing ? (
          <ScrollArea className="h-full p-4">
            {!browsingBook ? (
              <div className="grid grid-cols-2 gap-3 pb-6">
                {CANONICAL_BIBLE_ORDER.map(b => (
                  <Button
                    key={b}
                    variant={book === b ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'justify-start text-xs font-bold h-10 px-4 rounded-xl shadow-sm transition-all text-left truncate active:scale-95',
                      book !== b && 'bg-background hover:bg-primary/10 hover:border-primary/30',
                    )}
                    onClick={() => {
                      setBrowsingBook(b);
                    }}
                  >
                    {b}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="pb-6">
                <div className="flex items-center mb-6 gap-3 border-b pb-4 sticky top-0 bg-background/95 backdrop-blur z-10 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 rounded-full shadow-sm hover:bg-muted/50 transition-all font-semibold text-xs"
                    onClick={() => setBrowsingBook(null)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Books
                  </Button>
                  <h3 className="font-semibold tracking-tight text-lg">{browsingBook}</h3>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                  {Array.from({ length: BIBLE_BOOKS_DATA[browsingBook]?.chapters || 1 }, (_, i) => i + 1).map(c => (
                    <Button
                      key={c}
                      variant={book === browsingBook && chapter === c ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-12 w-full font-semibold text-sm rounded-xl transition-all shadow-sm active:scale-95',
                        book === browsingBook && chapter === c
                          ? 'scale-105 shadow-md shadow-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'bg-background hover:bg-primary/10 hover:border-primary/30',
                      )}
                      onClick={() => {
                        setBook(browsingBook);
                        setChapter(c);
                        setIsBrowsing(false);
                        setBrowsingBook(null);
                      }}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <ScrollArea ref={scrollRef} className="h-full px-6 py-8 md:px-10">
              {error ? (
                <div className="text-destructive text-center py-20 font-bold bg-destructive/10 rounded-2xl">
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
        <div className="p-3 border-t flex flex-col gap-2 bg-background/95 backdrop-blur z-20 shrink-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
          {currentUser ? (
            <>
              {showAssignmentPanel && chapterPlanStatus.hasMultipleAssignments ? (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 p-3 text-xs text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 space-y-2">
                      <p className="font-semibold">{t.chapterMultipleMatchesWarningTitle}</p>
                      <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
                        {chapterPlanStatus.completedCount > 0
                          ? t.chapterPlanAssignmentsStatus
                              .replace('{completed}', String(chapterPlanStatus.completedCount))
                              .replace('{total}', String(chapterPlanStatus.total))
                          : t.chapterMultipleMatchesWarningDescription}
                      </p>
                      <div className="space-y-2">
                        {chapterPlanStatus.assignments.map((assignment) => (
                          <button
                            key={assignment.key}
                            type="button"
                            disabled={isMarkingChapter}
                            onClick={() => void handleToggleAssignment(assignment)}
                            className={cn(
                              'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                              assignment.completed
                                ? 'border-emerald-300/60 bg-emerald-50/80 hover:bg-emerald-100/80 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/35'
                                : 'border-amber-300/60 bg-background/80 hover:bg-amber-50/60 dark:border-amber-700/50 dark:hover:bg-amber-950/20',
                              isMarkingChapter && 'opacity-70',
                            )}
                          >
                            <div
                              className={cn(
                                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                assignment.completed
                                  ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500'
                                  : 'border-amber-400 bg-background dark:border-amber-600',
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
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-amber-800 dark:text-amber-200',
                                )}
                              >
                                {assignment.completed
                                  ? t.chapterPlanAssignmentTapToUnmark
                                  : t.chapterPlanAssignmentTapToMark}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shadow-sm font-semibold text-xs h-9 px-4 hover:bg-primary/10 transition-all"
              onClick={handlePrev}
              disabled={!getPreviousChapterRef(book, chapter)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Prev
            </Button>
            <div className="flex gap-1 items-center">
              {Object.keys(BIBLE_BOOKS_DATA[book]?.chapters || {}).length > 1 && (
                <div className="bg-muted px-4 py-2 rounded-full shadow-inner border border-border/50">
                  <select
                    className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
                    value={chapter}
                    onChange={(e) => setChapter(parseInt(e.target.value))}
                  >
                    {Array.from({ length: BIBLE_BOOKS_DATA[book].chapters }, (_, i) => i + 1).map(c => (
                      <option key={c} value={c}>Ch. {c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shadow-sm font-semibold text-xs h-9 px-4 hover:bg-primary/10 transition-all"
              onClick={handleNext}
              disabled={!getNextChapterRef(book, chapter)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          {currentUser ? (
            <Button
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
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
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
