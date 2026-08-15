'use client';

import { LoaderCircle } from 'lucide-react';
import { useTranslation } from '@/context/LocaleProvider';

export function LoadingState() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center py-16">
      <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-label={t('common.loading')} />
    </div>
  );
}
