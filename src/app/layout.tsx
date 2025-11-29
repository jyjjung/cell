import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
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

export const metadata = {
  title: "em.",
  description: "A simple app for cell group organization.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="em." />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PageLoadingProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <AppLayout>
                {children}
              </AppLayout>
              <GlobalPageLoader />
              <Analytics />
            </ThemeProvider>
          </AuthProvider>
        </PageLoadingProvider>
      </body>
    </html>
  );
}
