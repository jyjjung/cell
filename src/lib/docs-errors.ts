function isFirestorePermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: string }).code || '') : '';
  return code === 'permission-denied' || code === 'permissions-denied';
}

export function getDocActionErrorMessage(
  error: unknown,
  t: { error: string; docsPermissionDenied: string; documentNotFound?: string },
): string {
  if (isFirestorePermissionError(error)) return t.docsPermissionDenied;
  if (error instanceof Error && error.message) {
    const normalized = error.message.toLowerCase();
    if (normalized === 'not found' || normalized.includes('document not found')) {
      return t.documentNotFound || error.message;
    }
    return error.message;
  }
  return t.error;
}
