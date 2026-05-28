
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
import { PageHeader } from '@/components/ui/page-layout';
import { ShieldCheck } from 'lucide-react';
import AdminHubTabs from '@/components/admin/admin-hub-tabs';

const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  createChat: z.boolean().default(true).optional(),
});
type RoleFormValues = z.infer<typeof roleSchema>;

export default function AdminRolesPage() {
  const { roles, loading, addRole, updateRole, deleteRole, syncRolesAndChats } = useRoles();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      createChat: true,
    },
  });

  const openAddDialog = () => {
    setEditingRole(null);
    form.reset({ name: '', createChat: true });
    setIsFormOpen(true);
  };

  const openEditDialog = (role: AppRole) => {
    setEditingRole(role);
    form.reset({ name: role.name });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: RoleFormValues) => {
    setIsSaving(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, data.name);
        toast({ title: "Role Updated", description: `The role "${data.name}" has been updated.` });
      } else {
        await addRole(data.name, data.createChat ?? false);
        const chatMessage = data.createChat ? " and its chat have" : " has";
        toast({ title: "Role Created", description: `The role "${data.name}"${chatMessage} been created.` });
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
      const toastMessage = role.chatId ? `The role "${role.name}" and its chat have been deleted.` : `The role "${role.name}" has been deleted.`;
      toast({ title: "Role Deleted", description: toastMessage });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion Failed", description: error.message });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncRolesAndChats();
      toast({ 
        title: "Sync Successful", 
        description: "All members have been re-aligned with their role-linked circles." 
      });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Sync Error", 
        description: error.message 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="space-y-4">
        <PageHeader 
          title="Manage Roles & Chats"
          action={
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleSync} 
                disabled={isSyncing || loading}
                className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[10px]"
              >
                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Circles
              </Button>
              
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openAddDialog} className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[10px]">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                    <DialogDescription>
                      {editingRole ? 'Change the name of the role.' : 'Create a new role to assign to users. You can also choose to create a linked group chat.'}
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {!editingRole && (
                    <FormField
                      control={form.control}
                      name="createChat"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSaving}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Create a linked group chat
                            </FormLabel>
                            <FormDescription>
                              Automatically create a group chat for this role.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                      <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingRole ? 'Save Changes' : 'Create Role'}
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
          <div className="h-40 flex items-center justify-center rounded-lg bg-muted border-2 border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center bg-muted rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-40">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-semibold">No roles found</h3>
            <p className="text-muted-foreground text-sm">Click "New Role" to create one.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <Table className="admin-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Linked Chat</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell>
                      {role.chatId && <Check className="h-5 w-5 text-primary" />}
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
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the role "{role.name}"{role.chatId ? " and its associated group chat" : ""}. Users will be removed from this role. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(role)}>
                              Yes, delete role
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
      <AdminHubTabs />
    </div>
  );
}
