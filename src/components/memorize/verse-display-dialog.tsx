
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpenText, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VerseDisplayDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  verseReference: string | null;
}

export default function VerseDisplayDialog({
  isOpen,
  onOpenChange,
  verseReference,
}: VerseDisplayDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verseHtml, setVerseHtml] = useState<string>('');

  useEffect(() => {
    if (isOpen && verseReference) {
      setIsLoading(true);
      setError(null);
      setVerseHtml('');

      const fetchVerse = async () => {
        try {
          const response = await fetch(`/api/esv?passage=${encodeURIComponent(verseReference)}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch verse (status: ${response.status})`);
          }
          const data = await response.json();
          if (data.html) {
            setVerseHtml(data.html);
          } else {
            setError('Verse content not found in API response.');
          }
        } catch (err: any) {
          console.error("Error fetching Bible verse:", err);
          setError(err.message || 'An unknown error occurred while fetching the verse.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchVerse();
    }
  }, [isOpen, verseReference]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center text-base sm:text-lg">
            <BookOpenText className="mr-2 h-5 w-5 text-primary shrink-0" />
            <span className="truncate">{verseReference || "Memory Verse"}</span>
             {!isLoading && !error && verseHtml && <span className="ml-1 text-muted-foreground text-sm">(ESV)</span>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-grow min-h-0 overflow-y-auto my-2 sm:my-4 pr-2 sm:pr-4 -mr-2 sm:-mr-4">
          <ScrollArea className="h-full">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">Loading verse...</p>
              </div>
            )}
            {error && (
              <div className="text-destructive flex flex-col items-center justify-center h-32 p-4 text-center">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="font-semibold">Error loading verse</p>
                <p className="text-sm">{error}</p>
              </div>
            )}
            {!isLoading && !error && verseHtml && (
              <div 
                dangerouslySetInnerHTML={{ __html: verseHtml }} 
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed esv-text"
              />
            )}
             {!isLoading && !error && !verseHtml && verseReference && (
                <div className="text-muted-foreground flex items-center justify-center h-32">
                    <p>No text to display.</p>
                </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-auto pt-4 border-t shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
