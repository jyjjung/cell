
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
import UserSelector from './UserSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const privateSchema = z.object({
  selectedUser: z.string().min(1, "Please select a user to chat with."),
});
const groupSchema = z.object({
  groupName: z.string().min(3, "Group name must be at least 3 characters.").max(50),
  selectedUsers: z.array(z.string()).min(1, "You must select at least one member."),
});

export default function CreateChatDialog({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const { currentUser } = useAuth();
  const { createPrivateChat, createGroupChat } = useChats();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setIsPageLoading } = usePageLoading();
  const { toast } = useToast();

  const isYouth = currentUser?.isYouth;

  const privateForm = useForm({ resolver: zodResolver(privateSchema), defaultValues: { selectedUser: "" } });
  const groupForm = useForm({ resolver: zodResolver(groupSchema), defaultValues: { groupName: "", selectedUsers: [] } });

  const otherUsers = allUsers.filter(u => u.uid !== currentUser?.uid && u.firstName);
  
  // Restriction: Youth cannot private chat with other Youth
  const usersForPrivateChat = useMemo(() => {
    if (isYouth) {
        return otherUsers.filter(u => !u.isYouth);
    }
    return otherUsers;
  }, [isYouth, otherUsers]);

  const goToChat = (chatId: string) => {
    // setIsPageLoading(true);
    router.push(`/chat/${chatId}`);
    onOpenChange(false);
  };
  
  const handleCreatePrivate = async (values: z.infer<typeof privateSchema>) => {
    setIsLoading(true);
    try {
        const peerUser = otherUsers.find(u => u.uid === values.selectedUser);
        if(peerUser) {
          const chatId = await createPrivateChat(peerUser);
          goToChat(chatId);
        }
    } catch (error: any) {
        const code = error?.code as string | undefined;
        const description =
          code === 'permission-denied'
            ? 'You do not have permission to start this chat. Youth accounts cannot message other youth or create group chats.'
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
    setIsLoading(true);
    try {
        const members = otherUsers.filter(u => values.selectedUsers.includes(u.uid));
        const chatId = await createGroupChat(values.groupName, members);
        goToChat(chatId);
    } catch (error: any) {
        console.error("[CreateChatDialog] Error:", error);
        const code = error?.code as string | undefined;
        const description =
          code === 'permission-denied'
            ? 'You do not have permission to create this group. Youth accounts cannot create group chats.'
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
          <DialogDescription>Start a new private or group conversation.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="private">
          <TabsList className={cn("grid w-full", isYouth ? 'grid-cols-1' : 'grid-cols-2')}>
            <TabsTrigger value="private">Private</TabsTrigger>
            {!isYouth && <TabsTrigger value="group">Group</TabsTrigger>}
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
                <DialogFooter>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start Chat
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
          {!isYouth && (
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
      </DialogContent>
    </Dialog>
  );
}
