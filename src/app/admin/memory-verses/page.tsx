
"use client";

import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';
import { PageHeader } from '@/components/ui/page-layout';
import { Lock } from 'lucide-react';
import AdminHubTabs from '@/components/admin/admin-hub-tabs';

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
      <AdminHubTabs />
    </div>
  );
}
