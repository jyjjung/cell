"use client";

import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useChatCreationPermissions } from '@/hooks/use-chat-creation-permissions';
import { useRoles } from '@/hooks/use-roles';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { translations } from '@/lib/translations';
import type { ChatCreationAccessMode, ChatCreationPermissions } from '@/types';

export function ChatCreationPermissionsPanel() {
  const { roles, loading: loadingRoles } = useRoles();
  const { permissions, loading: loadingPermissions, saving, savePermissions } =
    useChatCreationPermissions();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const [draftPermissions, setDraftPermissions] = useState<ChatCreationPermissions>(permissions);
  const [permissionsDirty, setPermissionsDirty] = useState(false);

  useEffect(() => {
    if (!permissionsDirty) {
      setDraftPermissions(permissions);
    }
  }, [permissions, permissionsDirty]);

  const roleOptions: MultiSelectItem[] = useMemo(
    () => roles.map((role) => ({ value: role.id, label: role.name })),
    [roles],
  );

  const updateTypeMode = (key: 'privateChat' | 'groupChat', mode: ChatCreationAccessMode) => {
    setPermissionsDirty(true);
    setDraftPermissions((prev) => ({
      ...prev,
      [key]: { ...prev[key], mode },
    }));
  };

  const updateTypeRoles = (key: 'privateChat' | 'groupChat', allowedRoleIds: string[]) => {
    setPermissionsDirty(true);
    setDraftPermissions((prev) => ({
      ...prev,
      [key]: { ...prev[key], allowedRoleIds },
    }));
  };

  const handleSavePermissions = async () => {
    try {
      await savePermissions(draftPermissions);
      setPermissionsDirty(false);
      toast({ title: t.adminChatPermissionsSaved, description: t.adminChatPermissionsSavedDesc });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not save permissions.';
      toast({ variant: 'destructive', title: t.adminSaveFailed, description: message });
    }
  };

  const renderPermissionControls = (
    key: 'privateChat' | 'groupChat',
    title: string,
    description: string,
  ) => {
    const section = draftPermissions[key];
    return (
      <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">{t.adminChatWhoCanCreate}</Label>
          <Select
            value={section.mode}
            onValueChange={(value) => updateTypeMode(key, value as ChatCreationAccessMode)}
            disabled={loadingPermissions || loadingRoles}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">{t.adminChatPermissionEveryone}</SelectItem>
              <SelectItem value="roles">{t.adminChatPermissionRoles}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {section.mode === 'roles' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">{t.adminRoles}</Label>
            <MultiSelect
              options={roleOptions}
              selected={section.allowedRoleIds}
              onChange={(ids) => updateTypeRoles(key, ids)}
              placeholder={t.adminChatSelectRoles}
            />
            {section.allowedRoleIds.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{t.adminChatNoRolesWarning}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-section-title">{t.adminChatCreationPermissions}</h2>
          <p className="text-xs text-muted-foreground mt-1">{t.adminChatCreationPermissionsDesc}</p>
        </div>
        <Button
          onClick={() => void handleSavePermissions()}
          disabled={!permissionsDirty || saving || loadingPermissions || loadingRoles}
          className="rounded-xl"
          size="sm"
        >
          {saving ? <ButtonSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          {t.adminSavePermissions}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {renderPermissionControls(
          'privateChat',
          t.adminPrivateChatPermission,
          t.adminPrivateChatPermissionDesc,
        )}
        {renderPermissionControls(
          'groupChat',
          t.adminGroupChatPermission,
          t.adminGroupChatPermissionDesc,
        )}
      </div>
    </section>
  );
}
