import { redirect } from 'next/navigation';

export default function NdcpcScheduleRedirectPage() {
  redirect('/ndcpc/worship?tab=order');
}
