
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import Header from '@/components/layout/header';
import GlobalPageLoader from '@/components/layout/global-page-loader';
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from '@/components/theme-provider';
import PageLoaderManager from '@/components/layout/page-loader-manager';
import MovingBackground from '@/components/layout/moving-background';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased moving-bg-gradient`}>
        <PageLoadingProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <Suspense fallback={null}>
                <PageLoaderManager />
              </Suspense>
              <div className="relative z-10 flex min-h-screen flex-col">
                <Header />
                <main className="flex-grow">
                  {children}
                </main>
              </div>
              <Toaster />
              <GlobalPageLoader />
              <Analytics />
              {/* MovingBackground component is removed, effect is now on body */}
            </ThemeProvider>
          </AuthProvider>
        </PageLoadingProvider>
      </body>
    </html>
  );
}
