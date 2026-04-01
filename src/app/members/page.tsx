"use client";

import { useState, useMemo, useEffect } from 'react';
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

export default function MembersPage() {
  const { allUsers, loading: usersLoading } = useAllUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { events, loading: eventsLoading } = useEvents();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const t = translations[currentUser?.preferredLanguage || 'en'];

  useEffect(() => { setIsMounted(true); }, []);

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

  if (!isMounted || usersLoading || rolesLoading || eventsLoading) return null;

  return (
    <div className="relative space-y-8 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <PageHeader
        title={t.members}
        description={t.memberCount.replace('{count}', filteredUsers.length.toString())}
        icon={Users}
        accentColor="text-primary"
        iconBgColor="bg-primary/10"
      />

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
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
                <motion.div
                  layout
                  key={user.uid}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.28, delay: Math.min(i * 0.03, 0.3), ease: [0.22, 1, 0.36, 1] }}
                  className="group flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card hover:shadow-md hover:border-border/70 transition-all"
                >
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted border border-border/30 shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                    <PixelAvatar avatar={user.avatar} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{user.firstName} {user.lastName}</p>
                    {birthday && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-pink-500/70">
                        <Cake className="h-3 w-3 shrink-0" />
                        <span className="text-[11px] font-medium">{birthday}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {userRoles.length > 0 ? userRoles.map(name => (
                        <Badge key={name} variant="secondary" className="h-5 px-2 text-[10px] font-semibold rounded-lg">{name}</Badge>
                      )) : (
                        <Badge variant="outline" className="h-5 px-2 text-[10px] font-medium rounded-lg opacity-40">Member</Badge>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
