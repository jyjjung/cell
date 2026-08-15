"use client";;
import { use } from "react";

import AdminFormDetail from '@/components/forms/AdminFormDetail';

export default function AdminFormByIdPage(props: { params: Promise<{ formId: string }> }) {
  const params = use(props.params);
  return <AdminFormDetail formId={params.formId} />;
}
