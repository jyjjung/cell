
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpenText, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MemoryVerse } from '@/types';
import { fetchPassageHtml } from '@/lib/bible-passage-cache';
import { bibleVersionLabel } from '@/lib/bible-versions';
import { useBibleTextVersion } from '@/hooks/use-bible-text-version';

interface VerseDisplayDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  verse: MemoryVerse | null;
}

export default function VerseDisplayDialog({
  isOpen,
  onOpenChange,
  verse,
}: VerseDisplayDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verseHtml, setVerseHtml] = useState<string>('');
  const [currentVerseTextOverride, setCurrentVerseTextOverride] = useState<string | null>(null);
  const { version, setVersion } = useBibleTextVersion();
  const [displayVersionName, setDisplayVersionName] = useState<string>('KRV');

  useEffect(() => {
    if (isOpen && verse) {
      setIsLoading(true);
      setError(null);
      setVerseHtml('');
      setCurrentVerseTextOverride(null);

      if (verse.textOverride && verse.textOverride.trim() !== '') {
        setCurrentVerseTextOverride(verse.textOverride);
        setIsLoading(false);
      }
      else if (verse.reference && verse.reference.trim() !== '') {
        const fetchVerse = async () => {
          try {
            const { html } = await fetchPassageHtml(verse.reference!, version);
            setVerseHtml(html);
            setDisplayVersionName(bibleVersionLabel(version));
          } catch (err: any) {
            console.error("Error fetching Bible verse:", err);
            setError(err.message || 'An unknown error occurred while fetching the verse.');
          } finally {
            setIsLoading(false);
          }
        };
        fetchVerse();
      }
      else {
        setError("No verse reference or text override provided to display.");
        setIsLoading(false);
      }
    } else if (!isOpen) {
      setCurrentVerseTextOverride(null);
      setVerseHtml('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, verse, version]);

  const displayReference = verse?.reference || "Memory Verse";
  const showEsvSource = !verse?.textOverride && !isLoading && !error && verseHtml;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center text-xl sm:text-2xl justify-between w-full pr-8">
            <span className="truncate">{displayReference}</span>
            <div className="flex gap-1 ml-4 shrink-0">
              <Button 
                variant={version === 'krv' ? "default" : "outline"} 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={() => setVersion('krv')}
              >
                KRV
              </Button>
              <Button 
                variant={version === 'esv' ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setVersion('esv')}
              >
                ESV
              </Button>
            </div>
          </DialogTitle>
          {showEsvSource && <span className="text-muted-foreground text-xs font-normal mt-1">({displayVersionName})</span>}
        </DialogHeader>
        
        <div className="flex-grow min-h-0 overflow-y-auto px-6">
          <ScrollArea className="h-full pr-6 -mr-6">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-56">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading verse...</p>
              </div>
            )}
            {error && (
              <div className="text-destructive flex flex-col items-center justify-center h-56 p-4 text-center">
                <AlertTriangle className="h-10 w-10 mb-4" />
                <p className="font-semibold">Error loading verse</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {!isLoading && !error && currentVerseTextOverride && (
              <div className="whitespace-pre-wrap p-1 text-base sm:text-lg leading-relaxed">
                {currentVerseTextOverride}
              </div>
            )}
            {!isLoading && !error && !currentVerseTextOverride && verseHtml && (
              <div 
                dangerouslySetInnerHTML={{ __html: verseHtml }} 
                className="prose dark:prose-invert max-w-none leading-relaxed bible-prose bible-text"
              />
            )}
             {!isLoading && !error && !verseHtml && !currentVerseTextOverride && verse?.reference && (
                <div className="text-muted-foreground flex items-center justify-center h-56">
                    <p>No text to display.</p>
                </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-auto p-6 pt-4 border-t shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
