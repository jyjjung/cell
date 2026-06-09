import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const USERS_COLLECTION = 'users';

export function incrementUserFeedbackCount(userId: string) {
  if (!userId || userId === 'anonymous') return;
  void updateDoc(doc(db, USERS_COLLECTION, userId), { feedbackCount: increment(1) }).catch(() => {});
}
