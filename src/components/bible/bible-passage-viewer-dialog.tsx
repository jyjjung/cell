
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
  const [bibleText, setBibleText] = useState<string>('');

  useEffect(() => {
    if (isOpen && passageReference) {
      setIsLoading(true);
      setError(null);
      setBibleText('');

      // Simulate API call
      const timer = setTimeout(() => {
        if (passageReference.toLowerCase().includes("error")) {
            setError(`Cannot fetch text for an invalid reference: "${passageReference}"`);
            setIsLoading(false);
            return;
        }
        // A real API call would parse the passageReference to format it for the API
        // e.g., for "John 3:16-18", API might need book: "John", chapter: 3, startVerse: 16, endVerse: 18
        // For now, we'll just use the reference as is in the placeholder.
        const mockText = `This is the placeholder text for "${passageReference}".\n\nA real implementation would fetch this content from a Bible API. You would typically parse the reference (e.g., 'Genesis 1:1-5') to make a structured API request. The API would return the formatted text, which you would then display here. This often involves signing up for an API key from services like the ESV API, Bible API (various providers), etc. The text would then be displayed with verse numbers and paragraph breaks as provided by the API.`;
        setBibleText(mockText);
        setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, passageReference]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BookOpenText className="mr-2 h-5 w-5 text-primary" />
            Bible Passage: {passageReference || "No passage selected"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 pr-6"> {/* Added pr-6 for scrollbar space */}
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading passage...</p>
            </div>
          )}
          {error && (
            <div className="text-destructive flex flex-col items-center justify-center h-40">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Error loading passage</p>
              <p className="text-sm text-center">{error}</p>
            </div>
          )}
          {!isLoading && !error && bibleText && (
            <DialogDescription className="whitespace-pre-wrap text-sm leading-relaxed">
              {bibleText}
            </DialogDescription>
          )}
           {!isLoading && !error && !bibleText && passageReference && !passageReference.toLowerCase().includes("error") && (
             <div className="text-muted-foreground flex items-center justify-center h-40">
                <p>No text to display for this passage currently.</p>
            </div>
           )}
        </ScrollArea>
        <DialogFooter className="mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
