export const GLASS_ENABLED_STORAGE_KEY = 'glassEnabled';

export function readStoredGlassEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(GLASS_ENABLED_STORAGE_KEY);
  if (stored === 'false') return false;
  if (stored === 'true') return true;
  return false;
}

export function applyGlassEffect(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.glass = enabled ? 'on' : 'off';
}
