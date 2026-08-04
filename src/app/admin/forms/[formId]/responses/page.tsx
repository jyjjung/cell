'use client';

import AdminFormResponses from '@/components/forms/AdminFormResponses';

export default function AdminFormResponsesRoute({ params }: { params: { formId: string } }) {
  return <AdminFormResponses formId={params.formId} />;
}
