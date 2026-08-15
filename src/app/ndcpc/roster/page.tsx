import { redirect } from 'next/navigation';

export default function NdcpcRosterRedirectPage() {
  redirect('/ndcpc/worship?tab=roster');
}
