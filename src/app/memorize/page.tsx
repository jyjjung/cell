"use client";

import { useState, useEffect } from 'react';
import { useMemoryVerses } from '@/hooks/use-memory-verses';
import type { MemoryVerse } from '@/types';
import VerseDisplayDialog from '@/components/memorize/verse-display-dialog';
import BackToTopButton from '@/components/ui/back-to-top-button';
import { BookMarked, BookOpen, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { cn } from '@/lib/utils';

export default function MemorizePage() {
  const { memoryVerses, loading } = useMemoryVerses();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<MemoryVerse | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted || loading) return null;

  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <PageHeader title="Memory Verses" description={`${memoryVerses.length} verse${memoryVerses.length !== 1 ? 's' : ''}`} icon={Brain} accentColor="text-primary" iconBgColor="bg-primary/10" />

      {memoryVerses.length === 0 ? (
        <EmptyState icon={BookOpen} title="No memory verses yet" description="Check back after the admin adds some." />
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memoryVerses.map((verse, i) => (
            <motion.button
              key={verse.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => { setSelectedVerse(verse); setIsOpen(true); }}
              className="flex flex-col items-start gap-4 p-5 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm text-left hover:bg-card hover:shadow-md hover:border-primary/30 transition-all group active:scale-[0.98]"
            >
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                <BookMarked className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <p className="font-semibold text-base group-hover:text-primary transition-colors">{verse.reference}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Added {verse.addedAt ? format(verse.addedAt.toDate(), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              {verse.isLordsPrayerChunk && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <BookMarked className="h-3 w-3" /> Lord's Prayer
                </span>
              )}
            </motion.button>
          ))}
        </section>
      )}

      <BackToTopButton />
      <VerseDisplayDialog isOpen={isOpen} onOpenChange={setIsOpen} verse={selectedVerse} />
    </div>
  );
}
