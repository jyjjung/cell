'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isCellAppPath } from '@/lib/app-access';
import { GlobalBibleReaderProvider } from '@/contexts/global-bible-reader-context';

const GlobalBibleReader = dynamic(
  () => import('@/components/bible/global-bible-reader').then((m) => m.GlobalBibleReader),
  { ssr: false },
);

/**
 * Always keep the reader context mounted so switching from em. to Account
 * does not unmount the provider while overlays/hub tabs still render.
 * The FAB overlay itself stays Cell-only.
 */
export function CellBibleReaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBibleReader = isCellAppPath(pathname);

  return (
    <GlobalBibleReaderProvider>
      {children}
      {showBibleReader ? <GlobalBibleReader /> : null}
    </GlobalBibleReaderProvider>
  );
}
