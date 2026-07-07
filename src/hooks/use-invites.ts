"use client";

import { useState, useEffect, useCallback } from 'react';
import { addDays } from 'date-fns';
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
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import {
  DEFAULT_INVITE_EXPIRES_DAYS,
  DEFAULT_INVITE_MAX_USES,
  generateInviteCode,
  normalizeInviteCode,
  normalizeInviteEmail,
} from '@/lib/invite-utils';

const INVITES_COLLECTION = 'invites';

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
    async (params: {
      code?: string;
      roles?: string[];
      label?: string;
      allowedEmail?: string;
      maxUses?: number;
      expiresInDays?: number;
    }) => {
      if (!isAdmin || !currentUser) throw new Error('Admin access required.');

      const code = normalizeInviteCode(params.code || generateInviteCode());
      if (!code || code.length < 4) {
        throw new Error('Invite code must be at least 4 characters.');
      }
      if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]{1,2}$/.test(code)) {
        throw new Error('Use letters, numbers, and hyphens only.');
      }

      const allowedEmail = params.allowedEmail?.trim()
        ? normalizeInviteEmail(params.allowedEmail)
        : null;
      if (allowedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(allowedEmail)) {
        throw new Error('Enter a valid email address for the invite lock.');
      }

      const maxUses = params.maxUses ?? DEFAULT_INVITE_MAX_USES;
      if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10) {
        throw new Error('Uses must be between 1 and 10.');
      }

      const expiresInDays = params.expiresInDays ?? DEFAULT_INVITE_EXPIRES_DAYS;
      if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 90) {
        throw new Error('Expiry must be between 1 and 90 days.');
      }

      const inviteRef = doc(db, INVITES_COLLECTION, code);
      const existing = await getDoc(inviteRef);
      if (existing.exists()) {
        throw new Error('That invite code is already in use.');
      }

      await setDoc(inviteRef, {
        roles: params.roles ?? [],
        label: params.label?.trim() || null,
        allowedEmail,
        maxUses,
        useCount: 0,
        usedBy: [],
        expiresAt: Timestamp.fromDate(addDays(new Date(), expiresInDays)),
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
