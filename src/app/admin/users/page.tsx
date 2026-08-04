
"use client";

import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useRoles } from '@/hooks/use-roles';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { UserProfileData } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    AlertCircle, AlertTriangle, BadgeCheck, CheckSquare, Clock, Edit, Loader2, Search,
    ShieldAlert, ShieldCheck, Trash2, UserPlus, Users
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AdminInviteDialog } from '@/components/admin/admin-invite-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-layout';
import { hasCapability } from '@/lib/role-capabilities';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';

function createEditUserSchema(messages: { firstName: string; lastName: string }) {
  return z.object({
    firstName: z.string().min(1, messages.firstName),
    lastName: z.string().min(1, messages.lastName),
    roleIds: z.array(z.string()).optional(),
    isApproved: z.boolean().optional(),
  });
}
type EditUserFormValues = z.infer<ReturnType<typeof createEditUserSchema>>;

function userIsAdmin(user: Pick<UserProfileData, 'capabilityKeys'>): boolean {
  return hasCapability(user.capabilityKeys, 'app.admin');
}

export default function AdminUsersPage() {
  const { allUsers, loading: usersLoading } = useAllUsers();
  const { roles, loading: rolesLoading } = useRoles();
  const { adminUpdateUserProfile, currentUser } = useAuth();
  const { toast } = useToast();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const [editingUser, setEditingUser] = useState<UserProfileData | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'noPush' | 'inactive'>('all');

  // Bulk Selection
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const editUserSchema = useMemo(
    () =>
      createEditUserSchema({
        firstName: t.adminValidationFirstNameRequired,
        lastName: t.adminValidationLastNameRequired,
      }),
    [t.adminValidationFirstNameRequired, t.adminValidationLastNameRequired],
  );

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  const filteredUsers = useMemo(() => {
    let list = allUsers;
    if (statusFilter === 'pending') {
      list = list.filter((user) => !user.isApproved && !userIsAdmin(user));
    } else if (statusFilter === 'noPush') {
      list = list.filter((user) => !user.fcmTokens || user.fcmTokens.length === 0);
    } else if (statusFilter === 'inactive') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      list = list.filter((user) => {
        const seenMs =
          user.lastSeenAt && typeof (user.lastSeenAt as { toMillis?: () => number }).toMillis === 'function'
            ? (user.lastSeenAt as { toMillis: () => number }).toMillis()
            : user.lastSeenAt && typeof (user.lastSeenAt as { toDate?: () => Date }).toDate === 'function'
              ? (user.lastSeenAt as { toDate: () => Date }).toDate().getTime()
              : 0;
        if (seenMs > 0) return seenMs < cutoff;
        const createdMs =
          user.createdAt && typeof (user.createdAt as { toMillis?: () => number }).toMillis === 'function'
            ? (user.createdAt as { toMillis: () => number }).toMillis()
            : 0;
        // No lastSeen yet: treat as inactive only if the account is older than 30 days.
        return createdMs > 0 && createdMs < cutoff;
      });
    }
    if (!searchTerm) return list;
    const searchLower = searchTerm.toLowerCase();
    return list.filter(user => {
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      const email = user.email?.toLowerCase() || '';
      return fullName.includes(searchLower) || email.includes(searchLower);
    });
  }, [allUsers, searchTerm, statusFilter]);

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
      toast({ title: t.adminUserUpdated, description: `${data.firstName} ${data.lastName}` });
      setIsEditUserOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: t.adminSyncFailed, description: error.message });
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
        toast({ title: t.adminUserApproved, description: `${user.firstName}` });
    } catch (error: any) {
        toast({ variant: "destructive", title: t.adminApprovalFailed, description: error.message });
    } finally {
        setIsApproving(null);
    }
  };

  const pendingUsers = useMemo(
    () => filteredUsers.filter((user) => !user.isApproved && !userIsAdmin(user)),
    [filteredUsers],
  );
  
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
      toast({ title: t.adminUsersApproved, description: `${selectedUserIds.size}` });
      setSelectedUserIds(new Set());
    } catch (error: any) {
        toast({ variant: "destructive", title: t.adminBulkApprovalFailed, description: error.message });
    } finally {
        setIsBulkApproving(false);
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

        toast({ title: t.adminUserDeleted, description: `${user.email}` });

    } catch (error: any) {
      toast({ variant: "destructive", title: t.adminPurgeFailed, description: error.message });
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
      {!(user.isApproved || userIsAdmin(user)) && (
        <Button 
            variant="default" 
            size="sm" 
            className="h-8 rounded-lg font-bold text-xs shadow-sm"
            onClick={() => handleApprove(user)}
            disabled={isApproving === user.uid}
        >
            {isApproving === user.uid ? <Loader2 className="h-3 w-3 animate-spin" /> : t.adminApprove}
        </Button>
      )}
      <Button variant="outline" size={size} className={cn("h-8 rounded-lg hover:bg-primary hover:text-white transition-all", size === "icon" ? "w-8 p-0" : "px-3 text-xs")} onClick={() => openEditDialog(user)}>
          {size === "icon" ? <Edit className="h-4 w-4" /> : t.adminEdit}
      </Button>
      <AlertDialog>
          <AlertDialogTrigger asChild>
          <Button variant="destructive" size={size} className={cn("h-8 rounded-lg opacity-50 hover:opacity-100 transition-opacity", size === "icon" ? "w-8 p-0" : "px-3 text-xs")} disabled={isDeleting}>
              {size === "icon" ? <Trash2 className="h-4 w-4" /> : t.adminDelete}
          </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
              <AlertDialogTitle className="text-section-title">{t.adminDeleteUser}</AlertDialogTitle>
              <AlertDialogDescription>
              {t.adminDeleteUserDesc} <strong>{user.email}</strong>
              </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
              <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteUser(user)} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? t.adminDeleting : t.adminYesDelete}
              </AlertDialogAction>
          </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  const UserMobileCard = ({ user }: { user: UserProfileData }) => {
    const isDuplicate = duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`);
    const isApproved = user.isApproved || userIsAdmin(user);

    return (
      <div className={cn(
        "widget-surface space-y-3",
        isDuplicate && "border-primary/20"
      )}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-muted border border-white/10 shrink-0">
              <PixelAvatar avatar={user.avatar} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold tracking-tight text-sm leading-none truncate">{user.firstName} {user.lastName}</p>
                {isDuplicate && (
                  <AlertCircle className="h-3.5 w-3.5 text-primary animate-pulse shrink-0" />
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate mt-1">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isApproved ? (
              <Badge variant="outline" className="h-5 px-1.5 rounded border-border/50 bg-muted text-primary font-bold text-[10px]">
                <ShieldCheck className="h-3 w-3 mr-1" /> Auth
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 px-1.5 rounded border-border bg-muted text-primary font-bold text-[10px] animate-pulse">
                <Clock className="h-3 w-3 mr-1" /> Pending
              </Badge>
            )}
            {userIsAdmin(user) ? (
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
    <div className="admin-page page-container-wide">
      <header className="space-y-3">
        <PageHeader 
          title={t.adminUsers}
        />
        <div className="flex flex-col md:flex-row items-center gap-2 w-full">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.adminSearchUsers}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 rounded-lg text-sm"
            />
          </div>

          <div className="flex w-full md:w-auto gap-1.5 shrink-0">
            {([
              ['all', t.adminFilterAll],
              ['pending', t.adminFilterPending],
              ['noPush', t.adminFilterNoPush],
              ['inactive', t.adminFilterInactive],
            ] as const).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={statusFilter === id ? 'default' : 'outline'}
                className="h-9 rounded-lg"
                onClick={() => setStatusFilter(id)}
              >
                {label}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full md:w-auto shrink-0 h-9 rounded-lg"
            onClick={() => setIsInviteOpen(true)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {t.adminCreateInvite}
          </Button>

          {selectedUserIds.size > 0 && (
              <Button onClick={handleBulkApprove} disabled={isBulkApproving} size="sm" className="whitespace-nowrap shrink-0">
                  {isBulkApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                  {t.adminApproveSelected.replace('{count}', String(selectedUserIds.size))}
              </Button>
          )}
        </div>
      </header>

      {duplicateNameSet.size > 0 && (
        <Alert className="rounded-2xl border-border bg-muted app-card-sm">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <div className="ml-2">
            <AlertTitle className="text-section-title">{t.adminDuplicateUsers}</AlertTitle>
            <AlertDescription className="text-sm mt-1">
              {Array.from(duplicateNameSet).join(', ')}
            </AlertDescription>
          </div>
        </Alert>
      )}
      
      <section>
        {loading ? (
            <div className="empty-inline gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-micro-label">{t.loading}</p>
            </div>
        ) : filteredUsers.length === 0 ? (
            <div className="empty-inline border border-dashed border-border/50 rounded-2xl">
                <Users className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-micro-label">{t.adminNoUsersFound}</p>
            </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="admin-table-wrap hidden md:block">
              <Table className="admin-table">
                <TableHeader className="bg-muted">
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
                    <TableHead className="min-w-[200px]">{t.adminUser}</TableHead>
                    <TableHead className="min-w-[120px]">{t.adminAuthorization}</TableHead>
                    <TableHead className="min-w-[150px]">{t.adminRoles}</TableHead>
                    <TableHead className="min-w-[100px]">{t.adminTier}</TableHead>
                    <TableHead className="text-right min-w-[120px]">{t.adminActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isPending = !user.isApproved && !userIsAdmin(user);
                    return (
                    <TableRow key={user.uid} className={cn(
                      "border-white/5 transition-colors group hover:bg-white/5",
                      duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`) && "bg-muted/[0.03]"
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
                          <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted border border-white/10 shrink-0">
                                  <PixelAvatar avatar={user.avatar} />
                              </div>
                              <div className="min-w-0 flex items-center gap-2">
                                <p className="truncate text-xs font-semibold">
                                  {user.firstName} {user.lastName}
                                  <span className="ml-2 text-muted-foreground">{user.email}</span>
                                </p>
                                {duplicateNameSet.has(`${user.firstName?.toLowerCase() || ''} ${user.lastName?.toLowerCase() || ''}`) && (
                                  <Badge variant="outline" className="h-4 px-1.5 border-border bg-muted text-primary font-bold text-[9px] animate-pulse">
                                    Duplicate
                                  </Badge>
                                )}
                              </div>
                          </div>
                      </TableCell>
                      <TableCell className="py-2">
                          {(user.isApproved || userIsAdmin(user)) ? (
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-border/50 bg-muted text-primary text-[10px]">
                                <ShieldCheck className="h-3 w-3 mr-1" /> {t.adminApproved}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 px-2 rounded-lg border-border bg-muted text-primary text-[10px] animate-pulse">
                                <Clock className="h-3 w-3 mr-1" /> {t.adminPending}
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
                                <span className="text-xs font-medium text-muted-foreground">{t.adminStandard}</span>
                              )}
                          </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {userIsAdmin(user) ? (
                            <div className="flex items-center gap-1.5 text-primary">
                                <ShieldAlert className="h-3 w-3" />
                                <span className="text-xs font-semibold">{t.admin}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                <BadgeCheck className="h-3 w-3" />
                                <span className="text-xs font-medium">{t.adminMember}</span>
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
            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <UserMobileCard key={user.uid} user={user} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-section-title">{t.adminEditUser}</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-micro-label">{t.firstName}</FormLabel>
                      <FormControl><Input {...field} className="h-10 rounded-lg" disabled={isSaving} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-micro-label">{t.lastName}</FormLabel>
                      <FormControl><Input {...field} className="h-10 rounded-lg" disabled={isSaving} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField control={form.control} name="roleIds" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-micro-label">{t.adminRoles}</FormLabel>
                    <FormControl>
                      <MultiSelect options={roleOptions} selected={field.value || []} onChange={field.onChange} placeholder="Select roles…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2 flex gap-2">
                <Button type="button" variant="outline" className="flex-grow" onClick={() => setIsEditUserOpen(false)}>{t.adminCancel}</Button>
                <Button type="submit" disabled={isSaving} className="flex-grow">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t.adminSaveChanges}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AdminInviteDialog open={isInviteOpen} onOpenChange={setIsInviteOpen} />

    </div>
  );
}
