'use client';

import { useMemo, useState } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { MergeAccountPicks, MergeFieldPick } from '@/types/user-admin';
import type { UserProfileData } from '@/types';
import { Mail, Merge, Star, Trash2 } from 'lucide-react';
async function adminFetch(path: string, init?: RequestInit) {
  const token = await auth.currentUser?.getIdToken(true);
  if (!token) throw new Error('Authentication token not found.');
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Request failed.');
  }
  return data;
}

const PICK_OPTIONS: { value: MergeFieldPick; label: string }[] = [
  { value: 'survivor', label: 'Keep account A' },
  { value: 'merge', label: 'Keep account B' },
  { value: 'union', label: 'Combine both' },
  { value: 'eitherApproved', label: 'Approved if either is' },
  { value: 'maxProgress', label: 'Most reading progress' },
];

function userLabel(user: UserProfileData) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email || user.uid;
}

export function UserAccountToolsDialog({
  user,
  allUsers,
  open,
  onOpenChange,
}: {
  user: UserProfileData | null;
  allUsers: UserProfileData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [mergeTargetUid, setMergeTargetUid] = useState('');
  const [picks, setPicks] = useState<MergeAccountPicks>({
    firstName: 'survivor',
    lastName: 'survivor',
    email: 'survivor',
    avatar: 'survivor',
    roleIds: 'union',
    isApproved: 'eitherApproved',
    access: 'union',
    ndcpcRole: 'survivor',
    bibleChecklist: 'union',
    communityProgress: 'maxProgress',
    contactEmails: 'union',
  });

  const mergeTarget = useMemo(
    () => allUsers.find((u) => u.uid === mergeTargetUid) ?? null,
    [allUsers, mergeTargetUid],
  );

  const contactEmails = user?.contactEmails ?? [];

  const resetForUser = (next: UserProfileData | null) => {
    setLoginEmail(next?.email ?? '');
    setNewContactEmail('');
    setMergeTargetUid('');
  };

  const handleOpenChange = (next: boolean) => {
    if (next && user) resetForUser(user);
    onOpenChange(next);
  };

  if (!user) return null;

  const saveLoginEmail = async () => {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${encodeURIComponent(user.uid)}/emails`, {
        method: 'PATCH',
        body: JSON.stringify({ email: loginEmail }),
      });
      toast({ title: 'Login email updated', description: loginEmail });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not update login email',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const addContact = async () => {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${encodeURIComponent(user.uid)}/emails`, {
        method: 'POST',
        body: JSON.stringify({ email: newContactEmail }),
      });
      toast({ title: 'Contact email added' });
      setNewContactEmail('');
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not add email',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async (email: string) => {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${encodeURIComponent(user.uid)}/emails`, {
        method: 'DELETE',
        body: JSON.stringify({ email, target: 'contact' }),
      });
      toast({ title: 'Contact email removed' });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not remove email',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const promoteContact = async (email: string) => {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/users/${encodeURIComponent(user.uid)}/emails`, {
        method: 'POST',
        body: JSON.stringify({ email, action: 'promote' }),
      });
      toast({ title: 'Promoted to login email', description: email });
      setLoginEmail(email);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not promote email',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const runMerge = async () => {
    if (!mergeTarget) return;
    setBusy(true);
    try {
      const result = await adminFetch('/api/admin/users/merge', {
        method: 'POST',
        body: JSON.stringify({
          survivorUid: user.uid,
          mergeUid: mergeTarget.uid,
          picks,
        }),
      });
      const loginKeptOnTarget =
        typeof result.survivorUid === 'string' && result.survivorUid === mergeTarget.uid;
      toast({
        title: 'Accounts merged',
        description: loginKeptOnTarget
          ? `${userLabel(user)} was merged into ${userLabel(mergeTarget)} (login kept on account B).`
          : `${userLabel(mergeTarget)} was merged into ${userLabel(user)}.`,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Merge failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  };

  const mergeCandidates = allUsers.filter((u) => u.uid !== user.uid);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-section-title">Account & emails</DialogTitle>
          <DialogDescription>
            {userLabel(user)} · {user.email ?? 'No login email'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="emails">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="merge">Merge accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="emails" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-micro-label">Login email (Firebase Auth)</Label>
              <div className="flex gap-2">
                <Input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={busy}
                  className="h-10 rounded-lg"
                />
                <Button type="button" onClick={saveLoginEmail} disabled={busy || !loginEmail.trim()}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Changing login email signs the user out until they verify the new address.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-micro-label">Contact emails</Label>
              {contactEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground">No extra contact emails.</p>
              ) : (
                <ul className="space-y-2">
                  {contactEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {email}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="Make login email"
                          onClick={() => promoteContact(email)}
                          disabled={busy}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          title="Remove"
                          onClick={() => removeContact(email)}
                          disabled={busy}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  value={newContactEmail}
                  onChange={(e) => setNewContactEmail(e.target.value)}
                  placeholder="Add contact email"
                  disabled={busy}
                  className="h-10 rounded-lg"
                />
                <Button type="button" variant="outline" onClick={addContact} disabled={busy || !newContactEmail.trim()}>
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="merge" className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Account A is <strong>{userLabel(user)}</strong> (kept). Account B will be archived and deleted after
              merging chats, reading progress, and profile fields into A.
            </p>

            <div className="space-y-2">
              <Label className="text-micro-label">Account B to merge in</Label>
              <Select value={mergeTargetUid} onValueChange={setMergeTargetUid}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {mergeCandidates.map((candidate) => (
                    <SelectItem key={candidate.uid} value={candidate.uid}>
                      {userLabel(candidate)} · {candidate.email ?? candidate.uid}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mergeTarget && (
              <div className="space-y-3 rounded-xl border border-border p-3">
                {(
                  [
                    ['firstName', 'First name'],
                    ['lastName', 'Last name'],
                    ['email', 'Login email'],
                    ['avatar', 'Avatar'],
                    ['roleIds', 'Roles'],
                    ['isApproved', 'Approved'],
                    ['access', 'App access'],
                    ['ndcpcRole', 'NDCPC role'],
                    ['bibleChecklist', 'Bible checklist'],
                    ['communityProgress', 'Leaderboard progress'],
                    ['contactEmails', 'Contact emails'],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2">
                    <span className="text-sm">{label}</span>
                    <Select
                      value={picks[key] ?? 'survivor'}
                      onValueChange={(value) =>
                        setPicks((prev) => ({ ...prev, [key]: value as MergeFieldPick }))
                      }
                    >
                      <SelectTrigger className="h-9 w-[180px] rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PICK_OPTIONS.filter((opt) => {
                          if (key === 'isApproved') return opt.value === 'survivor' || opt.value === 'merge' || opt.value === 'eitherApproved';
                          if (key === 'communityProgress') return opt.value === 'survivor' || opt.value === 'merge' || opt.value === 'maxProgress';
                          if (key === 'firstName' || key === 'lastName' || key === 'email' || key === 'avatar' || key === 'ndcpcRole') {
                            return opt.value === 'survivor' || opt.value === 'merge';
                          }
                          return opt.value === 'survivor' || opt.value === 'merge' || opt.value === 'union';
                        }).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter className="px-0">
              <Button type="button" variant="destructive" disabled={!mergeTarget || busy} onClick={runMerge}>
                {busy ? <ButtonSpinner className="mr-2" /> : <Merge className="mr-2 h-4 w-4" />}
                Merge into account A
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
