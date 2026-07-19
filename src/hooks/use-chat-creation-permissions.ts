'use client';

import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  CHAT_CREATION_CONFIG_DOC,
  CONFIG_COLLECTION,
  DEFAULT_CHAT_CREATION_PERMISSIONS,
  normalizeChatCreationPermissions,
} from '@/lib/chat-creation-permissions';
import type { ChatCreationPermissions } from '@/types';
import { useAuth } from '@/contexts/auth-context';

export function useChatCreationPermissions() {
  const { currentUser, loadingAuth } = useAuth();
  const [permissions, setPermissions] = useState<ChatCreationPermissions>(
    DEFAULT_CHAT_CREATION_PERMISSIONS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setPermissions(DEFAULT_CHAT_CREATION_PERMISSIONS);
      setLoading(false);
      return;
    }

    const ref = doc(db, CONFIG_COLLECTION, CHAT_CREATION_CONFIG_DOC);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setPermissions(
          snap.exists()
            ? normalizeChatCreationPermissions(snap.data() as Partial<ChatCreationPermissions>)
            : DEFAULT_CHAT_CREATION_PERMISSIONS,
        );
        setLoading(false);
      },
      (error) => {
        console.error('[useChatCreationPermissions]', error);
        setPermissions(DEFAULT_CHAT_CREATION_PERMISSIONS);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser?.uid, loadingAuth]);

  const savePermissions = useCallback(async (next: ChatCreationPermissions) => {
    setSaving(true);
    try {
      const normalized = normalizeChatCreationPermissions(next);
      const ref = doc(db, CONFIG_COLLECTION, CHAT_CREATION_CONFIG_DOC);
      await setDoc(ref, normalized, { merge: true });
      setPermissions(normalized);
      return normalized;
    } finally {
      setSaving(false);
    }
  }, []);

  return { permissions, loading, saving, savePermissions };
}
