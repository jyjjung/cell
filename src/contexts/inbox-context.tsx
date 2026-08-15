'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type InboxTab = 'announcements' | 'notifications' | 'prayer';

type InboxContextValue = {
  isOpen: boolean;
  tab: InboxTab;
  openInbox: (tab?: InboxTab) => void;
  closeInbox: () => void;
  setTab: (tab: InboxTab) => void;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<InboxTab>('announcements');

  const openInbox = useCallback((nextTab: InboxTab = 'announcements') => {
    setTab(nextTab);
    setIsOpen(true);
  }, []);

  const closeInbox = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ isOpen, tab, openInbox, closeInbox, setTab }),
    [isOpen, tab, openInbox, closeInbox],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const ctx = useContext(InboxContext);
  if (!ctx) {
    throw new Error('useInbox must be used within InboxProvider');
  }
  return ctx;
}

/** Safe for header/command menu when provider may be absent during guest shell. */
export function useInboxOptional() {
  return useContext(InboxContext);
}
