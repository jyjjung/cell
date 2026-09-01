"use client";

import { useMemo, useState } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
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
import { PlusCircle, Edit, Trash2, Users, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/page-layout';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { useAuth } from '@/contexts/auth-context';
import { translations } from '@/lib/translations';
import {
  ROLE_CAPABILITY_LABELS,
  roleCapabilitiesForScope,
  type RoleAppScope,
  type RoleCapability,
} from '@/lib/role-capabilities';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

function createRoleSchema(scope: RoleAppScope, nameMinMessage: string) {
  const capabilityEnum = z.enum(roleCapabilitiesForScope(scope) as [RoleCapability, ...RoleCapability[]]);
  return z.object({
    name: z.string().min(2, nameMinMessage),
    createChat: z.boolean().default(true).optional(),
    capabilities: z.array(capabilityEnum).default([]),
  });
}
type RoleFormValues = z.infer<ReturnType<typeof createRoleSchema>>;

function RolesTable({
  roles,
  onEdit,
  onDelete,
  t,
}: {
  roles: AppRole[];
  onEdit: (role: AppRole) => void;
  onDelete: (role: AppRole) => void;
  t: (typeof translations)['en'];
}) {
  if (roles.length === 0) {
    return <EmptyState icon={Users} title={t.adminNoRoles} description={t.adminNoRolesHint} />;
  }

  return (
    <div className="admin-table-wrap">
      <Table className="admin-table">
        <TableHeader>
          <TableRow>
            <TableHead>{t.adminName}</TableHead>
            <TableHead>Capabilities</TableHead>
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
                <div className="flex flex-wrap gap-1">
                  {(role.capabilities ?? []).map((capability) => (
                    <Badge key={capability} variant="outline" className="text-[10px]">
                      {ROLE_CAPABILITY_LABELS[capability]}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {role.chatId && <Check className="h-4 w-4 text-primary" />}
              </TableCell>
              <TableCell>{role.createdAt ? format(role.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => onEdit(role)}>
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
                      <AlertDialogAction onClick={() => onDelete(role)}>
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
  );
}

export function RolesManagementPanel() {
  const { roles, loading, addRole, updateRole, deleteRole, syncRolesAndChats } = useRoles();
  const [scopeTab, setScopeTab] = useState<RoleAppScope>('cell');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const cellRoles = useMemo(
    () => roles.filter((role) => (role.appScope ?? 'cell') === 'cell'),
    [roles],
  );
  const ndcpcRoles = useMemo(
    () => roles.filter((role) => role.appScope === 'ndcpc'),
    [roles],
  );

  const roleSchema = useMemo(
    () => createRoleSchema(editingRole?.appScope ?? scopeTab, t.adminValidationRoleNameMin),
    [editingRole?.appScope, scopeTab, t.adminValidationRoleNameMin],
  );

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
    form.reset({
      name: role.name,
      capabilities: role.capabilities || [],
      createChat: Boolean(role.chatId),
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: RoleFormValues) => {
    setIsSaving(true);
    try {
      const activeScope = editingRole?.appScope ?? scopeTab;
      if (editingRole) {
        await updateRole(editingRole.id, data.name, data.capabilities);
        toast({ title: t.adminRoleUpdated, description: t.adminRoleSavedDesc.replace('{name}', data.name) });
      } else {
        await addRole(data.name, data.createChat ?? false, data.capabilities, activeScope);
        toast({ title: t.adminRoleCreated, description: t.adminRoleAddedDesc.replace('{name}', data.name) });
      }
      setIsFormOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Role save failed';
      toast({ variant: "destructive", title: t.error, description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (role: AppRole) => {
    try {
      await deleteRole(role.id);
      toast({ title: t.adminRoleDeleted, description: t.adminRoleRemovedDesc.replace('{name}', role.name) });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Role delete failed';
      toast({ variant: "destructive", title: t.adminPurgeFailed, description: message });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncRolesAndChats();
      toast({ title: t.adminSyncComplete, description: t.adminSyncCompleteDesc });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      toast({ variant: "destructive", title: t.adminSyncFailed, description: message });
    } finally {
      setIsSyncing(false);
    }
  };

  const activeScope = editingRole?.appScope ?? scopeTab;
  const capabilityOptions = roleCapabilitiesForScope(activeScope);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-section-title">{t.adminManageRoles}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            EM and preschool roles with scoped capabilities. em. roles can link group chats.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing || loading}
          >
            {isSyncing ? <ButtonSpinner className="mr-2" /> : <RefreshCw className="mr-2 h-4 w-4" />}
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
                  {activeScope === 'cell'
                    ? 'Create or edit an EM role. Capabilities apply across em.'
                    : 'Create or edit a preschool role. Capabilities apply across NDCPC only.'}
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
                        {capabilityOptions.map((value) => (
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
                            {ROLE_CAPABILITY_LABELS[value]}
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
                      {isSaving && <ButtonSpinner className="mr-2" />}
                      {editingRole ? t.adminSaveChanges : t.adminNewRole}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={scopeTab} onValueChange={(value) => setScopeTab(value as RoleAppScope)}>
        <TabsList>
          <TabsTrigger value="cell">EM roles</TabsTrigger>
          <TabsTrigger value="ndcpc">Preschool roles</TabsTrigger>
        </TabsList>
        <TabsContent value="cell" className="pt-4">
          {loading ? (
            <ListLoadingSkeleton />
          ) : (
            <RolesTable roles={cellRoles} onEdit={openEditDialog} onDelete={handleDelete} t={t} />
          )}
        </TabsContent>
        <TabsContent value="ndcpc" className="pt-4">
          {loading ? (
            <ListLoadingSkeleton />
          ) : (
            <RolesTable roles={ndcpcRoles} onEdit={openEditDialog} onDelete={handleDelete} t={t} />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
