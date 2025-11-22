
"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();

  useEffect(() => {
    // Hide the loader whenever the path changes
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);

  // Read the initial state from cookies to prevent flash of wrong state
  const getInitialSidebarState = () => {
    if (typeof window === 'undefined') return true;
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1];
    return cookieValue ? cookieValue === 'true' : true;
  };

  return (
    <SidebarProvider defaultOpen={getInitialSidebarState()}>
      <Sidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
