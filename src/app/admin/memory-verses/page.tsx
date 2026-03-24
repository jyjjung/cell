
"use client";

import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';

export default function AdminMemoryVersesPage() {

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Manage Memory Verses</h1>
      </header>

      <section>
        <MemoryVerseAdmin />
      </section>
    </div>
  );
}
