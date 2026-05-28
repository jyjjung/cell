
"use client";

import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import { PageHeader } from '@/components/ui/page-layout';
import { BookOpen } from 'lucide-react';
import AdminHubTabs from '@/components/admin/admin-hub-tabs';

export default function AdminBiblePlanPage() {

  return (
    <div className="admin-page">
      <header>
        <PageHeader
          title="Bible Plan"
        />
      </header>

      <section>
        <BiblePlanAdminForm />
      </section>
      <AdminHubTabs />
    </div>
  );
}
