'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField, formFieldControlProps } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/page-layout';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { findWorshipRoleConflict, WORSHIP_ROLE_LABEL_MAX_LENGTH } from '@/lib/worship-roster-roles';

export function AddWorshipRoleDialog({
  open,
  onOpenChange,
  existingRoles,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRoles: readonly string[];
  onAdd: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const reset = () => {
    setName('');
    setError(undefined);
    setSaving(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    const label = name.trim();
    if (!label) {
      setError('Enter a role name.');
      return;
    }
    const conflict = findWorshipRoleConflict(existingRoles, label);
    if (conflict) {
      setError(`“${conflict}” is already on the list.`);
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onAdd(label);
      reset();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">
            Add role
          </DialogTitle>
          <DialogDescription>
            This role will be available to assign people to on worship rosters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <FormField id="worship-role-name" label="Role name" error={error} required>
            <Input
              {...formFieldControlProps('worship-role-name', error)}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(undefined);
              }}
              maxLength={WORSHIP_ROLE_LABEL_MAX_LENGTH}
              placeholder="e.g. Vox 4"
              className="rounded-xl"
              autoComplete="off"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </FormField>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 rounded-xl" onClick={() => void handleSubmit()} disabled={saving || !name.trim()}>
              {saving ? <ButtonSpinner className="mr-2" /> : null}
              Add
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WorshipRosterRolesPanel({
  roles,
  canManage,
  onBack,
  onAdd,
  onDelete,
}: {
  roles: readonly string[];
  canManage: boolean;
  onBack: () => void;
  onAdd: (name: string) => Promise<void>;
  onDelete: (role: string) => Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [deleteRole, setDeleteRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteRole) return;
    setDeleting(true);
    try {
      await onDelete(deleteRole);
      setDeleteRole(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <IconButton variant="ghost" onClick={onBack} className="rounded-xl mt-0.5" aria-label="Back" icon={ArrowLeft} />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg normal-case not-italic leading-tight truncate">Roster roles</h2>
          <p className="text-xs text-muted-foreground/60 font-medium mt-0.5">
            {roles.length} {roles.length === 1 ? 'role' : 'roles'}
          </p>
        </div>
        {canManage ? (
          <Button
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add role
          </Button>
        ) : null}
      </div>

      {roles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No roles yet"
          description="Add a role to start assigning people on worship rosters."
        />
      ) : (
        <div className="space-y-2">
          {roles.map((role) => (
            <div
              key={role}
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-4 py-3"
            >
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{role}</span>
              {canManage ? (
                <IconButton
                  variant="ghost"
                  className="rounded-lg hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${role}`}
                  onClick={() => setDeleteRole(role)}
                  icon={Trash2}
                  iconClassName="h-3.5 w-3.5"
                />
              ) : null}
            </div>
          ))}
        </div>
      )}

      <AddWorshipRoleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        existingRoles={roles}
        onAdd={onAdd}
      />

      <AlertDialog open={!!deleteRole} onOpenChange={(open) => { if (!open) setDeleteRole(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove “{deleteRole}”?</AlertDialogTitle>
            <AlertDialogDescription>
              New rosters will not include this role. People already assigned on existing rosters stay until you remove them there.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? <ButtonSpinner className="mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
