/**
 * Routes that show QT / cleaning / worship / other roster data and need
 * realtime Firestore listeners instead of the 30-minute local cache.
 */
export function needsLiveSchedule(pathname: string): boolean {
  return (
    // `/` is a redirect shell for signed-in users — skip 4 live roster listeners there.
    pathname === '/cell' ||
    pathname.startsWith('/worship') ||
    pathname.startsWith('/qt') ||
    pathname.startsWith('/cleaning-roster') ||
    pathname.startsWith('/rosters') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/admin')
  );
}
