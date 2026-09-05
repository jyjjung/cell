import { cookies } from 'next/headers';
import { LAST_APP_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/auth-session';
import { parseCommunityAppId } from '@/lib/app-access';
import HomeClient from './home-client';

/**
 * Server-read session + last-app cookies for fast first paint / resume.
 *
 * Do not server-redirect here. PWA start_url is `/`; a server redirect cannot
 * complete offline and blanks the launch. HomeClient hard-navigates from the
 * cookie immediately (no Firebase wait, no RSC soft-nav stall).
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
