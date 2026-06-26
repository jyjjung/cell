"use client";

import { useEffect, useState } from 'react';
import { Loader2, Palette, Save, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarEditor } from '@/components/avatar/AvatarEditor';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import { DEFAULT_AVATAR_DATA } from '@/lib/avatar-options';
import { canMemberChangeOwnAvatar } from '@/lib/avatar-curator';
import { updateMemberAvatarAsCurator } from '@/lib/avatar-curator-client';
import { sanitizeAvatarData } from '@/lib/avatar-utils';
import { useToast } from '@/hooks/use-toast';
import type { AvatarData, UserProfileData } from '@/types';

type MemberAvatarCuratorPanelProps = {
  member: UserProfileData;
  onUpdated: (patch: Partial<UserProfileData>) => void;
};

export function MemberAvatarCuratorPanel({ member, onUpdated }: MemberAvatarCuratorPanelProps) {
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [avatarInEditor, setAvatarInEditor] = useState<AvatarData>(
    () => ({ ...DEFAULT_AVATAR_DATA, ...member.avatar }),
  );
  const [avatarChangesEnabled, setAvatarChangesEnabled] = useState(
    () => canMemberChangeOwnAvatar(member.avatarChangesEnabled),
  );
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    setAvatarChangesEnabled(canMemberChangeOwnAvatar(member.avatarChangesEnabled));
  }, [member.avatarChangesEnabled]);

  useEffect(() => {
    if (editorOpen) {
      setAvatarInEditor({ ...DEFAULT_AVATAR_DATA, ...member.avatar });
    }
  }, [editorOpen, member.avatar]);

  const handleSaveAvatar = async () => {
    setSavingAvatar(true);
    try {
      const nextAvatar = sanitizeAvatarData(avatarInEditor, {
        firstName: member.firstName,
        lastName: member.lastName,
      });
      const result = await updateMemberAvatarAsCurator({
        targetUserId: member.uid,
        avatar: nextAvatar,
      });
      if (!result.success) throw new Error(result.error);
      onUpdated({ avatar: nextAvatar });
      setEditorOpen(false);
      toast({ title: 'Photo updated', description: `${member.firstName}'s profile photo was saved.` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not save photo';
      toast({ variant: 'destructive', title: 'Save failed', description: message });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleToggleChanges = async (enabled: boolean) => {
    setAvatarChangesEnabled(enabled);
    setSavingToggle(true);
    try {
      const result = await updateMemberAvatarAsCurator({
        targetUserId: member.uid,
        avatarChangesEnabled: enabled,
      });
      if (!result.success) throw new Error(result.error);
      onUpdated({ avatarChangesEnabled: enabled });
      toast({
        title: enabled ? 'Self-editing enabled' : 'Self-editing disabled',
        description: enabled
          ? `${member.firstName} can change their own profile photo again.`
          : `${member.firstName} can no longer change their own profile photo.`,
      });
    } catch (error: unknown) {
      setAvatarChangesEnabled(!enabled);
      const message = error instanceof Error ? error.message : 'Could not update setting';
      toast({ variant: 'destructive', title: 'Update failed', description: message });
    } finally {
      setSavingToggle(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="widget-surface border border-primary/30 bg-primary/5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/15">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm">Profile photo management</h3>
          <p className="text-xs text-muted-foreground">Curator controls for this member</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 bg-card/60 px-4 py-3">
        <div className="space-y-0.5 min-w-0">
          <Label htmlFor="avatar-changes-toggle" className="text-sm font-semibold">
            Allow member to change their photo
          </Label>
          <p className="text-xs text-muted-foreground">
            When off, only you can update their profile picture.
          </p>
        </div>
        <Switch
          id="avatar-changes-toggle"
          checked={avatarChangesEnabled}
          disabled={savingToggle}
          onCheckedChange={handleToggleChanges}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="h-20 w-20 rounded-full border-2 border-border/50 bg-muted shrink-0">
          <PixelAvatar avatar={member.avatar} nameHint={member} />
        </div>
        <Button
          type="button"
          className="rounded-2xl gap-2 w-full sm:w-auto"
          onClick={() => setEditorOpen(true)}
        >
          <Palette className="h-4 w-4" />
          Edit profile photo
        </Button>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {member.firstName}&apos;s photo</DialogTitle>
            <DialogDescription>
              Changes apply immediately for all members and chats.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <AvatarEditor
              value={avatarInEditor}
              onChange={setAvatarInEditor}
              uploadUid={member.uid}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={savingAvatar}>
              Cancel
            </Button>
            <Button onClick={handleSaveAvatar} disabled={savingAvatar}>
              {savingAvatar ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
