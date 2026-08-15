'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy `/chat/[id]` → `/cell/chat/[id]`. */
export default function LegacyChatDetailsRedirect(
  props: { params: Promise<{ chatId: string }> },
) {
  const params = use(props.params);
  const router = useRouter();

  useEffect(() => {
    router.replace(`/cell/chat/${params.chatId}`);
  }, [params.chatId, router]);

  return null;
}
