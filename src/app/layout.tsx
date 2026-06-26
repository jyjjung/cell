
import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import dynamic from 'next/dynamic';
import { appFontVariableClasses } from '@/lib/app-fonts';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/components/theme-provider';
import { ColorPaletteProvider } from '@/contexts/color-palette-context';
import { TypographyProvider } from '@/contexts/typography-context';
import AppLayout from '@/components/layout/app-layout';
import { AppDataProviders } from '@/components/layout/app-data-providers';
import { Toaster } from '@/components/ui/toaster';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import { GlobalBibleReaderProvider } from '@/contexts/global-bible-reader-context';
import { SetlistPlaylistProvider } from '@/contexts/setlist-playlist-context';
import { ChunkErrorListener } from '@/components/layout/chunk-error-listener';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { AppearanceFirebaseBootstrap } from '@/components/layout/appearance-firebase-bootstrap';

const GlobalPageLoader = dynamic(() => import('@/components/layout/global-page-loader'), { ssr: false });
const GlobalBibleReader = dynamic(
  () => import('@/components/bible/global-bible-reader').then((m) => m.GlobalBibleReader),
  { ssr: false }
);


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
    <html lang="en" suppressHydrationWarning data-glass="off" className={appFontVariableClasses}>
      <body className="antialiased">
        <ChunkErrorListener />
        <OfflineBanner />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="theme">
            <PageLoadingProvider>
              <AuthProvider>
                <AppDataProviders>
                <ColorPaletteProvider>
                <TypographyProvider>
                <AppearanceFirebaseBootstrap />
                <GlobalBibleReaderProvider>
                  <SetlistPlaylistProvider>
                  <AppLayout>
                    {children}
                  </AppLayout>
                  </SetlistPlaylistProvider>
                  <Analytics />
                  <SpeedInsights />
                  <Toaster />
                  <GlobalPageLoader />
                  <GlobalBibleReader />
                </GlobalBibleReaderProvider>
                </TypographyProvider>
                </ColorPaletteProvider>
                </AppDataProviders>
              </AuthProvider>
            </PageLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
