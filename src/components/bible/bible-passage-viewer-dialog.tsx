
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpenText, AlertTriangle, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { parsePassageReferenceForNavigation, getPreviousChapterRef, getNextChapterRef } from '@/lib/bible-navigation';
import { useToast } from '@/hooks/use-toast';

interface BiblePassageViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  passageReference: string | null; // e.g., "Genesis 1" or "John 3:16-17"
  completedPassages?: string[];
  markMultiplePassages?: (passageTexts: string[], markComplete: boolean) => Promise<void>;
}

export default function BiblePassageViewerDialog({
  isOpen,
  onOpenChange,
  passageReference,
  completedPassages = [],
  markMultiplePassages,
}: BiblePassageViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibleHtml, setBibleHtml] = useState<string>('');
  
  const [currentBook, setCurrentBook] = useState<string | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number | null>(null);
  const [currentDisplayRef, setCurrentDisplayRef] = useState<string | null>(null);
  const { toast } = useToast();

  const updateCurrentPassageDetails = useCallback((ref: string | null) => {
    if (ref) {
      const parsed = parsePassageReferenceForNavigation(ref);
      if (parsed) {
        setCurrentBook(parsed.book);
        setCurrentChapter(parsed.chapter);
        // For display and fetching, we now use the original ref if it has verses,
        // or "Book Chapter" if it's just a chapter reference for ESV API compatibility.
        // The ESV API handles "Book Chapter" well for whole chapters.
        // If ref includes verses (e.g. "John 3:16-17"), use it as is.
        // If ref is just "John 3", use "John 3".
        setCurrentDisplayRef(ref); 
      } else {
        console.warn(`[BiblePassageViewer] Could not parse for navigation: ${ref}`);
        setCurrentDisplayRef(ref); // Fallback to original ref if parsing fails
        setCurrentBook(null);
        setCurrentChapter(null);
      }
    } else {
      setCurrentDisplayRef(null);
      setCurrentBook(null);
      setCurrentChapter(null);
    }
  }, []);

  useEffect(() => {
    updateCurrentPassageDetails(passageReference);
  }, [passageReference, updateCurrentPassageDetails]);

  useEffect(() => {
    if (isOpen && currentDisplayRef) {
      setIsLoading(true);
      setError(null);
      setBibleHtml('');

      const fetchPassage = async () => {
        try {
          if (currentDisplayRef.toLowerCase().includes("error:")) {
            setError(`Cannot fetch text for an invalid reference: "${currentDisplayRef}"`);
            setIsLoading(false);
            return;
          }

          const response = await fetch(`/api/esv?passage=${encodeURIComponent(currentDisplayRef)}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch passage (status: ${response.status})`);
          }
          
          const data = await response.json();
          if (data.html) {
            setBibleHtml(data.html);
          } else {
            setError('Passage content not found in API response.');
          }
        } catch (err: any) {
          console.error("Error fetching Bible passage:", err);
          setError(err.message || 'An unknown error occurred while fetching the passage.');
        } finally {
          setIsLoading(false);
        }
      };

      fetchPassage();
    }
  }, [isOpen, currentDisplayRef]);

  const handlePreviousChapter = () => {
    if (currentBook && currentChapter) {
      const prevRef = getPreviousChapterRef(currentBook, currentChapter);
      if (prevRef) {
        updateCurrentPassageDetails(prevRef); // This will trigger the useEffect to fetch new passage
      }
    }
  };

  const handleNextChapter = () => {
    if (currentBook && currentChapter) {
      const nextRef = getNextChapterRef(currentBook, currentChapter);
      if (nextRef) {
        updateCurrentPassageDetails(nextRef); // This will trigger the useEffect to fetch new passage
      }
    }
  };

  const handleMarkComplete = async () => {
    if (markMultiplePassages && currentDisplayRef) {
      // We mark the chapter reference (e.g., "John 3") as complete,
      // assuming currentDisplayRef for ESV API is often the whole chapter.
      // If currentDisplayRef is more specific (e.g. "John 3:16"), that exact ref is marked.
      const refToMark = (currentBook && currentChapter) ? `${currentBook} ${currentChapter}` : currentDisplayRef;
      try {
        await markMultiplePassages([refToMark], true);
        toast({ title: "Passage Marked", description: `"${refToMark}" marked as complete.` });
      } catch (e: any) {
        toast({ title: "Error", description: `Could not mark passage: ${e.message}`, variant: "destructive" });
      }
    }
  };
  
  const refForCompletionCheck = (currentBook && currentChapter) ? `${currentBook} ${currentChapter}` : currentDisplayRef;
  const isCurrentChapterComplete = refForCompletionCheck ? completedPassages.includes(refForCompletionCheck) : false;
  const canNavigatePrev = currentBook && currentChapter ? !!getPreviousChapterRef(currentBook, currentChapter) : false;
  const canNavigateNext = currentBook && currentChapter ? !!getNextChapterRef(currentBook, currentChapter) : false;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="pr-10 shrink-0">
          <DialogTitle className="flex items-center text-base sm:text-lg">
            <BookOpenText className="mr-2 h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{currentDisplayRef || "No passage selected"}</span>
            {!isLoading && !error && bibleHtml && <span className="ml-1 text-muted-foreground text-sm">(ESV)</span>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow min-h-0 overflow-y-auto my-2 sm:my-4 pr-2 sm:pr-4 -mr-2 sm:-mr-4">
          <ScrollArea className="h-full">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Loading passage...</p>
              </div>
            )}
            {error && (
              <div className="text-destructive flex flex-col items-center justify-center h-40 p-4 text-center">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="font-semibold">Error loading passage</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {!isLoading && !error && bibleHtml && (
              <div 
                dangerouslySetInnerHTML={{ __html: bibleHtml }} 
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed esv-text" 
              />
            )}
            {!isLoading && !error && !bibleHtml && currentDisplayRef && !currentDisplayRef.toLowerCase().includes("error:") && (
              <div className="text-muted-foreground flex items-center justify-center h-40">
                  <p>No text to display for this passage currently.</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t flex-col sm:flex-row gap-2 justify-between w-full shrink-0">
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
            <Button type="button" variant="outline" onClick={handlePreviousChapter} disabled={!canNavigatePrev || isLoading} size="sm">
              <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" /> Prev
            </Button>
            <Button type="button" variant="outline" onClick={handleNextChapter} disabled={!canNavigateNext || isLoading} size="sm">
              Next <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
            </Button>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
            {markMultiplePassages && (
              <Button 
                type="button" 
                variant="default" 
                onClick={handleMarkComplete} 
                disabled={isLoading || isCurrentChapterComplete || !refForCompletionCheck}
                size="sm"
              >
                <CheckSquare className="h-4 w-4 mr-1 sm:mr-2" />
                {isCurrentChapterComplete ? "Completed" : "Mark as Done"}
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">Close</Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
