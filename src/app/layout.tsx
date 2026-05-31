
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { appFontVariableClasses } from '@/lib/app-fonts';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from '@/components/theme-provider';
import { ColorPaletteProvider } from '@/contexts/color-palette-context';
import { TypographyProvider } from '@/contexts/typography-context';
import AppLayout from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import { GlobalBibleReaderProvider } from '@/contexts/global-bible-reader-context';
import GlobalPageLoader from '@/components/layout/global-page-loader';
import { ChunkErrorListener } from '@/components/layout/chunk-error-listener';
import { GlobalBibleReader } from '@/components/bible/global-bible-reader';
import { CommandMenu } from '@/components/layout/command-menu';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { ThemePreferenceSync } from '@/components/layout/theme-preference-sync';
import { AppearanceFirebaseBootstrap } from '@/components/layout/appearance-firebase-bootstrap';


export const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  title: "em.",
  description: "A simple app for community and faith.",
  icons: {
    icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192x192-v2.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-glass="on" className={appFontVariableClasses}>
      <body className="antialiased">
        <ChunkErrorListener />
        <OfflineBanner />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <PageLoadingProvider>
              <AuthProvider>
                <ThemePreferenceSync />
                <ColorPaletteProvider>
                <TypographyProvider>
                <AppearanceFirebaseBootstrap />
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
                </TypographyProvider>
                </ColorPaletteProvider>
              </AuthProvider>
            </PageLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
