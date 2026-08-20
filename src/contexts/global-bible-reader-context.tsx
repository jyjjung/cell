"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface GlobalBibleReaderContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  openBibleReader: (book: string, chapter: number) => void;
  targetPassage: { book: string; chapter: number; timestamp: number } | null;
}

const GlobalBibleReaderContext = createContext<GlobalBibleReaderContextType | null>(null);

const noop = () => {};

/** Safe outside the provider (app switch / guest chrome) — reader stays closed. */
const emptyGlobalBibleReader: GlobalBibleReaderContextType = {
  isOpen: false,
  setIsOpen: noop,
  isExpanded: false,
  setIsExpanded: noop,
  openBibleReader: noop,
  targetPassage: null,
};

export function GlobalBibleReaderProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpenState] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [targetPassage, setTargetPassage] = useState<{ book: string; chapter: number; timestamp: number } | null>(null);

  const setIsOpen = useCallback((open: boolean) => {
    setIsOpenState(open);
    if (!open) setIsExpanded(false);
  }, []);

  const openBibleReader = useCallback((book: string, chapter: number) => {
    setTargetPassage({ book, chapter, timestamp: Date.now() });
    setIsOpen(true);
  }, [setIsOpen]);

  return (
    <GlobalBibleReaderContext.Provider value={{ isOpen, setIsOpen, isExpanded, setIsExpanded, openBibleReader, targetPassage }}>
      {children}
    </GlobalBibleReaderContext.Provider>
  );
}

export function useGlobalBibleReader() {
  return useContext(GlobalBibleReaderContext) ?? emptyGlobalBibleReader;
}
