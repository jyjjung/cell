import type { CommunityAppId } from '@/lib/app-access';

export type AppLogoMeta = {
  src: string;
  alt: string;
};

const APP_LOGOS: Record<CommunityAppId, AppLogoMeta> = {
  cell: {
    src: '/apps/cell.png',
    alt: 'em.',
  },
  ndcpc: {
    src: '/apps/ndcpc.png',
    alt: 'NDC Preschool',
  },
  accounts: {
    src: '/apps/accounts.svg',
    alt: 'Account',
  },
  users: {
    src: '/apps/users.svg',
    alt: 'Users',
  },
  updates: {
    src: '/apps/updates.svg',
    alt: 'Updates',
  },
};

export function getAppLogo(app: CommunityAppId): AppLogoMeta {
  return APP_LOGOS[app];
}
