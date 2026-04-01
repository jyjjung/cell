
"use client";

import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';
import { PageHeader } from '@/components/ui/page-layout';
import { Lock } from 'lucide-react';

export default function AdminMemoryVersesPage() {

  return (
    <div className="relative space-y-12 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <header>
        <PageHeader
          title="Memorization"
          description="Curate scripture portions for community study tracks."
          icon={Lock}
          accentColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
      </header>

      <section>
        <MemoryVerseAdmin />
      </section>
    </div>
  );
}
