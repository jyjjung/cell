
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ChevronLeft, ChevronRight, X, Search, Languages } from 'lucide-react';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
import { getPreviousChapterRef, getNextChapterRef } from '@/lib/bible-navigation';
import { useGlobalBibleReader } from '@/contexts/global-bible-reader-context';
import { cn } from '@/lib/utils';

interface MiniBibleReaderProps {
  onClose: () => void;
}

export default function MiniBibleReader({ onClose }: MiniBibleReaderProps) {
  const { targetPassage } = useGlobalBibleReader();

  const [book, setBook] = useState(targetPassage?.book || 'Genesis');
  const [chapter, setChapter] = useState(targetPassage?.chapter || 1);
  const [version, setVersion] = useState<'korRV' | 'engESV'>('korRV');
  const [isLoading, setIsLoading] = useState(false);
  const [html, setHtml] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browsingBook, setBrowsingBook] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
  }, [html, book, chapter]);

  useEffect(() => {
    if (targetPassage) {
      setBook(targetPassage.book);
      setChapter(targetPassage.chapter);
      setIsBrowsing(false);
      setBrowsingBook(null);
    }
  }, [targetPassage]);

  const fetchPassage = useCallback(async (b: string, c: number, v: string, signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/esv?passage=${encodeURIComponent(`${b} ${c}`)}&version=${v}`, { signal });
      const data = await resp.json();
      if (data.html) {
        setHtml(data.html);
      } else {
        setError(data.error || 'Failed to load passage');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError('Connection error');
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

  return (
    <div className="flex flex-col h-full bg-card rounded-xl overflow-hidden shadow-2xl">
      <div className="p-4 border-b flex items-center justify-between bg-muted/10 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            size="sm" 
            className="font-black text-sm h-10 px-4 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
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
            className="h-10 px-3 rounded-full shadow-sm hover:shadow-md transition-all font-bold text-xs bg-background"
            onClick={() => setVersion(version === 'korRV' ? 'engESV' : 'korRV')}
          >
            <Languages className="h-4 w-4 mr-2 text-primary" />
            {version === 'korRV' ? 'KRV' : 'ESV'}
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {isBrowsing ? (
          <ScrollArea className="h-full p-4">
            {!browsingBook ? (
              <div className="grid grid-cols-2 gap-3 pb-6">
                {CANONICAL_BIBLE_ORDER.map(b => (
                  <Button 
                    key={b} 
                    variant={book === b ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "justify-start text-xs font-bold h-10 px-4 rounded-xl shadow-sm transition-all text-left truncate active:scale-95",
                      book !== b && "bg-background hover:bg-primary/10 hover:border-primary/30"
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
                  <Button variant="outline" size="sm" className="h-9 px-3 rounded-full shadow-sm hover:bg-muted/50 transition-all font-black text-xs" onClick={() => setBrowsingBook(null)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Books
                  </Button>
                  <h3 className="font-black tracking-tight text-lg">{browsingBook}</h3>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-3">
                  {Array.from({ length: BIBLE_BOOKS_DATA[browsingBook]?.chapters || 1 }, (_, i) => i + 1).map(c => (
                    <Button
                      key={c}
                      variant={book === browsingBook && chapter === c ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-12 w-full font-black text-sm rounded-xl transition-all shadow-sm active:scale-95", 
                        book === browsingBook && chapter === c ? "scale-105 shadow-md shadow-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background" : "bg-background hover:bg-primary/10 hover:border-primary/30"
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
                  className="prose prose-lg lg:prose-xl prose-p:my-2 dark:prose-invert max-w-none bible-prose pb-12 esv-text opacity-90 transition-opacity"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              )}
            </ScrollArea>
          </>
        )}
      </div>

      {!isBrowsing && (
        <div className="p-4 border-t flex justify-between items-center bg-background/95 backdrop-blur z-20 sticky bottom-0 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
          <Button variant="outline" size="sm" className="rounded-full shadow-sm font-black text-xs h-10 px-4 hover:bg-primary/10 transition-all" onClick={handlePrev} disabled={!getPreviousChapterRef(book, chapter)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <div className="flex gap-1 items-center">
            {Object.keys(BIBLE_BOOKS_DATA[book]?.chapters || {}).length > 1 && (
               <div className="bg-muted px-4 py-2 rounded-full shadow-inner border border-border/50">
                 <select 
                  className="bg-transparent text-sm font-black tracking-widest focus:outline-none cursor-pointer"
                  value={chapter}
                  onChange={(e) => setChapter(parseInt(e.target.value))}
                 >
                   {Array.from({ length: BIBLE_BOOKS_DATA[book].chapters }, (_, i) => i + 1).map(c => (
                     <option key={c} value={c}>CH. {c}</option>
                   ))}
                 </select>
               </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="rounded-full shadow-sm font-black text-xs h-10 px-4 hover:bg-primary/10 transition-all" onClick={handleNext} disabled={!getNextChapterRef(book, chapter)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
