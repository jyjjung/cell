
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
  Fingerprint
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { useRoles } from '@/hooks/use-roles';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
      toast({ title: "Identity Re-Synced", description: `${data.firstName} ${data.lastName} updated.` });
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
        toast({ title: "Identity Authorized", description: `${user.firstName} can now access community sectors.` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Approval Failed", description: error.message });
    } finally {
        setIsApproving(null);
    }
  }

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

        toast({ title: "Account Terminated", description: `Record for ${user.email} purged.` });

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
    <div className="flex items-center gap-2">
      {!(user.isApproved || user.isAdmin) && (
        <Button 
            variant="default" 
            size="sm" 
            className="h-10 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl shadow-primary/10"
            onClick={() => handleApprove(user)}
            disabled={isApproving === user.uid}
        >
            {isApproving === user.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve"}
        </Button>
      )}
      <Button variant="outline" size={size} className={cn("h-10 rounded-xl hover:bg-primary hover:text-white transition-all", size === "sm" && "px-4")} onClick={() => openEditDialog(user)}>
          {size === "icon" ? <Edit className="h-4 w-4" /> : "Edit Profile"}
      </Button>
      <AlertDialog>
          <AlertDialogTrigger asChild>
          <Button variant="destructive" size={size} className={cn("h-10 rounded-xl opacity-20 group-hover:opacity-100 transition-opacity", size === "sm" && "px-4")} disabled={isDeleting}>
              {size === "icon" ? <Trash2 className="h-4 w-4" /> : "Purge Record"}
          </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black tracking-tighter">Terminate Identity?</AlertDialogTitle>
              <AlertDialogDescription className="font-medium">
              Purging <strong>{user.email}</strong> is irreversible.
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel className="rounded-2xl h-12 font-bold">Abort</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteUser(user)} disabled={isDeleting} className="rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Purging...' : 'Execute Termination'}
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
        "p-6 rounded-[2rem] bg-card/20 backdrop-blur-md border border-white/5 space-y-6",
        isDuplicate && "bg-orange-500/[0.03] border-orange-500/20"
      )}>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted/20 border border-white/10 shrink-0">
            <PixelAvatar avatar={user.avatar} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-black tracking-tight text-xl leading-none">{user.firstName} {user.lastName}</p>
              {isDuplicate && (
                <AlertCircle className="h-4 w-4 text-orange-500 animate-pulse" />
              )}
            </div>
            <p className="text-xs font-medium text-muted-foreground truncate mt-1">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-white/5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Authorization Status</span>
              {isApproved ? (
                <Badge variant="outline" className="w-fit h-6 px-3 rounded-lg border-green-500/30 bg-green-500/5 text-green-500 font-black text-[9px] uppercase tracking-widest">
                  <ShieldCheck className="h-3 w-3 mr-1.5" /> Authorized
                </Badge>
              ) : (
                <Badge variant="outline" className="w-fit h-6 px-3 rounded-lg border-orange-500/30 bg-orange-500/5 text-orange-500 font-black text-[9px] uppercase tracking-widest animate-pulse">
                  <Clock className="h-3 w-3 mr-1.5" /> Pending Approval
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Assigned Roles</span>
              <div className="flex flex-wrap gap-1.5">
                {user.roleIds && user.roleIds.length > 0 ? (
                  user.roleIds.map(roleId => (
                    <Badge key={roleId} variant="outline" className="h-6 px-3 rounded-lg border-primary/20 bg-primary/5 text-primary font-black text-[9px] uppercase tracking-widest">
                      {rolesMap.get(roleId) || 'Unknown'}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Standard Member</span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Account Tier</span>
              {user.isAdmin ? (
                <div className="flex items-center gap-1.5 text-primary">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Administrator</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground/60">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Community Member</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex justify-end">
          <UserActions user={user} size="sm" />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-24 px-4">
      <header className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
                <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none uppercase">Identity Hub.</h1>
                <div className="flex items-center gap-2 text-primary">
                    <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Administrative Directory</p>
                </div>
            </div>
            <Link href="/admin">
                <Button variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[10px] bg-card/20 backdrop-blur-md border-white/5 group">
                    <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to ADMIN
                </Button>
            </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search identities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-14 rounded-2xl bg-card/20 backdrop-blur-xl border-white/5 focus:border-primary/30 transition-all text-lg font-bold tracking-tight"
          />
        </div>
      </header>

      {duplicateNameSet.size > 0 && (
        <Alert className="rounded-[2rem] border-orange-500/20 bg-orange-500/5 p-6 shadow-xl">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <div className="ml-2">
            <AlertTitle className="text-lg font-black tracking-tight uppercase">Duplicate Identities Detected</AlertTitle>
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
                <p className="text-[10px] font-black uppercase tracking-widest">Scanning Network</p>
            </div>
        ) : filteredUsers.length === 0 ? (
            <div className="py-24 text-center border-2 border-dashed border-border/50 rounded-[3rem] opacity-30">
                <Users className="h-12 w-12 mx-auto mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Identities Detected</p>
            </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border border-white/5 rounded-[2.5rem] overflow-x-auto bg-card/20 backdrop-blur-md">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-white/5">
                    <TableHead className="font-black uppercase tracking-widest text-[10px] min-w-[200px]">Identification</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] min-w-[120px]">Authorization</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] min-w-[150px]">Roles</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px] min-w-[100px]">Tier</TableHead>
                    <TableHead className="text-right font-black uppercase tracking-widest text-[10px] min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.uid} className={cn(
                      "border-white/5 transition-colors group hover:bg-white/5",
                      duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`) && "bg-orange-500/[0.03]"
                    )}>
                      <TableCell className="py-6">
                          <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted/20 border border-white/10 shrink-0">
                                  <PixelAvatar avatar={user.avatar} />
                              </div>
                              <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-black tracking-tight text-base">{user.firstName} {user.lastName}</p>
                                    {duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`) && (
                                      <Badge variant="outline" className="h-4 px-1.5 border-orange-500/30 bg-orange-500/10 text-orange-500 font-black text-[7px] uppercase tracking-widest animate-pulse">
                                        Duplicate
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-medium text-muted-foreground truncate mt-1">{user.email}</p>
                              </div>
                          </div>
                      </TableCell>
                      <TableCell className="py-6">
                          {(user.isApproved || user.isAdmin) ? (
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-green-500/30 bg-green-500/5 text-green-500 font-black text-[8px] uppercase tracking-widest">
                                <ShieldCheck className="h-2 w-2 mr-1" /> Authorized
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-orange-500/30 bg-orange-500/5 text-orange-500 font-black text-[8px] uppercase tracking-widest animate-pulse">
                                <Clock className="h-2 w-2 mr-1" /> Pending
                            </Badge>
                          )}
                      </TableCell>
                      <TableCell className="py-6">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {user.roleIds && user.roleIds.length > 0 ? (
                                user.roleIds.map(roleId => (
                                  <Badge key={roleId} variant="outline" className="h-5 px-2 rounded-lg border-primary/20 bg-primary/5 text-primary font-black text-[8px] uppercase tracking-widest">
                                    {rolesMap.get(roleId) || 'Unknown'}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Standard</span>
                              )}
                          </div>
                      </TableCell>
                      <TableCell className="py-6">
                        {user.isAdmin ? (
                            <div className="flex items-center gap-1.5 text-primary">
                                <ShieldAlert className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground/60">
                                <BadgeCheck className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Member</span>
                            </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-6">
                        <UserActions user={user} />
                      </TableCell>
                    </TableRow>
                  ))}
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
            <DialogTitle className="text-2xl font-black tracking-tighter">Modify Credentials</DialogTitle>
            <DialogDescription className="font-medium">
              Updating parameters for {editingUser?.email}.
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
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Authorization Roles</FormLabel>
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
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commit Sync"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
