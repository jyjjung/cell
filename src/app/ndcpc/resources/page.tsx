import { redirect } from 'next/navigation';

export default function NdcpcResourcesRedirectPage() {
  redirect('/ndcpc/worship?tab=resources');
}
