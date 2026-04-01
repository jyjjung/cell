
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useAllUsers } from '@/hooks/use-all-users';
import { useAuth } from '@/contexts/auth-context';
import type { UserProfileData, AppRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  Edit, 
  Trash2, 
  Users, 
  Search, 
  ShieldAlert, 
  BadgeCheck, 
  AlertTriangle, 
  ArrowLeft, 
  UserCheck, 
  AlertCircle, 
  ShieldCheck, 
  Clock,
  Shield,
  Fingerprint,
  CheckSquare,
  Square,
  Link as LinkIcon,
  Copy
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { useRoles } from '@/hooks/use-roles';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-layout';

const editUserSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  roleIds: z.array(z.string()).optional(),
  isApproved: z.boolean().optional(),
});
type EditUserFormValues = z.infer<typeof editUserSchema>;

export default function AdminUsersPage() {
  const { allUsers, loading: usersLoading } = useAllUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { adminUpdateUserProfile } = useAuth();
  const { toast } = useToast();

  const [editingUser, setEditingUser] = useState<UserProfileData | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteRoles, setInviteRoles] = useState<string[]>([]);
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Bulk Selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return allUsers;
    const searchLower = searchTerm.toLowerCase();
    return allUsers.filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [allUsers, searchTerm]);

  const rolesMap = useMemo(() => new Map(roles.map(r => [r.id, r.name])), [roles]);

  const duplicateNameSet = useMemo(() => {
    const nameCounts = new Map<string, number>();
    allUsers.forEach(user => {
      if (!user.firstName) return;
      const key = `${user.firstName.toLowerCase()} ${user.lastName.toLowerCase()}`;
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    });
    
    const dupes = new Set<string>();
    nameCounts.forEach((count, name) => {
      if (count > 1) dupes.add(name);
    });
    return dupes;
  }, [allUsers]);

  const openEditDialog = (user: UserProfileData) => {
    setEditingUser(user);
    form.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      roleIds: user.roleIds || [],
      isApproved: user.isApproved ?? false,
    });
    setIsEditUserOpen(true);
  };

  const handleEditSubmit = async (data: EditUserFormValues) => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await adminUpdateUserProfile(editingUser.uid, {
        firstName: data.firstName,
        lastName: data.lastName,
        roleIds: data.roleIds || [],
        isApproved: data.isApproved,
      });
      toast({ title: "User Updated", description: `${data.firstName} ${data.lastName} updated.` });
      setIsEditUserOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (user: UserProfileData) => {
    setIsApproving(user.uid);
    try {
        await adminUpdateUserProfile(user.uid, { 
            isApproved: true,
            roleIds: user.roleIds || [] 
        });
        toast({ title: "User Approved", description: `${user.firstName} has been approved.` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Approval Failed", description: error.message });
    } finally {
        setIsApproving(null);
    }
  };

  const pendingUsers = useMemo(() => filteredUsers.filter(u => !u.isApproved && !u.isAdmin), [filteredUsers]);
  
  const handleBulkApprove = async () => {
    if (selectedUserIds.size === 0) return;
    setIsBulkApproving(true);
    try {
      const promises = Array.from(selectedUserIds).map(uid => {
        const user = allUsers.find(u => u.uid === uid);
        if (user) {
           return adminUpdateUserProfile(uid, { isApproved: true, roleIds: user.roleIds || [] });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      toast({ title: "Users Approved", description: `${selectedUserIds.size} users have been approved.` });
      setSelectedUserIds(new Set());
    } catch (error: any) {
        toast({ variant: "destructive", title: "Bulk Approval Failed", description: error.message });
    } finally {
        setIsBulkApproving(false);
    }
  };

  const handleGenerateInvite = async () => {
      setIsGeneratingInvite(true);
      try {
          const code = Math.random().toString(36).substring(2, 10).toUpperCase();
          const inviteDoc = doc(db, 'invites', code);
          await setDoc(inviteDoc, {
              roles: inviteRoles,
              createdAt: serverTimestamp(),
          });
          const origin = window.location.origin;
          setGeneratedInviteLink(`${origin}/register?invite=${code}`);
      } catch (error: any) {
          toast({ variant: "destructive", title: "Invite Generation Failed", description: error.message });
      } finally {
          setIsGeneratingInvite(false);
      }
  };

  const handleDeleteUser = async (user: UserProfileData) => {
    setIsDeleting(true);
    try {
        const token = await auth.currentUser?.getIdToken(true);
        if (!token) throw new Error("Authentication token not found.");
        
        const response = await fetch('/api/admin/delete-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ uid: user.uid }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Termination failed.");
        }

        toast({ title: "User Deleted", description: `User ${user.email} deleted.` });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const roleOptions: MultiSelectItem[] = useMemo(() => 
    roles.map(role => ({
        value: role.id,
        label: role.name,
    })), [roles]);

  const loading = usersLoading || rolesLoading;

  const UserActions = ({ user, size = "icon" }: { user: UserProfileData, size?: "icon" | "sm" }) => (
    <div className="flex items-center justify-end gap-1.5">
      {!(user.isApproved || user.isAdmin) && (
        <Button 
            variant="default" 
            size="sm" 
            className="h-8 rounded-lg font-bold text-xs shadow-sm"
            onClick={() => handleApprove(user)}
            disabled={isApproving === user.uid}
        >
            {isApproving === user.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
        </Button>
      )}
      <Button variant="outline" size={size} className={cn("h-8 rounded-lg hover:bg-primary hover:text-white transition-all", size === "icon" ? "w-8 p-0" : "px-3 text-xs")} onClick={() => openEditDialog(user)}>
          {size === "icon" ? <Edit className="h-4 w-4" /> : "Edit"}
      </Button>
      <AlertDialog>
          <AlertDialogTrigger asChild>
          <Button variant="destructive" size={size} className={cn("h-8 rounded-lg opacity-50 hover:opacity-100 transition-opacity", size === "icon" ? "w-8 p-0" : "px-3 text-xs")} disabled={isDeleting}>
              {size === "icon" ? <Trash2 className="h-4 w-4" /> : "Delete"}
          </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black tracking-tighter">Delete User?</AlertDialogTitle>
              <AlertDialogDescription className="font-medium">
              Deleting <strong>{user.email}</strong> is irreversible.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl h-12 font-bold">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteUser(user)} disabled={isDeleting} className="rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete User'}
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const UserMobileCard = ({ user }: { user: UserProfileData }) => {
    const isDuplicate = duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`);
    const isApproved = user.isApproved || user.isAdmin;

    return (
      <div className={cn(
        "p-4 rounded-2xl bg-card/20 backdrop-blur-md border border-white/5 space-y-4",
        isDuplicate && "bg-orange-500/[0.03] border-orange-500/20"
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted/20 border border-white/10 shrink-0">
              <PixelAvatar avatar={user.avatar} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold tracking-tight text-sm leading-none truncate">{user.firstName} {user.lastName}</p>
                {isDuplicate && (
                  <AlertCircle className="h-3.5 w-3.5 text-orange-500 animate-pulse shrink-0" />
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isApproved ? (
              <Badge variant="outline" className="h-5 px-1.5 rounded border-green-500/30 bg-green-500/5 text-green-500 font-bold text-[10px]">
                <ShieldCheck className="h-3 w-3 mr-1" /> Auth
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 px-1.5 rounded border-orange-500/30 bg-orange-500/5 text-orange-500 font-bold text-[10px] animate-pulse">
                <Clock className="h-3 w-3 mr-1" /> Pending
              </Badge>
            )}
            {user.isAdmin ? (
               <div className="flex items-center gap-1 tex-xs text-primary font-semibold">
                 <ShieldAlert className="h-3 w-3" />
                 <span className="text-[10px]">Admin</span>
               </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <div className="flex flex-wrap gap-1">
            {user.roleIds && user.roleIds.length > 0 ? (
              user.roleIds.map(roleId => (
                <Badge key={roleId} variant="outline" className="h-5 px-1.5 rounded border-primary/20 bg-primary/5 text-primary text-[10px] font-medium">
                  {rolesMap.get(roleId) || 'Unknown'}
                </Badge>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground">Standard</span>
            )}
          </div>
          <UserActions user={user} size="sm" />
        </div>
      </div>
    );
  };

  return (
    <div className="relative space-y-16 pb-24 max-w-6xl mx-auto px-4 md:px-8 mt-12">
      <header className="space-y-6">
        <PageHeader 
          title="Users"
          icon={Users}
          accentColor="text-primary"
          iconBgColor="bg-primary/10"
        />

        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-lg bg-card/20 backdrop-blur-xl border-white/5 focus:border-primary/30 transition-all text-sm font-medium"
            />
          </div>
          <Button onClick={() => setIsInviteOpen(true)} className="h-10 rounded-lg px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold whitespace-nowrap shrink-0">
             <LinkIcon className="mr-2 h-4 w-4" /> Generate Invite
          </Button>
          {selectedUserIds.size > 0 && (
              <Button onClick={handleBulkApprove} disabled={isBulkApproving} className="h-10 rounded-lg px-4 bg-green-500 hover:bg-green-600 text-white font-semibold whitespace-nowrap shrink-0">
                  {isBulkApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                  Approve ({selectedUserIds.size})
              </Button>
          )}
        </div>
      </header>

      {duplicateNameSet.size > 0 && (
        <Alert className="rounded-[2rem] border-orange-500/20 bg-orange-500/5 p-6 shadow-xl">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div className="ml-2">
            <AlertTitle className="text-lg font-black tracking-tight uppercase">Duplicate Users Detected</AlertTitle>
            <AlertDescription className="text-sm font-medium opacity-70 mt-1 leading-relaxed">
              Potential duplicates: <strong className="text-foreground">{Array.from(duplicateNameSet).join(', ')}</strong>. 
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      <section>
        {loading ? (
            <div className="h-60 flex flex-col items-center justify-center gap-4 opacity-30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest">Loading Users</p>
            </div>
        ) : filteredUsers.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-[3rem] opacity-30">
                <Users className="h-12 w-12 mx-auto mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Users Found</p>
            </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-white/5 rounded-[2.5rem] overflow-x-auto bg-card/20 backdrop-blur-md">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={pendingUsers.length > 0 && selectedUserIds.size === pendingUsers.length}
                        onCheckedChange={(checked) => {
                            if (checked) {
                                setSelectedUserIds(new Set(pendingUsers.map(u => u.uid)));
                            } else {
                                setSelectedUserIds(new Set());
                            }
                        }}
                        disabled={pendingUsers.length === 0}
                      />
                    </TableHead>
                    <TableHead className="font-bold text-xs min-w-[200px]">User</TableHead>
                    <TableHead className="font-bold text-xs min-w-[120px]">Authorization</TableHead>
                    <TableHead className="font-bold text-xs min-w-[150px]">Roles</TableHead>
                    <TableHead className="font-bold text-xs min-w-[100px]">Tier</TableHead>
                    <TableHead className="text-right font-bold text-xs min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isPending = !user.isApproved && !user.isAdmin;
                    return (
                    <TableRow key={user.uid} className={cn(
                      "border-white/5 transition-colors group hover:bg-white/5",
                      duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`) && "bg-orange-500/[0.03]"
                    )}>
                      <TableCell>
                         {isPending && (
                            <Checkbox 
                                checked={selectedUserIds.has(user.uid)}
                                onCheckedChange={(checked) => {
                                    const newSet = new Set(selectedUserIds);
                                    if (checked) newSet.add(user.uid);
                                    else newSet.delete(user.uid);
                                    setSelectedUserIds(newSet);
                                }}
                            />
                         )}
                      </TableCell>
                      <TableCell className="py-2">
                          <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg overflow-hidden bg-muted/20 border border-white/10 shrink-0">
                                  <PixelAvatar avatar={user.avatar} />
                              </div>
                              <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold tracking-tight text-sm">{user.firstName} {user.lastName}</p>
                                    {duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`) && (
                                      <Badge variant="outline" className="h-4 px-1.5 border-orange-500/30 bg-orange-500/10 text-orange-500 font-bold text-[9px] animate-pulse">
                                        Duplicate
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium text-muted-foreground truncate">{user.email}</p>
                              </div>
                          </div>
                      </TableCell>
                      <TableCell className="py-2">
                          {(user.isApproved || user.isAdmin) ? (
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-green-500/30 bg-green-500/5 text-green-500 font-bold text-[10px]">
                                <ShieldCheck className="h-3 w-3 mr-1" /> Authorized
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-orange-500/30 bg-orange-500/5 text-orange-500 font-bold text-[10px] animate-pulse">
                                <Clock className="h-3 w-3 mr-1" /> Pending
                            </Badge>
                          )}
                      </TableCell>
                      <TableCell className="py-2">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {user.roleIds && user.roleIds.length > 0 ? (
                                user.roleIds.map(roleId => (
                                  <Badge key={roleId} variant="outline" className="h-5 px-1.5 rounded border-primary/20 bg-primary/5 text-primary font-medium text-[10px]">
                                    {rolesMap.get(roleId) || 'Unknown'}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs font-medium text-muted-foreground">Standard</span>
                              )}
                          </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {user.isAdmin ? (
                            <div className="flex items-center gap-1.5 text-primary">
                                <ShieldAlert className="h-3 w-3" />
                                <span className="text-xs font-semibold">Admin</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <BadgeCheck className="h-3 w-3" />
                                <span className="text-xs font-medium">Member</span>
                            </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <UserActions user={user} />
                      </TableCell>
                    </TableRow>
                  );})}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredUsers.map((user) => (
                <UserMobileCard key={user.uid} user={user} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="rounded-[2.5rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">Edit User</DialogTitle>
            <DialogDescription className="font-medium">
              Update details for {editingUser?.email}.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">First Name</FormLabel>
                      <FormControl><Input {...field} className="h-12 rounded-xl bg-muted/30" disabled={isSaving} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Last Name</FormLabel>
                      <FormControl><Input {...field} className="h-12 rounded-xl bg-muted/30" disabled={isSaving} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField control={form.control} name="roleIds" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Roles</FormLabel>
                    <FormControl>
                      <MultiSelect options={roleOptions} selected={field.value || []} onChange={field.onChange} placeholder="Select permissions..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4 flex gap-2">
                <Button type="button" variant="outline" className="rounded-2xl h-12 font-bold px-8 flex-grow" onClick={() => setIsEditUserOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="rounded-2xl h-12 font-black px-8 flex-grow">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Invite Link Generation Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="rounded-[2.5rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter">Generate Invite</DialogTitle>
            <DialogDescription className="font-medium">
              Create a registration link that pre-assigns roles and auto-approves the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-4">
             <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pre-configured Roles</label>
                 <MultiSelect 
                    options={roleOptions} 
                    selected={inviteRoles} 
                    onChange={setInviteRoles} 
                    placeholder="Select roles for new user..." 
                 />
             </div>
             
             {generatedInviteLink && (
                 <div className="p-4 rounded-xl bg-card border border-white/10 flex items-center justify-between gap-4">
                     <span className="text-sm font-mono truncate">{generatedInviteLink}</span>
                     <Button size="icon" variant="outline" onClick={() => {
                         navigator.clipboard.writeText(generatedInviteLink);
                         toast({ title: "Link Copied", description: "Invite link copied to clipboard." });
                     }}>
                         <Copy className="h-4 w-4" />
                     </Button>
                 </div>
             )}

             <DialogFooter className="pt-4 flex gap-2">
                <Button variant="outline" className="rounded-2xl h-12 font-bold px-8 flex-grow" onClick={() => setIsInviteOpen(false)}>Close</Button>
                <Button onClick={handleGenerateInvite} disabled={isGeneratingInvite} className="rounded-2xl h-12 font-black px-8 flex-grow">
                  {isGeneratingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Link"}
                </Button>
             </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
