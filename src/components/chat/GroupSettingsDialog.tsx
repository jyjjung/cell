
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Save, Trash2, UserPlus, Users } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/auth-context';
import type { Chat, UserProfileData } from '@/types';
import { useAllUsers } from '@/hooks/use-all-users';
import UserSelector from './UserSelector';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PixelAvatar } from '../avatar/PixelAvatar';

const renameSchema = z.object({
  groupName: z.string().min(3, "Group name must be at least 3 characters.").max(50),
});

export default function GroupSettingsDialog({ isOpen, onOpenChange, chat }: { isOpen: boolean; onOpenChange: (open: boolean) => void; chat: Chat }) {
  const { currentUser, isAdmin } = useAuth();
  const { renameGroup, leaveGroup, deleteChat, addMembers, removeMember } = useChat(chat.id);
  const { allUsers, loading: loadingUsers } = useAllUsers();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [usersToAdd, setUsersToAdd] = useState<string[]>([]);

  const isGroupAdmin = chat.type === 'group' && chat.admins?.includes(currentUser!.uid);

  const form = useForm({
    resolver: zodResolver(renameSchema),
    defaultValues: { groupName: chat.name || "" },
  });
  
  const currentMembers = useMemo(() => {
    return allUsers.filter(u => chat.members.includes(u.uid));
  }, [allUsers, chat.members]);
  
  const potentialNewMembers = useMemo(() => {
    return allUsers.filter(u => u.firstName && !chat.members.includes(u.uid));
  }, [allUsers, chat.members]);

  const handleRename = async (values: z.infer<typeof renameSchema>) => {
    setIsSaving(true);
    await renameGroup(values.groupName);
    setIsSaving(false);
  };
  
  const handleLeave = async () => {
    await leaveGroup();
    onOpenChange(false);
  };
  
  const handleDelete = async () => {
    await deleteChat();
    onOpenChange(false);
  };
  
  const handleAddMembers = async () => {
    if (usersToAdd.length === 0) return;
    setIsAdding(true);
    const membersData = allUsers.filter(u => usersToAdd.includes(u.uid));
    await addMembers(membersData);
    setUsersToAdd([]);
    setIsAdding(false);
  };
  
  const handleRemoveMember = async (uid: string) => {
    await removeMember(uid);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>

        {chat.type === 'group' ? (
          <div className="space-y-6">
            {isGroupAdmin && (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleRename)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="groupName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Group Name</FormLabel>
                          <div className="flex gap-2">
                             <FormControl>
                               <Input {...field} disabled={isSaving} />
                             </FormControl>
                             <Button type="submit" disabled={isSaving}>
                               {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                             </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
                <Separator />
              </>
            )}
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Members ({currentMembers.length})</h4>
              <ScrollArea className="h-[150px] pr-4 border rounded-md p-2">
                 {currentMembers.map(member => (
                   <div key={member.uid} className="flex items-center justify-between p-1 rounded-md hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted">
                           <PixelAvatar avatar={member.avatar} />
                        </div>
                        <span>{member.firstName} {member.lastName}</span>
                      </div>
                      {isGroupAdmin && member.uid !== currentUser!.uid && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {member.firstName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   This will remove {member.firstName} from the group. They will need to be added back to rejoin.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveMember(member.uid)}>Remove Member</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      )}
                   </div>
                 ))}
              </ScrollArea>
            </div>
            
            {isGroupAdmin && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Add Members</h4>
                   <UserSelector
                      users={potentialNewMembers}
                      loading={loadingUsers}
                      selectedUsers={usersToAdd}
                      onSelectionChange={setUsersToAdd}
                      placeholder="Select users to add..."
                    />
                    <Button onClick={handleAddMembers} disabled={isAdding || usersToAdd.length === 0} className="w-full">
                       {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                       Add Members
                    </Button>
                </div>
              </>
            )}

            <Separator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <LogOut className="mr-2 h-4 w-4" /> Leave Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will be removed from this group and will no longer receive messages.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" outline>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Group Permanently
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this group chat for ALL members. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete Group</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          <div className="space-y-4">
             <p className="text-sm text-muted-foreground">Deleting a private chat is permanent and cannot be undone. This will remove it for you, but the other person will still see the history until they also delete it.</p>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this chat history for you.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
