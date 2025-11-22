
"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import { usePageLoading } from '@/contexts/page-loading-context';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setIsPageLoading } = usePageLoading();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Read the initial state from cookies to prevent flash of wrong state
    const getInitialSidebarState = () => {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('sidebar_state='))
        ?.split('=')[1];
      return cookieValue ? cookieValue === 'true' : true;
    };
    setIsSidebarOpen(getInitialSidebarState());
    setHasMounted(true);
  }, []);


  useEffect(() => {
    // Hide the loader whenever the path changes
    setIsPageLoading(false);
  }, [pathname, setIsPageLoading]);
  
  if (!hasMounted) {
    // Render nothing or a skeleton loader until the client-side state is determined
    // to prevent hydration mismatch.
    return (
        <SidebarProvider defaultOpen={true}>
            <Sidebar />
            <SidebarInset className="min-w-0">
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

  return (
    <SidebarProvider defaultOpen={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <Sidebar />
      <SidebarInset className="min-w-0">
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
