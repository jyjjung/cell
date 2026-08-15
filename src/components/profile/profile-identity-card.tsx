"use client";

import { Loader2, Palette, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PixelAvatar } from "@/components/avatar/PixelAvatar";
import { AvatarEditor } from "@/components/avatar/AvatarEditor";
import { NdcpcPhotoAvatarEditor } from "@/components/avatar/NdcpcPhotoAvatarEditor";
import type { AvatarData, AppUser } from "@/types";

type ProfileIdentityCardProps = {
  user: AppUser;
  avatar: AvatarData;
  appLabel?: string;
  showHalo?: boolean;
  showIdentity?: boolean;
  avatarInEditor: AvatarData;
  isAvatarEditorOpen: boolean;
  isSaving: boolean;
  onAvatarEditorOpenChange: (open: boolean) => void;
  onAvatarInEditorChange: (avatar: AvatarData) => void;
  onAvatarSave: () => void;
  labels: {
    customizeAvatarTitle: string;
    customizeAvatarDesc: string;
    editAvatar: string;
    profileNameChangeAdminOnly: string;
    cancel: string;
    save: string;
    avatarEditingLocked?: string;
  };
  avatarEditingDisabled?: boolean;
  editorVariant?: 'cell' | 'ndcpc-photo';
};

export function ProfileIdentityCard({
  user,
  avatar,
  appLabel,
  showHalo = true,
  showIdentity = true,
  avatarInEditor,
  isAvatarEditorOpen,
  isSaving,
  onAvatarEditorOpenChange,
  onAvatarInEditorChange,
  onAvatarSave,
  labels,
  avatarEditingDisabled = false,
  editorVariant = 'cell',
}: ProfileIdentityCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center gap-4 py-2"
    >
      {appLabel ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{appLabel}</p>
      ) : null}

      <div className="h-24 w-24 shrink-0">
        <PixelAvatar avatar={avatar} showHalo={showHalo} className="h-24 w-24" />
      </div>

      {showIdentity ? (
        <div className="min-w-0 space-y-1">
          <p className="text-xl font-semibold tracking-tight">{user.displayName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground/70">{labels.profileNameChangeAdminOnly}</p>
        </div>
      ) : null}

      <Dialog open={isAvatarEditorOpen} onOpenChange={onAvatarEditorOpenChange}>
        {avatarEditingDisabled ? (
          <p className="text-xs text-muted-foreground max-w-xs">
            {labels.avatarEditingLocked || 'Your profile photo is managed by a curator. Contact them to request a change.'}
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="rounded-full h-10 px-5 font-medium gap-2"
            onClick={() => onAvatarEditorOpenChange(true)}
          >
            <Palette className="h-4 w-4" />
            {labels.editAvatar}
          </Button>
        )}

        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.customizeAvatarTitle}</DialogTitle>
            <DialogDescription>{labels.customizeAvatarDesc}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {editorVariant === 'ndcpc-photo' ? (
              <NdcpcPhotoAvatarEditor value={avatarInEditor} onChange={onAvatarInEditorChange} />
            ) : (
              <AvatarEditor value={avatarInEditor} onChange={onAvatarInEditorChange} />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onAvatarEditorOpenChange(false)}>
              {labels.cancel}
            </Button>
            <Button onClick={onAvatarSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}{" "}
              {labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}
