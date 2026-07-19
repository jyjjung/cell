"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useRoles } from '@/hooks/use-roles';
import { useChatCreationPermissions } from '@/hooks/use-chat-creation-permissions';
import type { AdminChatSummary, ChatCreationAccessMode, ChatCreationPermissions } from '@/types';
import { getMemberFullName } from '@/lib/chat-utils';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { Loader2, Trash2, Shield, Users, MessageCircle, RefreshCw, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { translations } from '@/lib/translations';

type TypeFilter = 'all' | 'private' | 'group';

export default function AdminChatsPage() {
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const { roles, loading: loadingRoles } = useRoles();
  const { permissions, loading: loadingPermissions, saving, savePermissions } = useChatCreationPermissions();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const [chats, setChats] = useState<AdminChatSummary[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const [draftPermissions, setDraftPermissions] = useState<ChatCreationPermissions>(permissions);
  const [permissionsDirty, setPermissionsDirty] = useState(false);

  useEffect(() => {
    if (!permissionsDirty) {
      setDraftPermissions(permissions);
    }
  }, [permissions, permissionsDirty]);

  const usersMap = useMemo(() => new Map(allUsers.map((u) => [u.uid, u])), [allUsers]);

  const roleOptions: MultiSelectItem[] = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const fetchChats = useCallback(async () => {
    setLoadingChats(true);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch('/api/admin/list-chats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        let errorMsg = `Failed to load chats (${response.status}).`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setChats(Array.isArray(data.chats) ? data.chats : []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not load chats.';
      toast({ variant: 'destructive', title: 'Load failed', description: message });
      setChats([]);
    } finally {
      setLoadingChats(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchChats();
  }, [fetchChats]);

  const loading = loadingChats || loadingUsers || loadingRoles || loadingPermissions;

  const getChatDisplayName = (chat: AdminChatSummary) => {
    if (chat.type === 'group') {
      return chat.name || t.unnamedCircle;
    }
    if (chat.type === 'private' && chat.members.length >= 2) {
      const member1 = usersMap.get(chat.members[0]);
      const member2 = usersMap.get(chat.members[1]);
      const name1 =
        member1
          ? `${member1.firstName} ${member1.lastName}`.trim()
          : getMemberFullName(chat.memberInfo[chat.members[0]]) || 'Unknown';
      const name2 =
        member2
          ? `${member2.firstName} ${member2.lastName}`.trim()
          : getMemberFullName(chat.memberInfo[chat.members[1]]) || 'Unknown';
      return `${name1} <> ${name2}`;
    }
    if (chat.type === 'private' && chat.members.length < 2) {
      const remainingMember = chat.members.length === 1 ? usersMap.get(chat.members[0]) : null;
      if (remainingMember) return `${remainingMember.firstName} ${remainingMember.lastName} <> (Left)`;
      return 'Empty private chat';
    }
    return t.privateChat;
  };

  const filteredChats = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return chats.filter((chat) => {
      if (typeFilter !== 'all' && chat.type !== typeFilter) return false;
      if (!needle) return true;
      const name = getChatDisplayName(chat).toLowerCase();
      const memberNames = chat.members
        .map((uid) => {
          const user = usersMap.get(uid);
          if (user) return `${user.firstName} ${user.lastName}`.trim().toLowerCase();
          return getMemberFullName(chat.memberInfo[uid])?.toLowerCase() || '';
        })
        .join(' ');
      return name.includes(needle) || memberNames.includes(needle) || chat.id.toLowerCase().includes(needle);
    });
    // getChatDisplayName depends on usersMap/t; listed via chats/search/typeFilter/usersMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, search, typeFilter, usersMap, t.unnamedCircle, t.privateChat]);

  const updateTypeMode = (key: 'privateChat' | 'groupChat', mode: ChatCreationAccessMode) => {
    setPermissionsDirty(true);
    setDraftPermissions((prev) => ({
      ...prev,
      [key]: { ...prev[key], mode },
    }));
  };

  const updateTypeRoles = (key: 'privateChat' | 'groupChat', allowedRoleIds: string[]) => {
    setPermissionsDirty(true);
    setDraftPermissions((prev) => ({
      ...prev,
      [key]: { ...prev[key], allowedRoleIds },
    }));
  };

  const handleSavePermissions = async () => {
    try {
      await savePermissions(draftPermissions);
      setPermissionsDirty(false);
      toast({ title: t.adminChatPermissionsSaved, description: t.adminChatPermissionsSavedDesc });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not save permissions.';
      toast({ variant: 'destructive', title: 'Save failed', description: message });
    }
  };

  const handleDelete = async (chatId: string) => {
    setIsDeleting(chatId);
    try {
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch('/api/admin/delete-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatId }),
      });

      if (!response.ok) {
        let errorMsg = `Deletion failed with status: ${response.status}.`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (jsonError) {
          console.error('Could not parse JSON from error response.', jsonError);
          errorMsg = 'Server error. The chat may be too large.';
        }
        throw new Error(errorMsg);
      }

      setChats((prev) => prev.filter((c) => c.id !== chatId));
      toast({ title: 'Chat deleted', description: 'Messages removed for all members.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Delete failed.';
      toast({ variant: 'destructive', title: 'Delete failed', description: message });
    } finally {
      setIsDeleting(null);
    }
  };

  const renderPermissionControls = (
    key: 'privateChat' | 'groupChat',
    title: string,
    description: string,
  ) => {
    const section = draftPermissions[key];
    return (
      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t.adminChatWhoCanCreate}</Label>
          <Select
            value={section.mode}
            onValueChange={(value) => updateTypeMode(key, value as ChatCreationAccessMode)}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">{t.adminChatPermissionEveryone}</SelectItem>
              <SelectItem value="roles">{t.adminChatPermissionRoles}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {section.mode === 'roles' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t.adminRoles}</Label>
            <MultiSelect
              options={roleOptions}
              selected={section.allowedRoleIds}
              onChange={(ids) => updateTypeRoles(key, ids)}
              placeholder={t.adminChatSelectRoles}
            />
            {section.allowedRoleIds.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t.adminChatNoRolesWarning}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-page">
      <header className="space-y-3">
        <PageHeader title={t.adminManageChats} />
        <p className="text-sm text-muted-foreground">{t.adminManageChatsDesc}</p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-section-title">{t.adminChatCreationPermissions}</h2>
            <p className="text-xs text-muted-foreground mt-1">{t.adminChatCreationPermissionsDesc}</p>
          </div>
          <Button
            onClick={handleSavePermissions}
            disabled={!permissionsDirty || saving || loadingPermissions}
            className="rounded-xl"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {t.adminSavePermissions}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {renderPermissionControls('privateChat', t.adminPrivateChatPermission, t.adminPrivateChatPermissionDesc)}
          {renderPermissionControls('groupChat', t.adminGroupChatPermission, t.adminGroupChatPermissionDesc)}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-section-title">{t.adminAllChats}</h2>
          <Button variant="outline" size="sm" onClick={() => void fetchChats()} disabled={loadingChats} className="rounded-xl">
            {loadingChats ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {t.adminRefreshChats}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.adminSearchChats}
            className="h-10 rounded-xl"
          />
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-10 rounded-xl sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.adminChatFilterAll}</SelectItem>
              <SelectItem value="private">{t.adminChatFilterPrivate}</SelectItem>
              <SelectItem value="group">{t.adminChatFilterGroup}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && chats.length === 0 ? (
          <div className="empty-inline">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredChats.length === 0 ? (
          <EmptyState icon={MessageCircle} title={t.adminNoChats} description={t.adminNoChatsDesc} />
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.adminParticipants}</TableHead>
                  <TableHead>{t.adminType}</TableHead>
                  <TableHead>{t.adminMembers}</TableHead>
                  <TableHead>{t.adminLastActivity}</TableHead>
                  <TableHead className="text-right">{t.adminActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChats.map((chat) => (
                  <TableRow key={chat.id} className={cn(chat.members.length === 0 && 'bg-destructive/10')}>
                    <TableCell className="font-medium max-w-sm truncate">{getChatDisplayName(chat)}</TableCell>
                    <TableCell className="capitalize">
                      <Badge variant={chat.type === 'group' ? 'secondary' : 'outline'} className="gap-1">
                        {chat.type === 'group' ? <Users className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                        {chat.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{chat.members.length}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {chat.lastMessageSentAtMs
                        ? `${formatDistanceToNow(new Date(chat.lastMessageSentAtMs))} ago`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" disabled={isDeleting === chat.id}>
                            {isDeleting === chat.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-section-title">{t.adminDeleteChat}</AlertDialogTitle>
                            <AlertDialogDescription>{t.adminDeleteChatDesc}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(chat.id)}>
                              {t.adminYesDelete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
