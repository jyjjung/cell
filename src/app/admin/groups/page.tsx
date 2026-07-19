
"use client";

import { useState } from 'react';
import type { AppRole } from '@/types';
import { useRoles } from '@/hooks/use-roles';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Edit, Trash2, Users, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import { ROLE_CAPABILITIES, type RoleCapability } from '@/lib/role-capabilities';

const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  createChat: z.boolean().default(true).optional(),
  capabilities: z.array(z.enum(ROLE_CAPABILITIES)).default([]),
});
type RoleFormValues = z.infer<typeof roleSchema>;

export default function AdminRolesPage() {
  const { roles, loading, addRole, updateRole, deleteRole, syncRolesAndChats } = useRoles();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      createChat: true,
      capabilities: [],
    },
  });

  const openAddDialog = () => {
    setEditingRole(null);
    form.reset({ name: '', createChat: true, capabilities: [] });
    setIsFormOpen(true);
  };

  const openEditDialog = (role: AppRole) => {
    setEditingRole(role);
    form.reset({ name: role.name, capabilities: role.capabilities || [] });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: RoleFormValues) => {
    setIsSaving(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, data.name, data.capabilities);
        toast({ title: "Role updated", description: `"${data.name}" saved.` });
      } else {
        await addRole(data.name, data.createChat ?? false, data.capabilities);
        toast({ title: "Role created", description: `"${data.name}" added.` });
      }
      setIsFormOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: AppRole) => {
    try {
      await deleteRole(role.id);
      toast({ title: "Role deleted", description: `"${role.name}" removed.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncRolesAndChats();
      toast({ title: "Sync complete", description: "Members matched to role chats." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync failed", description: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="space-y-3">
        <PageHeader 
          title={t.adminManageRoles}
          action={
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSync} 
                disabled={isSyncing || loading}
              >
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t.adminSyncCircles}
              </Button>
              
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> {t.adminNewRole}
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-section-title">{editingRole ? t.adminEditRole : t.adminNewRole}</DialogTitle>
                    <DialogDescription>
                      {editingRole ? 'Change the role name.' : 'Create a role for users. Optionally link a group chat.'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-micro-label">{t.adminName}</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="capabilities"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-micro-label">Capabilities</FormLabel>
                        {([
                          ['app.admin', 'Application admin'],
                          ['member.youth', 'Youth restrictions'],
                          ['worship.manage', 'Manage worship'],
                        ] as Array<[RoleCapability, string]>).map(([value, label]) => (
                          <label key={value} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={field.value.includes(value)}
                              onCheckedChange={(checked) => field.onChange(
                                checked
                                  ? [...field.value, value]
                                  : field.value.filter((item) => item !== value),
                              )}
                              disabled={isSaving}
                            />
                            {label}
                          </label>
                        ))}
                        <FormDescription>
                          Capabilities stay attached when this role is renamed.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  {!editingRole && (
                    <FormField
                      control={form.control}
                      name="createChat"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSaving}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Create linked chat</FormLabel>
                            <FormDescription className="text-micro-label">
                              Auto-create a group chat for this role.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                      <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>{t.adminCancel}</Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingRole ? t.adminSaveChanges : t.adminNewRole}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />
      </header>

      <section>
        {loading ? (
          <div className="empty-inline">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState icon={Users} title={t.adminNoRoles} description={t.adminNoRolesHint} />
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>{t.adminName}</TableHead>
                  <TableHead>{t.adminLinkedChat}</TableHead>
                  <TableHead>{t.adminCreatedAt}</TableHead>
                  <TableHead className="text-right">{t.adminActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      {role.chatId && <Check className="h-4 w-4 text-primary" />}
                    </TableCell>
                    <TableCell>{role.createdAt ? format(role.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(role)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-section-title">{t.adminDeleteRole}</AlertDialogTitle>
                            <AlertDialogDescription>
                              Archive &quot;{role.name}&quot;? Assignments will be reconciled, while linked chat history is preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(role)}>
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
