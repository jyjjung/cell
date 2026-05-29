import { db } from '@/lib/firebase';
import { HIDDEN_ACHIEVEMENTS, type AchievementDefinition } from '@/lib/achievements';
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';

export type SecretAchievementKey =
  | 'midnight'
  | 'early-bird'
  | 'apps'
  | 'memorize'
  | 'halo'
  | 'changelog'
  | 'members'
  | 'events'
  | 'chat'
  | 'media'
  | 'full-plan'
  | 'leaderboard'
  | 'sunday'
  | 'command-menu'
  | 'qt'
  | 'cleaning'
  | 'bible-checklist'
  | 'avatar-studio';

export async function grantSecretAchievement(
  userId: string,
  secretKey: SecretAchievementKey,
): Promise<AchievementDefinition | null> {
  const achievement = HIDDEN_ACHIEVEMENTS.find(
    (item) => item.metric === 'secret' && item.secretKey === secretKey,
  );
  if (!achievement) return null;

  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;

  const existing = (snap.data()?.unlockedSecrets as string[] | undefined) || [];
  if (existing.includes(secretKey)) return null;

  await updateDoc(userRef, { unlockedSecrets: arrayUnion(secretKey) });
  return achievement;
}
