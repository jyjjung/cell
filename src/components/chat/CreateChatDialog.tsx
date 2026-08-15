
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { usePageLoading } from '@/contexts/page-loading-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import { useChats } from '@/hooks/useChats';
import { useChatCreationPermissions } from '@/hooks/use-chat-creation-permissions';
import {
  canUserCreateGroupChat,
  canUserCreatePrivateChat,
} from '@/lib/chat-creation-permissions';
import { getPrivateChatId } from '@/lib/chat-utils';
import UserSelector from './UserSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { hasCapability } from '@/lib/role-capabilities';

const privateSchema = z.object({
  selectedUser: z.string().min(1, "Please select a user to chat with."),
});
const groupSchema = z.object({
  groupName: z.string().min(3, "Group name must be at least 3 characters.").max(50),
  selectedUsers: z.array(z.string()).min(1, "You must select at least one member."),
});

export default function CreateChatDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const { currentUser, isAdmin } = useAuth();
  const { chats, createPrivateChat, createGroupChat } = useChats();
  const { permissions, loading: loadingPermissions } = useChatCreationPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();

  const isYouth = currentUser?.isYouth;
  const permissionUser = useMemo(
    () => (currentUser ? { roleIds: currentUser.roleIds, isAdmin } : null),
    [currentUser, isAdmin],
  );
  const canCreatePrivate = canUserCreatePrivateChat(permissionUser, permissions);
  const canCreateGroup = !isYouth && canUserCreateGroupChat(permissionUser, permissions);
  const showGroupTab = canCreateGroup;

  const privateForm = useForm({ resolver: zodResolver(privateSchema), defaultValues: { selectedUser: "" } });
  const groupForm = useForm({ resolver: zodResolver(groupSchema), defaultValues: { groupName: "", selectedUsers: [] } });

  const otherUsers = useMemo(
    () => allUsers.filter((u) => u.uid !== currentUser?.uid && u.firstName),
    [allUsers, currentUser?.uid],
  );

  // Restriction: Youth cannot private chat with other Youth
  const usersForPrivateChat = useMemo(() => {
    if (isYouth) {
      return otherUsers.filter(
        (user) => !hasCapability(user.capabilityKeys, 'member.youth'),
      );
    }
    return otherUsers;
  }, [isYouth, otherUsers]);

  const goToChat = (chatId: string) => {
    setIsPageLoading(true);
    onOpenChange(false);
    router.push(`/cell/chat/${chatId}`);
  };
  
  const handleCreatePrivate = async (values: z.infer<typeof privateSchema>) => {
    const peerUser = otherUsers.find((u) => u.uid === values.selectedUser);
    if (!peerUser || !currentUser?.uid) return;

    const chatId = getPrivateChatId(currentUser.uid, peerUser.uid);
    if (chats.some((chat) => chat.id === chatId)) {
      goToChat(chatId);
      return;
    }

    if (!canCreatePrivate) {
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'You do not have permission to start new private chats. Ask an admin if you need access.',
      });
      return;
    }

    setIsLoading(true);
    try {
      await createPrivateChat(peerUser);
      goToChat(chatId);
    } catch (error: any) {
        const code = error?.code as string | undefined;
        const description =
          code === 'permission-denied'
            ? 'You do not have permission to start this chat. Youth accounts cannot message other youth, and chat creation may be limited by role.'
            : error.message || 'Could not establish private circle.';
        toast({
            variant: "destructive",
            title: "Connection Failed",
            description,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateGroup = async (values: z.infer<typeof groupSchema>) => {
    if (!canCreateGroup) {
      toast({
        variant: 'destructive',
        title: 'Establishment Failed',
        description: 'You do not have permission to create group chats. Ask an admin if you need access.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const members = otherUsers.filter((u) => values.selectedUsers.includes(u.uid));
      const chatId = await createGroupChat(values.groupName, members);
      goToChat(chatId);
    } catch (error: any) {
        console.error("[CreateChatDialog] Error:", error);
        const code = error?.code as string | undefined;
        const description =
          code === 'permission-denied'
            ? 'You do not have permission to create this group. Youth accounts cannot create group chats, and creation may be limited by role.'
            : error.message || 'An unexpected error occurred during circle establishment.';
        toast({
            variant: "destructive",
            title: "Establishment Failed",
            description,
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Chat</DialogTitle>
          <DialogDescription>
            {canCreatePrivate
              ? 'Start a new private or group conversation.'
              : 'Open an existing private chat, or ask an admin if you need permission to start new ones.'}
          </DialogDescription>
        </DialogHeader>

        {loadingPermissions ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="private">
            <TabsList className={cn("grid w-full", showGroupTab ? 'grid-cols-2' : 'grid-cols-1')}>
              <TabsTrigger value="private">Private</TabsTrigger>
              {showGroupTab && <TabsTrigger value="group">Group</TabsTrigger>}
            </TabsList>
            <TabsContent value="private" className="pt-4">
              <Form {...privateForm}>
                <form onSubmit={privateForm.handleSubmit(handleCreatePrivate)} className="space-y-4">
                  <FormField
                    control={privateForm.control}
                    name="selectedUser"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <UserSelector
                          users={usersForPrivateChat}
                          loading={loadingUsers}
                          selectedUsers={field.value ? [field.value] : []}
                          onSelectionChange={(uids) => field.onChange(uids[0] || "")}
                          selectionMode="single"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!canCreatePrivate && (
                    <p className="text-xs text-muted-foreground">
                      You can open an existing chat. Starting a new private chat requires a role that has permission.
                    </p>
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start Chat
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </TabsContent>
            {showGroupTab && (
              <TabsContent value="group" className="pt-4">
                  <Form {...groupForm}>
                  <form onSubmit={groupForm.handleSubmit(handleCreateGroup)} className="space-y-4">
                      <FormField
                      control={groupForm.control}
                      name="groupName"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <FormControl>
                              <Input placeholder="e.g., Study Group" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <FormField
                      control={groupForm.control}
                      name="selectedUsers"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Members</FormLabel>
                          <UserSelector
                              users={otherUsers}
                              loading={loadingUsers}
                              selectedUsers={field.value}
                              onSelectionChange={field.onChange}
                              selectionMode="multiple"
                          />
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <DialogFooter>
                      <Button type="submit" disabled={isLoading}>
                          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Group
                      </Button>
                      </DialogFooter>
                  </form>
                  </Form>
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
