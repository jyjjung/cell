
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import GlobalPageLoader from '@/components/layout/global-page-loader';
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from '@/components/theme-provider';
import AppLayout from '@/components/layout/app-layout';
import { Toaster } from '@/components/ui/toaster';


export const metadata: Metadata = {
  title: "em.",
  description: "A simple app for community and faith.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  // themeColor is removed to prevent iOS from using it as the app tile background
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <PageLoadingProvider>
            <AuthProvider>
                <AppLayout>
                  {children}
                </AppLayout>
                <GlobalPageLoader />
                <Analytics />
                <Toaster />
            </AuthProvider>
          </PageLoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
