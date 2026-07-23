import { getClientAuthHeaders } from '@/lib/client-auth-headers';

export type ChatPushPayload = {
  chatId: string;
  messageId: string;
  text: string;
  senderId: string;
};

const MAX_ATTEMPTS = 6;
const BASE_RETRY_DELAY_MS = 500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 408 || status === 429 || status >= 500;
}

/**
 * Ask the server to deliver chat push notifications for a message.
 * Retries transient failures, including zero-delivery FCM responses (503).
 */
export async function dispatchChatPush(payload: ChatPushPayload): Promise<void> {
  const delivered = await tryDispatchChatPush(payload, MAX_ATTEMPTS);
  if (delivered) return;

  // Network / FCM / Firestore lag can outlast the initial burst.
  for (const delayMs of [10_000, 30_000]) {
    setTimeout(() => {
      void tryDispatchChatPush(payload, 3);
    }, delayMs);
  }
}

async function tryDispatchChatPush(payload: ChatPushPayload, maxAttempts: number): Promise<boolean> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headers = await getClientAuthHeaders();
      const response = await fetch('/api/send-chat-push', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (response.ok) return true;

      const body = await response.json().catch(() => ({}));
      const detail = typeof body.error === 'string' ? body.error : response.statusText;
      lastError = new Error(`Chat push API failed (${response.status}): ${detail}`);

      if (!isRetryableStatus(response.status)) break;
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) {
      await wait(BASE_RETRY_DELAY_MS * attempt);
    }
  }

  console.error('[dispatchChatPush] Attempt batch failed:', lastError);
  return false;
}
