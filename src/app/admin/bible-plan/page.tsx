
"use client";

import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';

export default function AdminBiblePlanPage() {

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Manage Bible Plan</h1>
      </header>

      <section>
        <BiblePlanAdminForm />
      </section>
    </div>
  );
}
