
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import BibleBookChapterSelector from './bible-book-chapter-selector';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function GlobalBibleNavigator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibleHtml, setBibleHtml] = useState<string>('');
  
  const [currentBook, setCurrentBook] = useState<string | null>('Genesis');
  const [currentChapter, setCurrentChapter] = useState<number | null>(1);
  const [displayReference, setDisplayReference] = useState<string>('Genesis 1');

  const fetchPassage = useCallback(async (ref: string) => {
    if (!ref) return;

    setIsLoading(true);
    setError(null);
    setBibleHtml('');

    try {
      const response = await fetch(`/api/esv?passage=${encodeURIComponent(ref)}`);
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
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Fetch initial passage when component mounts if popover is open
    // Or, you can decide to only fetch when a selection is made.
    // For now, let's fetch on selection.
  }, []);

  const handleSelectChapter = (book: string, chapter: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    const newRef = `${book} ${chapter}`;
    setDisplayReference(newRef);
    fetchPassage(newRef);
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-6 left-6 z-50 h-12 w-12 rounded-full shadow-lg"
            aria-label="Open Bible Navigator"
          >
            <BookOpen className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="start" 
          className="w-[calc(100vw-2rem)] h-[75vh] sm:w-[700px] md:w-[800px] p-0 flex"
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevents focus stealing
        >
          <div className="w-1/3 h-full border-r">
            <BibleBookChapterSelector
              initialBook={currentBook}
              initialChapter={currentChapter}
              onSelect={handleSelectChapter}
            />
          </div>
          <div className="w-2/3 h-full flex flex-col">
            <div className="p-3 border-b shrink-0">
              <h3 className="font-semibold text-lg">{displayReference}</h3>
            </div>
            <ScrollArea className="flex-grow h-0">
              <div className="p-4">
                {isLoading && (
                  <div className="flex flex-col items-center justify-center pt-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading passage...</p>
                  </div>
                )}
                {error && (
                  <div className="text-destructive flex flex-col items-center justify-center pt-10 text-center">
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
                 {!isLoading && !error && !bibleHtml && (
                    <div className="text-muted-foreground text-center pt-10">
                        <p>Select a book and chapter to begin reading.</p>
                    </div>
                 )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
