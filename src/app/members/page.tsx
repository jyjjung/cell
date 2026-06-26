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
import { translations } from '@/lib/translations';
import { format, parseISO, isValid } from 'date-fns';
import { NavPageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function MembersPage() {
  const { allUsers, loading: usersLoading, refreshUsers } = useAllUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { events, loading: eventsLoading } = useEvents();
  const { currentUser } = useAuth();
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
    return <PageLoading />;
  }

  return (
    <div className="page-container">
      <NavPageHeader />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.searchMembers}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9 h-10 rounded-lg"
        />
      </div>

      {filteredUsers.length === 0 ? (
        <EmptyState icon={Users} title={t.noMembersFound} />
      ) : (
        <div className="admin-table-wrap page-responsive-table">
          <Table className="admin-table">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead>{t.adminName}</TableHead>
                <TableHead>{t.adminRoles}</TableHead>
                <TableHead>{t.birthday}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const birthday = userBirthdays.get(user.uid);
                const userRoles = (user.roleIds || []).map(id => rolesMap.get(id)).filter(Boolean) as string[];
                return (
                  <TableRow key={user.uid} className="border-white/5 hover:bg-white/5">
                    <TableCell className="responsive-table-primary py-2 whitespace-normal">
                      <Link href={`/members/${user.uid}`} className="flex items-center gap-2.5 group">
                        <div className="h-8 w-8 rounded-full bg-muted border border-border/30 shrink-0">
                          <PixelAvatar avatar={user.uid === currentUser?.uid ? currentUser?.avatar : user.avatar} />
                        </div>
                        <span className="text-sm font-semibold break-words group-hover:text-primary transition-colors">
                          {user.firstName} {user.lastName}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal" data-label={t.adminRoles}>
                      <div className="flex flex-wrap gap-1">
                        {userRoles.length > 0 ? userRoles.map(name => (
                          <Badge key={name} variant="secondary" className="h-5 px-1.5 text-[10px] font-medium rounded-md">{name}</Badge>
                        )) : (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium rounded-md">{t.member}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 whitespace-normal" data-label={t.birthday}>
                      {birthday ? (
                        <div className="flex items-center gap-1 text-primary">
                          <Cake className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-sm">{birthday}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
