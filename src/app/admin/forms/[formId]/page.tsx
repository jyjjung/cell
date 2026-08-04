"use client";

import AdminFormDetail from '@/components/forms/AdminFormDetail';

export default function AdminFormByIdPage({ params }: { params: { formId: string } }) {
  return <AdminFormDetail formId={params.formId} />;
}
