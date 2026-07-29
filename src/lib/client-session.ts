/** Mint or refresh the httpOnly session cookie used by middleware. */
export async function syncServerSession(idToken: string): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('[client-session] Failed to sync server session:', error);
  }
}

/** Clear the httpOnly session cookie. */
export async function clearServerSession(): Promise<void> {
  try {
    await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
  } catch (error) {
    console.error('[client-session] Failed to clear server session:', error);
  }
}
