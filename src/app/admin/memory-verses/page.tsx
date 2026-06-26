
"use client";

import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';
import { PageHeader } from '@/components/ui/page-layout';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

export default function AdminMemoryVersesPage() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  return (
    <div className="admin-page">
      <header>
        <PageHeader title={t.adminMemorization} />
      </header>

      <section>
        <MemoryVerseAdmin />
      </section>
    </div>
  );
}
