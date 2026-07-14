"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatUserDisplayName } from '@/lib/formatting';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { Chat } from '@/types';
import { useAllUsers } from '@/hooks/use-all-users';
import UserSelector from './UserSelector';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, LogOut, Save, Trash2, UserPlus, Camera, X } from 'lucide-react';
import { PixelAvatar } from '../avatar/PixelAvatar';
import { GroupChatAvatar } from './GroupChatAvatar';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { STORAGE_CACHE_CONTROL } from '@/lib/media-cache';

const renameSchema = z.object({
  groupName: z.string().min(3, "Group name must be at least 3 characters.").max(50),
});

const MAX_GROUP_PHOTO_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i;

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  // Some mobile browsers (notably iOS) leave type empty for gallery picks.
  return IMAGE_EXTENSIONS.test(file.name);
}

function resolveImageContentType(file: File): string {
  if (file.type.startsWith('image/')) return file.type;
  const match = file.name.toLowerCase().match(IMAGE_EXTENSIONS);
  if (!match) return 'image/jpeg';
  const ext = match[1];
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return `image/${ext}`;
}

export default function GroupSettingsDialog({ isOpen, onOpenChange, chat }: { isOpen: boolean; onOpenChange: (open: boolean) => void; chat: Chat }) {
  const { currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const { renameGroup, leaveGroup, deleteChat, addMembers, removeMember, updateGroupPhoto, removeGroupPhoto } = useChat(chat.id);
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [usersToAdd, setUsersToAdd] = useState<string[]>([]);

  const isGroupAdmin = chat.type === 'group' && chat.admins?.includes(currentUser!.uid);
  const canChangeGroupPhoto =
    chat.type === 'group' &&
    !!currentUser?.uid &&
    chat.members.includes(currentUser.uid);

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

  useEffect(() => {
    if (!isPickingPhoto) return;

    const endPicking = () => {
      // Delay so a successful selection can fire onChange before we release the lock.
      window.setTimeout(() => setIsPickingPhoto(false), 400);
    };

    window.addEventListener('focus', endPicking);
    return () => window.removeEventListener('focus', endPicking);
  }, [isPickingPhoto]);

  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    const onCancel = (event: Event) => {
      event.stopPropagation();
      setIsPickingPhoto(false);
    };

    input.addEventListener('cancel', onCancel);
    return () => input.removeEventListener('cancel', onCancel);
  }, []);

  const handleDialogOpenChange = (open: boolean) => {
    // Native photo pickers steal focus and can dismiss Radix dialogs mid-pick,
    // which unmounts the input before the selection lands.
    if (!open && (isPickingPhoto || isUploadingPhoto)) return;
    onOpenChange(open);
  };

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

  const openPhotoPicker = () => {
    if (isUploadingPhoto || !canChangeGroupPhoto) return;
    setIsPickingPhoto(true);
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setIsPickingPhoto(false);

    if (!file) return;

    if (!isImageFile(file)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file',
        description: 'Please choose an image file for the group photo.',
      });
      return;
    }

    if (file.size > MAX_GROUP_PHOTO_BYTES) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Group photos must be 5MB or smaller.',
      });
      return;
    }

    setIsUploadingPhoto(true);
    let uploadedToStorage = false;
    try {
      const storagePath = `chats/${chat.id}/group_photo_${Date.now()}.jpg`;
      const storageRef = ref(storage, storagePath);
      const downloadURL = await new Promise<string>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file, {
          contentType: resolveImageContentType(file),
          cacheControl: STORAGE_CACHE_CONTROL,
        });
        uploadTask.on(
          'state_changed',
          undefined,
          reject,
          async () => resolve(await getDownloadURL(uploadTask.snapshot.ref)),
        );
      });
      uploadedToStorage = true;
      await updateGroupPhoto(downloadURL);
    } catch (error) {
      console.error('Error uploading group photo:', error);
      // updateGroupPhoto already toasts Firestore failures; cover Storage/network here.
      if (!uploadedToStorage) {
        const message = error instanceof Error ? error.message : 'Could not upload group photo.';
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: message,
        });
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      await removeGroupPhoto();
    } catch {
      // toast handled in hook
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <>
      {/* Keep the picker outside DialogContent so focus-loss dismissals cannot unmount it. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={handlePhotoChange}
      />

      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          onPointerDownOutside={(event) => {
            if (isPickingPhoto || isUploadingPhoto) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (isPickingPhoto || isUploadingPhoto) {
              event.preventDefault();
              return;
            }
            const target = event.target as HTMLElement;
            // Preserve DialogContent defaults for portaled popovers / command menus.
            if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('[cmdk-root]')) {
              event.preventDefault();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isPickingPhoto || isUploadingPhoto) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Chat Settings</DialogTitle>
          </DialogHeader>

          {chat.type === 'group' ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-20 w-20 shrink-0 rounded-full border border-border/50 bg-muted/20 overflow-hidden">
                  {isUploadingPhoto ? (
                    <div className="flex h-full w-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
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
                    disabled={isUploadingPhoto || !canChangeGroupPhoto}
                    onClick={openPhotoPicker}
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
                      disabled={isUploadingPhoto || !canChangeGroupPhoto}
                      onClick={handleRemovePhoto}
                    >
                      <X className="mr-1.5 h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Any member can change the group photo.
                </p>
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
                          <div className="h-8 w-8 rounded-full bg-muted">
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
    </>
  );
}
