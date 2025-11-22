"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import BottomNav from './bottom-nav';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();

  useEffect(() => {
    // Hide the loader whenever the path changes
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:pl-64 pb-16 md:pb-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
