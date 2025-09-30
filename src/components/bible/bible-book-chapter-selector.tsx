
"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { BIBLE_BOOKS_DATA, CANONICAL_BIBLE_ORDER } from '@/lib/bible-data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BibleBookChapterSelectorProps {
  initialBook: string | null;
  initialChapter: number | null;
  onSelect: (book: string, chapter: number) => void;
}

const OLD_TESTAMENT_BOOKS = CANONICAL_BIBLE_ORDER.slice(0, 39);
const NEW_TESTAMENT_BOOKS = CANONICAL_BIBLE_ORDER.slice(39);

export default function BibleBookChapterSelector({
  initialBook,
  initialChapter,
  onSelect,
}: BibleBookChapterSelectorProps) {
  const isNewTestament = initialBook && BIBLE_BOOKS_DATA[initialBook]?.order > 39;
  const [activeTab, setActiveTab] = useState(isNewTestament ? 'nt' : 'ot');
  const [selectedBook, setSelectedBook] = useState<string | null>(initialBook);

  const booksToList = activeTab === 'ot' ? OLD_TESTAMENT_BOOKS : NEW_TESTAMENT_BOOKS;
  
  useEffect(() => {
    // If the initialBook changes, update the selectedBook and potentially the active tab
    const newIsNewTestament = initialBook && BIBLE_BOOKS_DATA[initialBook]?.order > 39;
    setActiveTab(newIsNewTestament ? 'nt' : 'ot');
    setSelectedBook(initialBook);
  }, [initialBook]);


  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ot">Old Testament</TabsTrigger>
          <TabsTrigger value="nt">New Testament</TabsTrigger>
        </TabsList>
      </Tabs>
      <ScrollArea className="flex-grow">
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={selectedBook || undefined}
          onValueChange={(value) => setSelectedBook(value || null)}
        >
          {booksToList.map((bookName) => {
            const bookMeta = BIBLE_BOOKS_DATA[bookName];
            if (!bookMeta) return null;
            const chapters = Array.from({ length: bookMeta.chapters }, (_, i) => i + 1);

            return (
              <AccordionItem value={bookName} key={bookName} className="border-b border-border/50">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:bg-accent/50 [&[data-state=open]>svg]:rotate-180">
                  {bookName}
                   <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                </AccordionTrigger>
                <AccordionContent>
                  <AnimatePresence>
                    {selectedBook === bookName && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="bg-muted/30 p-2"
                        >
                            <div className="grid grid-cols-5 gap-1">
                                {chapters.map((chapter) => (
                                <Button
                                    key={chapter}
                                    variant={chapter === initialChapter && bookName === initialBook ? 'default' : 'ghost'}
                                    size="sm"
                                    className="h-8 w-8"
                                    onClick={() => onSelect(bookName, chapter)}
                                >
                                    {chapter}
                                </Button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                  </AnimatePresence>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </ScrollArea>
    </div>
  );
}
