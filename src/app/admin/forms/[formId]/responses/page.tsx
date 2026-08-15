'use client';;
import { use } from "react";

import AdminFormResponses from '@/components/forms/AdminFormResponses';

export default function AdminFormResponsesRoute(props: { params: Promise<{ formId: string }> }) {
  const params = use(props.params);
  return <AdminFormResponses formId={params.formId} />;
}
