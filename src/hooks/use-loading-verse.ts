
"use client";

import { useState, useEffect } from 'react';
import { LOADING_VERSES } from '@/lib/loading-verses';

/**
 * Custom hook to get a random ESV Bible verse from the loading repository.
 * Ensures randomization triggers on every navigation/load state.
 */
export function useLoadingVerse(trigger?: any) {
  const [verse, setVerse] = useState<{ text: string; reference: string } | null>(null);

  useEffect(() => {
    // Select a random verse whenever the trigger changes or on mount
    // Multiplying with a timestamp to increase entropy
    const index = Math.floor(Math.random() * LOADING_VERSES.length);
    setVerse(LOADING_VERSES[index]);
  }, [trigger]);

  return verse;
}
