import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LAST_APP_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { getAppHref, parseCommunityAppId } from '@/lib/app-access';
import HomeClient from './home-client';

/**
 * Server-read session cookie so guests paint the landing page immediately
 * instead of waiting on Firebase auth restore (FCP/LCP).
 * Signed-in users with a last-app cookie skip the client redirect spinner.
 */
export default async function HomePage() {
  const jar = await cookies();
  const initialHasSession = Boolean(jar.get(SESSION_COOKIE_NAME)?.value);

  if (initialHasSession) {
    const lastApp = parseCommunityAppId(jar.get(LAST_APP_COOKIE_NAME)?.value);
    if (lastApp) {
      redirect(getAppHref(lastApp));
    }
  }

  return <HomeClient initialHasSession={initialHasSession} />;
}
