
"use client";

import { useState, useEffect } from 'react';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import type { MemoryVerse } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import VerseDisplayDialog from '@/components/memorize/verse-display-dialog';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { Loader2, Zap, BookOpen, Info, ListChecks } from 'lucide-react';
import { format } from 'date-fns';

export default function MemorizePage() {
  const { memoryVerses, loading: versesLoading } = useMemoryVerses();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedVerseObj, setSelectedVerseObj] = useState<MemoryVerse | null>(null);
  const [isVerseDisplayOpen, setIsVerseDisplayOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const handleVerseClick = (verse: MemoryVerse) => {
    setSelectedVerseObj(verse);
    setIsVerseDisplayOpen(true);
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Loading page content...</p>
      </div>
    );
  }

  if (versesLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading memory verses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-4">
        <Zap className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Power-Ups</h1>
      </div>

      {memoryVerses.length === 0 ? (
        <Card className="mt-6 shadow-lg max-w-lg mx-auto">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Info className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-xl">No Power-Ups Available</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No memory verses have been added by the admin yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memoryVerses.map((verse) => (
            <Card key={verse.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <Button
                  variant="link"
                  className="p-0 h-auto text-lg font-semibold text-left justify-start text-primary hover:underline"
                  onClick={() => handleVerseClick(verse)}
                  title={`View ${verse.reference}`}
                >
                  {verse.reference}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Added: {verse.addedAt ? format(verse.addedAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                  {verse.isLordsPrayerChunk && <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs rounded-full">LP</span>}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VerseDisplayDialog
        isOpen={isVerseDisplayOpen}
        onOpenChange={setIsVerseDisplayOpen}
        verse={selectedVerseObj}
      />
      <BackToTopButton />
    </div>
  );
}
