"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface GlobalBibleReaderContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openBibleReader: (book: string, chapter: number) => void;
  targetPassage: { book: string; chapter: number; timestamp: number } | null;
}

const GlobalBibleReaderContext = createContext<GlobalBibleReaderContextType | undefined>(undefined);

export function GlobalBibleReaderProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [targetPassage, setTargetPassage] = useState<{ book: string; chapter: number; timestamp: number } | null>(null);

  const openBibleReader = useCallback((book: string, chapter: number) => {
    setTargetPassage({ book, chapter, timestamp: Date.now() });
    setIsOpen(true);
  }, []);

  return (
    <GlobalBibleReaderContext.Provider value={{ isOpen, setIsOpen, openBibleReader, targetPassage }}>
      {children}
    </GlobalBibleReaderContext.Provider>
  );
}

export function useGlobalBibleReader() {
  const context = useContext(GlobalBibleReaderContext);
  if (context === undefined) {
    throw new Error('useGlobalBibleReader must be used within a GlobalBibleReaderProvider');
  }
  return context;
}
