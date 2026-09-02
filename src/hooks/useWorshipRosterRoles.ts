"use client";

import { useCallback, useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { WORSHIP_ROLES } from '@/types';
import {
  findWorshipRoleConflict,
  normalizeWorshipRoleLabel,
  rolesFromSettingsDoc,
  WORSHIP_ROLE_LABEL_MAX_LENGTH,
  WORSHIP_ROSTER_ROLES_DOC_ID,
  WORSHIP_SETTINGS_COLLECTION,
} from '@/lib/worship-roster-roles';

function rolesDocRef() {
  return doc(db, WORSHIP_SETTINGS_COLLECTION, WORSHIP_ROSTER_ROLES_DOC_ID);
}

export function useWorshipRosterRoles(enabled = true) {
  const { currentUser } = useAuth();
  const [roles, setRoles] = useState<string[]>([...WORSHIP_ROLES]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled || !currentUser) {
      setRoles([...WORSHIP_ROLES]);
      setLoading(false);
      return;
    }

    setLoading(true);
    return onSnapshot(
      rolesDocRef(),
      (snap) => {
        setRoles(rolesFromSettingsDoc(snap.exists() ? snap.data() : null));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [enabled, currentUser]);

  const persistRoles = useCallback(async (next: string[]) => {
    if (!currentUser) throw new Error('Not authenticated');
    await setDoc(rolesDocRef(), {
      roles: next,
      updatedAt: serverTimestamp(),
    });
  }, [currentUser]);

  const addRole = useCallback(async (rawName: string): Promise<string> => {
    const label = normalizeWorshipRoleLabel(rawName).slice(0, WORSHIP_ROLE_LABEL_MAX_LENGTH);
    if (!label) throw new Error('Enter a role name.');
    const conflict = findWorshipRoleConflict(roles, label);
    if (conflict) throw new Error(`“${conflict}” is already on the list.`);
    const next = [...roles, label];
    await persistRoles(next);
    return label;
  }, [persistRoles, roles]);

  const deleteRole = useCallback(async (role: string) => {
    const next = roles.filter((item) => item !== role);
    if (next.length === roles.length) return;
    await persistRoles(next);
  }, [persistRoles, roles]);

  return {
    roles,
    loading,
    addRole,
    deleteRole,
  };
}
