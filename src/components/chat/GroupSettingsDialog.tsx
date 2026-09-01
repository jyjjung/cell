
"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import { storage } from '@/lib/firebase';
import { formatUserDisplayName } from '@/lib/formatting';
import { resolveChatAvatar } from '@/lib/chat-utils';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';
import type { Chat } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { Camera, LogOut, Save, Trash2, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { PixelAvatar } from '../avatar/PixelAvatar';
import { GroupChatAvatar } from './GroupChatAvatar';
import UserSelector from './UserSelector';

const renameSchema = z.object({
  groupName: z.string().min(3, "Group name must be at least 3 characters.").max(50),
});

export default function GroupSettingsDialog({ isOpen, onOpenChange, chat }: { isOpen: boolean; onOpenChange: (open: boolean) => void; chat: Chat }) {
  const { currentUser, isAdmin } = useAuth();
  const { renameGroup, leaveGroup, deleteChat, addMembers, removeMember, updateGroupPhoto, removeGroupPhoto } = useChat(
    chat.id,
    { backHref: chat.appScope === 'ndcpc' ? '/ndcpc/chat' : '/cell/chat' },
  );
  const { toast } = useToast();
  const { allUsers, loading: loadingUsers } = useAllUsers();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [usersToAdd, setUsersToAdd] = useState<string[]>([]);

  const isGroupAdmin = chat.type === 'group' && chat.admins?.includes(currentUser!.uid);
  const membershipLocked =
    chat.appScope === 'ndcpc' && (chat.ndcpcKind === 'role' || chat.ndcpcKind === 'team');
  const canManageMembers = isGroupAdmin && !membershipLocked;

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
    await addMembers(membersData, chat.appScope === 'ndcpc' ? 'ndcpc' : 'cell');
    setUsersToAdd([]);
    setIsAdding(false);
  };
  
  const handleRemoveMember = async (uid: string) => {
    await removeMember(uid);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploadingPhoto(true);
    try {
      const storagePath = `chats/${chat.id}/group_photo_${Date.now()}.jpg`;
      const storageRef = ref(storage, storagePath);
      const downloadURL = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: STORAGE_CACHE_CONTROL,
        });
        uploadTask.on(
          'state_changed',
          undefined,
          reject,
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)),
        );
      });
      await updateGroupPhoto(downloadURL);
      } catch (error) {
        const code = (error as { code?: string })?.code;
        if (code === 'storage/unauthorized') {
          toast({
            variant: 'destructive',
            title: 'Not authorized',
            description: 'You must be a member of this group to change its photo.',
          });
        }
        // Firestore/API errors toast handled in hook
      } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      await removeGroupPhoto();
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chat Settings</DialogTitle>
        </DialogHeader>

        {chat.type === 'group' ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-20 w-20 shrink-0 rounded-full border border-border/50 bg-muted/20 overflow-hidden">
                {isUploadingPhoto ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <LoadingSpinner size="md" className="text-primary/50" />
                  </div>
                ) : (
                  <GroupChatAvatar photoURL={chat.photoURL} className="!rounded-full" />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={isUploadingPhoto}
                  onClick={() => document.getElementById(`group-photo-${chat.id}`)?.click()}
                >
                  <Camera className="mr-1.5 h-4 w-4" />
                  Change photo
                </Button>
                {chat.photoURL && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-muted-foreground"
                    disabled={isUploadingPhoto}
                    onClick={handleRemovePhoto}
                  >
                    <X className="mr-1.5 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
              <input
                id={`group-photo-${chat.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <Separator />

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
                               {isSaving ? <ButtonSpinner /> : <Save className="h-4 w-4" />}
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
              {membershipLocked ? (
                <p className="text-xs text-muted-foreground">
                  {chat.ndcpcKind === 'team'
                    ? 'Membership follows preschool manage access.'
                    : 'Membership follows the linked preschool role.'}
                </p>
              ) : null}
              <ScrollArea className="h-[150px] pr-4 border rounded-md p-2">
                 {currentMembers.map(member => (
                   <div key={member.uid} className="flex items-center justify-between p-1 rounded-md hover:bg-muted">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted">
                           <PixelAvatar
                             avatar={resolveChatAvatar(member, chat.memberInfo[member.uid], chat.appScope)}
                             showHalo={chat.appScope !== 'ndcpc'}
                           />
                        </div>
                        <span>{member.firstName} {member.lastName}</span>
                      </div>
                      {canManageMembers && member.uid !== currentUser!.uid && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                 <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {formatUserDisplayName(member)}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                   This will remove {formatUserDisplayName(member)} from the group. They will need to be added back to rejoin.
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

            {canManageMembers && (
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
                       {isAdding ? <ButtonSpinner className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
                       Add Members
                    </Button>
                </div>
              </>
            )}

            <Separator />

            {!membershipLocked ? (
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
            ) : null}

            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10">
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
