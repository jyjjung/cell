import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { cookies } from 'next/headers';
import { appFontVariableClasses } from '@/lib/app-fonts';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';
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
import { DeferredVercelMetrics } from '@/components/layout/deferred-vercel-metrics';
import { DocumentLang } from '@/components/layout/document-lang';

const GlobalPageLoader = dynamic(() => import('@/components/layout/global-page-loader'), { ssr: false });
const GlobalBibleReader = dynamic(
  () => import('@/components/bible/global-bible-reader').then((m) => m.GlobalBibleReader),
  { ssr: false }
);

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  manifest: '/manifest.webmanifest',
  title: "em.",
  description: "A simple app for community and faith.",
  openGraph: {
    title: 'em.',
    description: 'A simple app for community and faith.',
    siteName: 'em.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'em.',
    description: 'A simple app for community and faith.',
  },
  icons: {
    icon: [
      { url: '/icon-v4.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16-v4.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32-v4.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192x192-v4.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon-v4.ico',
    apple: [
      { url: '/apple-touch-icon-v4.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192x192-v4.png', sizes: '192x192', type: 'image/png' },
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
  maximumScale: 1,
  viewportFit: 'cover',
  // Android Chrome: resize layout with keyboard. iOS WebKit ignores this.
  interactiveWidget: 'resizes-content',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const initialSessionCookie = Boolean(jar.get(SESSION_COOKIE_NAME)?.value);

  return (
    <html lang="en" suppressHydrationWarning data-glass="off" className={appFontVariableClasses}>
      <body className="antialiased">
        <ChunkErrorListener />
        <OfflineBanner />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="theme">
            <PageLoadingProvider>
              <AuthProvider initialSessionCookie={initialSessionCookie}>
                <DocumentLang />
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
                  <DeferredVercelMetrics />
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
