'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';

/** Keeps <html lang> in sync with the signed-in member's preferred language. */
export function DocumentLang() {
  const { currentUser } = useAuth();
  const lang = currentUser?.preferredLanguage === 'ko' ? 'ko' : 'en';

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return null;
}
