'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isCellAppPath } from '@/lib/app-access';
import { GlobalBibleReaderProvider } from '@/contexts/global-bible-reader-context';

const GlobalBibleReader = dynamic(
  () => import('@/components/bible/global-bible-reader').then((m) => m.GlobalBibleReader),
  { ssr: false },
);

/** Bible reader overlay — Cell app only (needs BiblePlanProvider from AppDataProviders). */
export function CellBibleReaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBibleReader = isCellAppPath(pathname);

  if (!showBibleReader) {
    return <>{children}</>;
  }

  return (
    <GlobalBibleReaderProvider>
      {children}
      <GlobalBibleReader />
    </GlobalBibleReaderProvider>
  );
}
