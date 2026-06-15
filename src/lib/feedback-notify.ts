import { auth } from '@/lib/firebase';

type FeedbackNotifyAction = 'submitted' | 'status_updated' | 'admin_note_updated';

export async function notifyFeedbackChange(payload: {
  action: FeedbackNotifyAction;
  suggestionId: string;
  previewText?: string;
  status?: string;
}) {
  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
    await fetch('/api/feedback/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[notifyFeedbackChange]', error);
  }
}
