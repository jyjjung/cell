/** Build FCM data/APNs badge fields. Omit when unknown so clients keep prior badge. */
export function chatPushBadgeFields(badgeCount: number | null): {
  dataBadge?: string;
  apnsBadge?: number;
} {
  if (badgeCount == null || !Number.isFinite(badgeCount) || badgeCount < 0) {
    return {};
  }
  return {
    dataBadge: String(Math.floor(badgeCount)),
    apnsBadge: Math.floor(badgeCount),
  };
}
