
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpenText, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BiblePassageViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  passageReference: string | null;
}

export default function BiblePassageViewerDialog({
  isOpen,
  onOpenChange,
  passageReference,
}: BiblePassageViewerDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibleHtml, setBibleHtml] = useState<string>('');

  useEffect(() => {
    if (isOpen && passageReference) {
      setIsLoading(true);
      setError(null);
      setBibleHtml('');

      const fetchPassage = async () => {
        try {
          if (passageReference.toLowerCase().includes("error:")) {
            setError(`Cannot fetch text for an invalid reference: "${passageReference}"`);
            setIsLoading(false);
            return;
          }

          // Calls the Next.js API route for scripture.api.bible (ESV)
          const response = await fetch(`/api/bible-text?passage=${encodeURIComponent(passageReference)}`);
          
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
  }, [isOpen, passageReference]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BookOpenText className="mr-2 h-5 w-5 text-primary" />
            Bible Passage: {passageReference || "No passage selected"} (ESV via scripture.api.bible)
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 pr-6">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading passage...</p>
            </div>
          )}
          {error && (
            <div className="text-destructive flex flex-col items-center justify-center h-40 p-4">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-semibold text-center">Error loading passage</p>
              <p className="text-sm text-center">{error}</p>
            </div>
          )}
          {!isLoading && !error && bibleHtml && (
            // HTML content from scripture.api.bible
            <div dangerouslySetInnerHTML={{ __html: bibleHtml }} className="prose prose-sm dark:prose-invert max-w-none leading-relaxed" />
          )}
           {!isLoading && !error && !bibleHtml && passageReference && !passageReference.toLowerCase().includes("error:") && (
             <div className="text-muted-foreground flex items-center justify-center h-40">
                <p>No text to display for this passage currently.</p>
            </div>
           )}
        </ScrollArea>
        <DialogFooter className="mt-auto">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
