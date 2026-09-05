import { cookies } from 'next/headers';
import { LAST_APP_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { parseCommunityAppId } from '@/lib/app-access';
import HomeClient from './home-client';

/**
 * Server-read session cookie so guests paint the landing page immediately
 * instead of waiting on Firebase auth restore (FCP/LCP).
 *
 * Pass last-app from the cookie for client resume — do not server-redirect
 * (that blanks offline PWA launches whose start_url is `/`).
 */
export default async function HomePage() {
  const jar = await cookies();
  const initialHasSession = Boolean(jar.get(SESSION_COOKIE_NAME)?.value);
  const initialLastApp = parseCommunityAppId(jar.get(LAST_APP_COOKIE_NAME)?.value);

  return (
    <HomeClient
      initialHasSession={initialHasSession}
      initialLastApp={initialLastApp}
    />
  );
}
