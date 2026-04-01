
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from '@/components/theme-provider';
import AppLayout from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import { GlobalBibleReaderProvider } from '@/contexts/global-bible-reader-context';
import GlobalPageLoader from '@/components/layout/global-page-loader';
import { ChunkErrorListener } from '@/components/layout/chunk-error-listener';
import { GlobalBibleReader } from '@/components/bible/global-bible-reader';
import { CommandMenu } from '@/components/layout/command-menu';
import { OfflineBanner } from '@/components/layout/offline-banner';


export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  title: "em.",
  description: "A simple app for community and faith.",
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
    shortcut: { url: "/icon.svg", type: "image/svg+xml" },
    apple: [
      { url: '/icon.svg' },
      { url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' },
      { url: '/icon.svg', sizes: '167x167', type: 'image/svg+xml' },
      { url: '/icon.svg', sizes: '152x152', type: 'image/svg+xml' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <OfflineBanner />
        <ChunkErrorListener />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <PageLoadingProvider>
              <AuthProvider>
                <GlobalBibleReaderProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                  <Analytics />
                  <SpeedInsights />
                  <Toaster />
                  <GlobalPageLoader />
                  <GlobalBibleReader />
                </GlobalBibleReaderProvider>
              </AuthProvider>
            </PageLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
