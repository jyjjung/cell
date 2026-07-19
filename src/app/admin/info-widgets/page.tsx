"use client";

import InfoWidgetsAdmin from '@/components/admin/info-widgets-admin';
import { PageHeader } from '@/components/ui/page-layout';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';

export default function AdminInfoWidgetsPage() {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  return (
    <div className="admin-page">
      <header>
        <PageHeader title={t.adminInfoWidgets} />
      </header>

      <section>
        <InfoWidgetsAdmin />
      </section>
    </div>
  );
}
