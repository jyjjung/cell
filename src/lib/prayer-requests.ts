/** Account that receives and can read all prayer requests. */
export const PRAYER_SHEPHERD_EMAIL = 's.claire86@hotmail.com';

export const PRAYER_REQUESTS_COLLECTION = 'prayerRequests';

export function isPrayerShepherd(email: string | null | undefined): boolean {
  return email?.toLowerCase() === PRAYER_SHEPHERD_EMAIL.toLowerCase();
}
