
"use client";

import { useState, type FormEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookMarked, Search, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function GlobalBibleSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibleHtml, setBibleHtml] = useState<string>('');
  const [lastSearchedQuery, setLastSearchedQuery] = useState('');
  const { toast } = useToast();

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) {
      toast({ title: 'Search is empty', description: 'Please enter a Bible passage to search for.', variant: 'default' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setBibleHtml('');

    try {
      const response = await fetch(`/api/esv?passage=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch passage (status: ${response.status})`);
      }
      const data = await response.json();
      if (data.html) {
        setBibleHtml(data.html);
        setLastSearchedQuery(query);
      } else {
        setError('Passage not found. Please check the reference and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="fixed bottom-6 left-6 z-50 rounded-full shadow-lg h-12 w-12"
          aria-label="Open Bible Search"
        >
          <BookMarked className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 bottom-20 left-6 z-50" side="top" align="start">
        <div className="grid gap-4">
          <h4 className="font-medium leading-none">Bible Search</h4>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., John 3:16"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          <ScrollArea className="h-64 w-full pr-4">
            {lastSearchedQuery && !isLoading && !error && (
                <p className="text-sm font-semibold mb-2">{lastSearchedQuery} <span className="text-muted-foreground text-xs">(ESV)</span></p>
            )}
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground text-sm">Loading passage...</p>
              </div>
            )}
            {error && (
              <div className="text-destructive flex flex-col items-center justify-center h-full p-4 text-center text-sm">
                <AlertTriangle className="h-8 w-8 mb-2" />
                <p className="font-semibold">Error</p>
                <p>{error}</p>
              </div>
            )}
            {!isLoading && !error && bibleHtml && (
              <div
                dangerouslySetInnerHTML={{ __html: bibleHtml }}
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed esv-text"
              />
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
