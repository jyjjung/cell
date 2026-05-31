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
import type { AvatarData, AppUser } from "@/types";

type ProfileIdentityCardProps = {
  user: AppUser;
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
  };
};

export function ProfileIdentityCard({
  user,
  avatarInEditor,
  isAvatarEditorOpen,
  isSaving,
  onAvatarEditorOpenChange,
  onAvatarInEditorChange,
  onAvatarSave,
  labels,
}: ProfileIdentityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card flex flex-col items-center gap-[var(--app-inner-gap)] app-card rounded-3xl text-center"
    >
      <div className="h-28 w-28 shrink-0 rounded-full border-2 border-primary/30 bg-muted shadow-md">
        <PixelAvatar avatar={user.avatar} className="h-full w-full" />
      </div>

      <div className="min-w-0 space-y-1">
        <p className="text-xl font-bold">{user.displayName}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground/60">{labels.profileNameChangeAdminOnly}</p>
      </div>

      <Dialog open={isAvatarEditorOpen} onOpenChange={onAvatarEditorOpenChange}>
        <Button
          type="button"
          className="w-full max-w-xs rounded-2xl h-11 font-semibold gap-2"
          onClick={() => onAvatarEditorOpenChange(true)}
        >
          <Palette className="h-4 w-4" />
          {labels.editAvatar}
        </Button>

        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{labels.customizeAvatarTitle}</DialogTitle>
            <DialogDescription>{labels.customizeAvatarDesc}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <AvatarEditor value={avatarInEditor} onChange={onAvatarInEditorChange} />
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
    </motion.div>
  );
}
