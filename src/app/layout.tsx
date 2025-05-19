
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/auth-context';
import { PageLoadingProvider } from '@/contexts/page-loading-context';
import Header from '@/components/layout/header';
import MovingBackground from '@/components/layout/moving-background';
import GlobalPageLoader from '@/components/layout/global-page-loader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Cell Dates',
  description: 'Manage your dates and Bible reading plans.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <PageLoadingProvider>
            <MovingBackground />
            <GlobalPageLoader />
            <div className="relative z-10 flex min-h-screen flex-col">
              <Header />
              <main className="flex-grow container mx-auto px-6 py-8">
                {children}
              </main>
            </div>
            <Toaster />
          </PageLoadingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
