"use client";

import { createContext, useContext, useState, type ReactNode } from 'react';

interface PageLoadingContextType {
  isPageLoading: boolean;
  setIsPageLoading: (isLoading: boolean) => void;
}

const PageLoadingContext = createContext<PageLoadingContextType | undefined>(undefined);

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [isPageLoading, setIsPageLoading] = useState(false);

  return (
    <PageLoadingContext.Provider value={{ isPageLoading, setIsPageLoading }}>
      {children}
    </PageLoadingContext.Provider>
  );
}

export function usePageLoading() {
  const context = useContext(PageLoadingContext);
  if (context === undefined) {
    throw new Error('usePageLoading must be used within a PageLoadingProvider');
  }
  return context;
}
