"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppInvite } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';

const INVITES_COLLECTION = 'invites';

function generateInviteCode(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  }
  return Math.random().toString(36).slice(2, 12);
}

function normalizeInviteCode(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

export function useInvites() {
  const { currentUser, isAdmin, loadingAuth } = useAuth();
  const [invites, setInvites] = useState<AppInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser || !isAdmin) {
      setInvites([]);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, INVITES_COLLECTION),
      (snapshot) => {
        const rows: AppInvite[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AppInvite, 'id'>),
        }));
        rows.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          if (bTime !== aTime) return bTime - aTime;
          return a.id.localeCompare(b.id);
        });
        setInvites(rows);
        setLoading(false);
      },
      (error) => {
        console.error('[useInvites] load error:', error);
        setInvites([]);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [loadingAuth, currentUser?.uid, isAdmin]);

  const createInvite = useCallback(
    async (params: { code?: string; roles?: string[]; label?: string }) => {
      if (!isAdmin || !currentUser) throw new Error('Admin access required.');

      const code = normalizeInviteCode(params.code || generateInviteCode());
      if (!code || code.length < 4) {
        throw new Error('Invite code must be at least 4 characters.');
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/.test(code)) {
        throw new Error('Use letters, numbers, and hyphens only.');
      }

      const inviteRef = doc(db, INVITES_COLLECTION, code);
      const existing = await getDoc(inviteRef);
      if (existing.exists()) {
        throw new Error('That invite code is already in use.');
      }

      await setDoc(inviteRef, {
        roles: params.roles ?? [],
        label: params.label?.trim() || null,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });

      return code;
    },
    [isAdmin, currentUser],
  );

  const deleteInvite = useCallback(
    async (inviteId: string) => {
      if (!isAdmin) throw new Error('Admin access required.');
      await deleteDoc(doc(db, INVITES_COLLECTION, inviteId));
    },
    [isAdmin],
  );

  return { invites, loading, createInvite, deleteInvite };
}
