import { redirect } from 'next/navigation';

export default function NdcpcSchedulesRedirectPage() {
  redirect('/ndcpc/worship?tab=roster');
}
