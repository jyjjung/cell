
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppRole } from '@/types';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { RoleCapability } from '@/lib/role-capabilities';

const ROLES_COLLECTION = 'roles';

export function useRoles() {
  const { currentUser, isAdmin, loadingAuth } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (loadingAuth) return;

    if (!currentUser?.uid) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, ROLES_COLLECTION), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rolesData: AppRole[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status !== 'archived') {
          rolesData.push({ ...data, id: doc.id } as AppRole);
        }
      });
      setRoles(rolesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching roles:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loadingAuth, currentUser?.uid]);

  const request = useCallback(async (
    path: string,
    method: 'POST' | 'PATCH' | 'DELETE',
    body?: unknown,
  ) => {
    if (!isAdmin) throw new Error('Admin access required.');
    const headers = await getClientAuthHeaders();
    const response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Role operation failed.');
    return data;
  }, [isAdmin]);

  const addRole = useCallback(async (
    name: string,
    createChat: boolean,
    capabilities: RoleCapability[] = [],
  ): Promise<string> => {
    const data = await request('/api/admin/roles', 'POST', { name, createChat, capabilities });
    return data.roleId;
  }, [request]);

  const updateRole = useCallback(async (
    roleId: string,
    name: string,
    capabilities?: RoleCapability[],
  ) => {
    await request(`/api/admin/roles/${roleId}`, 'PATCH', { name, capabilities });
  }, [request]);

  const deleteRole = useCallback(async (roleId: string) => {
    await request(`/api/admin/roles/${roleId}`, 'DELETE');
  }, [request]);

  const syncRolesAndChats = useCallback(async () => {
    const data = await request('/api/admin/roles/sync', 'POST');
    return Number(data.users || 0) + Number(data.roleChats || 0);
  }, [request]);

  return { roles, addRole, updateRole, deleteRole, syncRolesAndChats, loading };
}
