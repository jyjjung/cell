"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAllUsers } from '@/hooks/use-all-users';
import { useRoles } from '@/hooks/use-roles';
import { useEvents } from '@/hooks/use-events';
import { useAuth } from '@/contexts/auth-context';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Cake } from 'lucide-react';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '@/lib/translations';
import { format, parseISO, isValid } from 'date-fns';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { useGrantSecretAchievement } from '@/hooks/use-grant-secret-achievement';

export default function MembersPage() {
  const { allUsers, loading: usersLoading, refreshUsers } = useAllUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { events, loading: eventsLoading } = useEvents();
  const { currentUser } = useAuth();
  useGrantSecretAchievement('members', !!currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (currentUser) void refreshUsers();
  }, [currentUser?.uid, refreshUsers]);

  const rolesMap = useMemo(() => new Map(roles.map(r => [r.id, r.name])), [roles]);

  const userBirthdays = useMemo(() => {
    const map = new Map<string, string>();
    events.forEach(e => {
      if (e.category === 'Birthday' && e.userId && e.date) {
        try {
          const d = parseISO(e.date);
          if (isValid(d)) map.set(e.userId, format(d, 'MMMM d'));
        } catch {}
      }
    });
    return map;
  }, [events]);

  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return allUsers.filter(u => {
      if (!u.firstName) return false;
      return [`${u.firstName} ${u.lastName || ''}`, u.email || '',
        (u.roleIds || []).map(id => rolesMap.get(id) || '').join(' '),
        userBirthdays.get(u.uid) || ''].some(s => s.toLowerCase().includes(q));
    }).sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [allUsers, searchTerm, rolesMap, userBirthdays]);

  const isLoading = !isMounted || usersLoading || rolesLoading || eventsLoading;

  if (isLoading) {
    return (
      <div className="page-container space-y-8 pb-32">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        {/* Search skeleton */}
        <Skeleton className="h-12 w-full rounded-2xl" />
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 bg-card/30">
              <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-3 w-1/2 rounded-lg" />
                <Skeleton className="h-5 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-8 pb-32">
      <PageHeader
        title={t.members}
      />

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-700 dark:text-zinc-300" />
        <Input
          placeholder={t.searchMembers}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-11 h-12 rounded-2xl bg-card/50 border-border/40 focus:border-primary/40 font-medium text-sm backdrop-blur-sm"
        />
      </motion.div>

      {/* Grid */}
      <AnimatePresence mode="popLayout">
        {filteredUsers.length === 0 ? (
          <EmptyState icon={Users} title={t.noMembersFound} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user, i) => {
              const birthday = userBirthdays.get(user.uid);
              const userRoles = (user.roleIds || []).map(id => rolesMap.get(id)).filter(Boolean) as string[];
              return (
                <Link href={`/members/${user.uid}`} key={user.uid} className="block group">
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm group-hover:bg-card group-hover:shadow-md group-hover:border-border/70 transition-all cursor-pointer"
                  >
                    <div className="h-14 w-14 rounded-full bg-muted border border-border/30 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                      <PixelAvatar avatar={user.uid === currentUser?.uid ? currentUser?.avatar : user.avatar} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{user.firstName} {user.lastName}</p>
                      {birthday && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-primary">
                          <Cake className="h-3 w-3 shrink-0" />
                          <span className="text-[11px] font-medium">{birthday}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {userRoles.length > 0 ? userRoles.map(name => (
                          <Badge key={name} variant="secondary" className="h-5 px-2 text-[10px] font-semibold rounded-lg">{name}</Badge>
                        )) : (
                          <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium rounded-lg text-zinc-900 dark:text-zinc-100">Member</Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
