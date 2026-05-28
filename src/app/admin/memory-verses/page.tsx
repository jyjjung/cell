
"use client";

import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';
import { PageHeader } from '@/components/ui/page-layout';
import { Lock } from 'lucide-react';

export default function AdminMemoryVersesPage() {

  return (
    <div className="admin-page">
      <header>
        <PageHeader
          title="Memorization"
        />
      </header>

      <section>
        <MemoryVerseAdmin />
      </section>
    </div>
  );
}
