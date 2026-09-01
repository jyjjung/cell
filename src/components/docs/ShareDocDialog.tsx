'use client';

import { useEffect, useMemo, useState } from 'react';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import UserSelector from '@/components/chat/UserSelector';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { translations } from '@/lib/translations';
import type { DocNote, DocVisibility } from '@/types';

type ShareDocDialogProps = {
  open: boolean;
  note: DocNote;
  onClose: () => void;
  onSave: (visibility: DocVisibility, sharedWith: string[]) => Promise<void>;
};

export function ShareDocDialog({ open, note, onClose, onSave }: ShareDocDialogProps) {
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const [visibility, setVisibility] = useState<DocVisibility>(note.visibility);
  const [sharedWith, setSharedWith] = useState<string[]>(note.sharedWith);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVisibility(note.visibility);
    setSharedWith(note.sharedWith);
    setSaving(false);
  }, [open, note.visibility, note.sharedWith]);

  const selectableUsers = useMemo(
    () => allUsers.filter((u) => u.uid !== currentUser?.uid),
    [allUsers, currentUser?.uid],
  );

  const canSubmit =
    (visibility === 'private' || sharedWith.length > 0) && !saving;

  const handleSave = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onSave(visibility, visibility === 'shared' ? sharedWith : []);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-xl p-5 border-border/50 bg-card max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-section-title">{t.shareSettings}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t.shareSettingsDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="stack-gap-sm mt-3">
          <div className="stack-gap-sm">
            <Label>{t.visibility}</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as DocVisibility)}
              className="stack-gap-sm"
            >
              <label className="flex items-start gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="private" id="share-private" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t.personalDocument}</p>
                  <p className="text-xs text-muted-foreground">{t.personalDocumentDesc}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border border-border/50 p-3 cursor-pointer hover:bg-muted/40">
                <RadioGroupItem value="shared" id="share-shared" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{t.sharedDocument}</p>
                  <p className="text-xs text-muted-foreground">{t.sharedDocumentDesc}</p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {visibility === 'shared' ? (
            <div className="stack-gap-sm">
              <Label>{t.shareWith}</Label>
              <UserSelector
                users={selectableUsers}
                loading={loadingUsers}
                selectedUsers={sharedWith}
                onSelectionChange={setSharedWith}
                selectionMode="multiple"
                placeholder={t.searchMembers}
                height="h-[200px]"
              />
            </div>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-lg" onClick={onClose}>
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              className="flex-1 rounded-lg"
              onClick={handleSave}
              disabled={!canSubmit}
            >
              {saving ? <ButtonSpinner className="mr-2" /> : null}
              {t.save}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
