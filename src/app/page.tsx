import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth-session';
import HomeClient from './home-client';

/**
 * Server-read session cookie so guests paint the landing page immediately
 * instead of waiting on Firebase auth restore (FCP/LCP).
 *
 * Do not server-redirect to last-app here. PWA start_url is `/`; a server
 * redirect cannot complete offline and blanks the launch. Client ShellRouter
 * still resumes after the shell paints.
 */
export default async function HomePage() {
  const jar = await cookies();
  const initialHasSession = Boolean(jar.get(SESSION_COOKIE_NAME)?.value);

  return <HomeClient initialHasSession={initialHasSession} />;
}
