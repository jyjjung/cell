
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          themes={['light', 'dark', 'system', 'theme-zinc', 'theme-rose']}
        >
          <PageLoadingProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <PageLoaderManager />
              </Suspense>
              <div className="relative z-10 flex min-h-screen flex-col">
                <Header />
                <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                  {children}
                </main>
              </div>
              <Toaster />
              <GlobalPageLoader />
              <Analytics />
            </AuthProvider>
          </PageLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
