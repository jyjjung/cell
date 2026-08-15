import { getClientAuthHeaders } from '@/lib/client-auth-headers';

export type NdcpcChatPushPayload = {
  messageId: string;
  authorUid: string;
  authorName: string;
  text: string;
};

const MAX_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function dispatchNdcpcChatPush(payload: NdcpcChatPushPayload): Promise<void> {
  void tryDispatchNdcpcChatPush(payload, MAX_ATTEMPTS);
}

async function tryDispatchNdcpcChatPush(
  payload: NdcpcChatPushPayload,
  maxAttempts: number,
): Promise<boolean> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headers = await getClientAuthHeaders();
      const response = await fetch('/api/ndcpc/send-chat-push', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (response.ok) return true;

      const body = await response.json().catch(() => ({}));
      const detail = typeof body.error === 'string' ? body.error : response.statusText;
      lastError = new Error(`NDCPC chat push API failed (${response.status}): ${detail}`);

      if (!isRetryableStatus(response.status)) break;
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await wait(BASE_RETRY_DELAY_MS * attempt);
    }
  }

  console.error('[dispatchNdcpcChatPush] Attempt batch failed:', lastError);
  return false;
}
