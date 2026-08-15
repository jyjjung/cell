'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { resolveActiveApp } from '@/lib/app-access';
import { resolveAppUserAvatar, type AvatarAppId } from '@/lib/user-avatars';

export function useActiveAppAvatar(appOverride?: AvatarAppId) {
  const { currentUser } = useAuth();
  const pathname = usePathname();
  const activeApp = resolveActiveApp(pathname);
  const app: AvatarAppId =
    appOverride ?? (activeApp === 'ndcpc' ? 'ndcpc' : 'cell');
  const avatar = resolveAppUserAvatar(currentUser, app);
  const showHalo = app === 'cell';

  return { avatar, app, showHalo };
}
