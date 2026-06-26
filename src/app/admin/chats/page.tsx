
"use client";

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useChats } from '@/hooks/useChats';
import type { Chat } from '@/types';
import { getMemberFullName } from '@/lib/chat-utils';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Shield, Users, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { translations } from '@/lib/translations';

export default function AdminChatsPage() {
  const { chats, loading: loadingChats } = useChats();
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);

  const loading = loadingChats || loadingUsers;

  const getChatDisplayName = (chat: Chat) => {
    if (chat.type === 'group') {
      return chat.name || t.unnamedCircle;
    }
    if (chat.type === 'private' && chat.members.length >= 2) {
      const member1 = usersMap.get(chat.members[0]);
      const member2 = usersMap.get(chat.members[1]);
      const name1 = member1 ? `${member1.firstName} ${member1.lastName}`.trim() : getMemberFullName(chat.memberInfo[chat.members[0]]) || 'Unknown';
      const name2 = member2 ? `${member2.firstName} ${member2.lastName}`.trim() : getMemberFullName(chat.memberInfo[chat.members[1]]) || 'Unknown';
      return `${name1} <> ${name2}`;
    }
     if (chat.type === 'private' && chat.members.length < 2) {
        const remainingMember = chat.members.length === 1 ? usersMap.get(chat.members[0]) : null;
        if(remainingMember) return `${remainingMember.firstName} ${remainingMember.lastName} <> (Left)`;
        return 'Empty private chat';
    }
    return t.privateChat;
  };

  const handleDelete = async (chatId: string) => {
    setIsDeleting(chatId);
    try {
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) throw new Error("Authentication token not found.");
        
        const response = await fetch('/api/admin/delete-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ chatId }),
        });

        if (!response.ok) {
            let errorMsg = `Deletion failed with status: ${response.status}.`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (jsonError) {
                console.error("Could not parse JSON from error response.", jsonError);
                errorMsg = "Server error. The chat may be too large.";
            }
            throw new Error(errorMsg);
        }

        toast({ title: "Chat deleted", description: "Messages removed for all members." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="admin-page">
      <header className="space-y-3">
        <PageHeader title={t.adminManageChats} />
      </header>

      <section>
        {loading ? (
            <div className="empty-inline">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        ) : chats.length === 0 ? (
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
                {chats.map((chat) => (
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
                        {chat.lastMessageSentAt ? `${formatDistanceToNow(chat.lastMessageSentAt.toDate())} ago` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={isDeleting === chat.id}>
                                {isDeleting === chat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
