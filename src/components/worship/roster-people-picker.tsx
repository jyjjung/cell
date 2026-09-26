'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trash2, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/field';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatNameString } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export type RosterPickerMember = {
  uid: string;
  displayName: string;
};

export type RosterSlotPerson = {
  id: string;
  displayName: string;
  isMember: boolean;
};

export function RosterRoleSlotRow({
  roleLabel,
  roleClassName,
  people,
  canManage,
  onAdd,
  onRemove,
  onDeleteRole,
  tableRow = false,
}: {
  roleLabel: string;
  roleClassName: string;
  people: RosterSlotPerson[];
  canManage: boolean;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  onDeleteRole?: () => void;
  tableRow?: boolean;
}) {
  const roleTextClassName = roleClassName
    .split(/\s+/)
    .filter((className) => !className.startsWith('bg-') && !className.startsWith('border-'))
    .join(' ');
  const roleTag = (
    <span className={cn('text-sm font-semibold', roleTextClassName)}>{roleLabel}</span>
  );
  const peopleContent = (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {people.length === 0 ? (
            <span className="text-sm italic text-muted-foreground/60">Unassigned</span>
          ) : (
            people.map((person, index) => (
              <span
                key={person.id}
                className={cn('inline-flex items-center gap-1.5 font-medium', person.isMember ? 'text-success' : 'text-muted-foreground')}
              >
                {canManage && onRemove ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto min-h-0 p-0 text-left font-medium"
                    onClick={() => onRemove(index)}
                    aria-label={`Remove ${person.displayName}`}
                  >
                    {formatNameString(person.displayName, 'Guest')}
                  </Button>
                ) : (
                  formatNameString(person.displayName, 'Guest')
                )}
              </span>
            ))
          )}
    </div>
  );
  const actions = (
    <>
      {canManage && onAdd ? (
          <IconButton
            type="button"
            onClick={onAdd}
            className="min-h-9 min-w-9 shrink-0 rounded-lg text-muted-foreground/50 hover:bg-muted hover:text-primary"
            aria-label="Add member"
            icon={UserPlus}
          />
      ) : null}
      {canManage && onDeleteRole ? (
          <IconButton
            type="button"
            size="compact"
            onClick={onDeleteRole}
            className="shrink-0 rounded-lg text-muted-foreground/40 hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${roleLabel} role`}
            icon={Trash2}
          />
      ) : null}
    </>
  );
  if (tableRow) {
    return (
      <TableRow className="bg-card hover:bg-muted/30 [&>td]:py-2">
        <TableCell className="w-28 align-top">{roleTag}</TableCell>
        <TableCell className="min-w-0">{peopleContent}</TableCell>
        {canManage && (onAdd || onDeleteRole) ? <TableCell className="w-20 text-right">{actions}</TableCell> : null}
      </TableRow>
    );
  }
  return (
    <div className="rounded-lg border border-border/60 bg-card transition-colors hover:border-border">
      <div className="flex items-start gap-2.5 px-2.5 py-2 sm:px-3">{roleTag}{peopleContent}{actions}</div>
    </div>
  );
}

export function MemberGuestPickerDialog({
  open,
  onOpenChange,
  roleLabel,
  members,
  assignedUserIds = [],
  loading = false,
  onSelectMember,
  onAddGuest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleLabel: string;
  members: RosterPickerMember[];
  assignedUserIds?: readonly string[];
  loading?: boolean;
  onSelectMember: (member: RosterPickerMember) => void;
  onAddGuest: (name: string) => void;
}) {
  const [memberSearch, setMemberSearch] = useState('');
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    if (!open) return;
    setMemberSearch('');
    setGuestName('');
  }, [open]);

  const assigned = useMemo(() => new Set(assignedUserIds), [assignedUserIds]);

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => member.displayName.toLowerCase().includes(q));
  }, [members, memberSearch]);

  const submitGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    onAddGuest(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl p-8 border-border/50 bg-card/95 backdrop-blur-3xl max-w-sm">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold normal-case not-italic tracking-tight">
            Add to {roleLabel}
          </DialogTitle>
          <DialogDescription>Pick a site member or enter a guest name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-micro-label text-muted-foreground">Members</Label>
            <SearchInput
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="text-sm"
            />
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {loading ? (
                <p className="text-center text-xs text-muted-foreground py-4">Loading members…</p>
              ) : filteredMembers.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No matching members</p>
              ) : (
                filteredMembers.map((member) => {
                  const already = assigned.has(member.uid);
                  return (
                    <Button
                      key={member.uid}
                      type="button"
                      variant="ghost"
                      disabled={already}
                      onClick={() => onSelectMember(member)}
                      className={cn(
                        'h-auto w-full items-center justify-start gap-3 px-3 py-2 rounded-xl text-left text-sm',
                        already
                          ? 'opacity-40 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted hover:border-border border border-transparent',
                      )}
                    >
                      <UserCheck className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="font-semibold">{member.displayName}</span>
                      {already ? (
                        <span className="ml-auto text-[10px] text-muted-foreground/40">added</span>
                      ) : null}
                    </Button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2 border-t border-border/30 pt-3">
            <Label className="text-micro-label text-muted-foreground">Guests</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Guest name…"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="flex-1 rounded-xl h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitGuest();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="rounded-xl h-9 shrink-0"
                disabled={!guestName.trim()}
                onClick={submitGuest}
              >
                <UserPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
