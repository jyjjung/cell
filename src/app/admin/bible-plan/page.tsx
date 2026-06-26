
"use client";

import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import { PageHeader } from '@/components/ui/page-layout';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

export default function AdminBiblePlanPage() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  return (
    <div className="admin-page">
      <header>
        <PageHeader title={t.adminBiblePlan} />
      </header>

      <section>
        <BiblePlanAdminForm />
      </section>
    </div>
  );
}
