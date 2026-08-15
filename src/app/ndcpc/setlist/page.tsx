import { redirect } from 'next/navigation';

export default function NdcpcSetlistRedirectPage() {
  redirect('/ndcpc/worship?tab=setlist');
}
