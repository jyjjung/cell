import { redirect } from 'next/navigation';

const TAB_MAP: Record<string, string> = {
  profile: 'profile',
  appearance: 'appearance',
  settings: 'notifications',
};

export default async function ProfileRedirectPage(
  props: {
    searchParams?: Promise<{ tab?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const raw = searchParams?.tab;
  const tab = raw && TAB_MAP[raw] ? TAB_MAP[raw] : raw && ['profile', 'appearance', 'apps', 'notifications'].includes(raw) ? raw : 'profile';
  redirect(`/accounts?tab=${tab}`);
}
