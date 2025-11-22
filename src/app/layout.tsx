
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import GlobalPageLoader from '@/components/layout/global-page-loader';
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from '@/components/theme-provider';
import AppLayout from '@/components/layout/app-layout';

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
        <PageLoadingProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AppLayout>
                {children}
              </AppLayout>
              <Toaster />
              <GlobalPageLoader />
              <Analytics />
            </ThemeProvider>
          </AuthProvider>
        </PageLoadingProvider>
      </body>
    </html>
  );
}
