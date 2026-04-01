
"use client";

import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import { PageHeader } from '@/components/ui/page-layout';
import { BookOpen } from 'lucide-react';

export default function AdminBiblePlanPage() {

  return (
    <div className="relative space-y-12 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <header>
        <PageHeader
          title="Bible Plan"
          description="Configure the global reading sequence and milestones."
          icon={BookOpen}
          accentColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
      </header>

      <section>
        <BiblePlanAdminForm />
      </section>
    </div>
  );
}
