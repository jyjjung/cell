"use client";

import { useMemo, useState } from "react";
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Trash2,
  ExternalLink,
  GripVertical,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader } from "@/components/ui/page-layout";
import { ListLoadingSkeleton } from "@/components/ui/loading-state";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { useRosterDefinitions } from "@/hooks/useRosterDefinitions";
import { useAllUsers } from "@/hooks/use-all-users";
import { useRoles } from "@/hooks/use-roles";
import { useToast } from "@/hooks/use-toast";
import type { RosterDefinition, RosterFieldDefinition, RosterFieldType } from "@/types";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { sortedRosterFields } from "@/lib/roster-access";

function newFieldId() {
  return typeof window !== "undefined" && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : crypto.randomUUID();
}

function RosterSettingsPanel({
  roster,
  onUpdate,
  onDelete,
  t,
}: {
  roster: RosterDefinition;
  onUpdate: (id: string, data: Partial<RosterDefinition>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  t: (typeof translations)["en"];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { allUsers } = useAllUsers();
  const { roles } = useRoles();
  const [name, setName] = useState(roster.name);
  const [fields, setFields] = useState<RosterFieldDefinition[]>(sortedRosterFields(roster.fields));
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<RosterFieldType>("person");
  const [visibilityType, setVisibilityType] = useState<"public" | "private">(
    roster.visibility?.type ?? "public",
  );
  const [viewUserIds, setViewUserIds] = useState<string[]>(roster.visibility?.allowedUserIds ?? []);
  const [viewRoleIds, setViewRoleIds] = useState<string[]>(roster.visibility?.allowedRoleIds ?? []);
  const [editUserIds, setEditUserIds] = useState<string[]>(roster.editPermissions?.allowedUserIds ?? []);
  const [editRoleIds, setEditRoleIds] = useState<string[]>(roster.editPermissions?.allowedRoleIds ?? []);
  const [saving, setSaving] = useState(false);

  const userOptions = useMemo(
    () =>
      allUsers.map((u) => ({
        value: u.uid,
        label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.uid,
      })),
    [allUsers],
  );
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(roster.id, {
        name: name.trim(),
        fields,
        visibility: {
          type: visibilityType,
          allowedUserIds: visibilityType === "private" ? viewUserIds : [],
          allowedRoleIds: visibilityType === "private" ? viewRoleIds : [],
        },
        editPermissions: {
          allowedUserIds: editUserIds,
          allowedRoleIds: editRoleIds,
        },
      });
      toast({ title: t.adminSaveChanges });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t.error,
        description: err instanceof Error ? err.message : t.adminCouldNotSave,
      });
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const label = newLabel.trim();
    if (!label) return;
    setFields((prev) => [
      ...prev,
      { id: newFieldId(), label, type: newType, order: prev.length },
    ]);
    setNewLabel("");
  };

  const removeField = (fieldId: string) => {
    setFields((prev) =>
      prev
        .filter((f) => f.id !== fieldId)
        .map((f, i) => ({ ...f, order: i })),
    );
  };

  const moveField = (index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  };

  return (
    <div className="widget-surface space-y-6">
      <div className="space-y-2">
        <Label className="text-micro-label">{t.adminRosterName}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
      </div>

      <section className="space-y-3">
        <h3 className="text-section-title">{t.adminRosterFields}</h3>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.rosterNoFields}</p>
        ) : (
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2"
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{field.label}</p>
                  <p className="text-micro-label">
                    {field.type === "text"
                      ? t.adminFieldTypeText
                      : field.type === "user"
                        ? t.adminFieldTypeUser
                        : t.adminFieldTypePerson}
                  </p>
                </div>
                <div className="flex gap-1">
                  <IconButton
                    aria-label="Move up"
                    icon={ChevronUp}
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                  />
                  <IconButton
                    aria-label="Move down"
                    icon={ChevronDown}
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, 1)}
                  />
                  <IconButton
                    aria-label="Remove field"
                    icon={Trash2}
                    className="text-destructive"
                    onClick={() => removeField(field.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t.adminFieldLabel}
            className="h-10 rounded-xl"
          />
          <Select value={newType} onValueChange={(v) => setNewType(v as RosterFieldType)}>
            <SelectTrigger className="h-10 rounded-xl sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="person">{t.adminFieldTypePerson}</SelectItem>
              <SelectItem value="user">{t.adminFieldTypeUser}</SelectItem>
              <SelectItem value="text">{t.adminFieldTypeText}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={addField} className="h-10 shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t.adminAddField}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-section-title">{t.adminRosterVisibility}</h3>
        <Select
          value={visibilityType}
          onValueChange={(v) => setVisibilityType(v as "public" | "private")}
        >
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">{t.adminRosterVisibilityPublic}</SelectItem>
            <SelectItem value="private">{t.adminRosterVisibilityPrivate}</SelectItem>
          </SelectContent>
        </Select>
        {visibilityType === "private" && (
          <div className="space-y-3">
            <MultiSelect
              options={roleOptions}
              selected={viewRoleIds}
              onChange={setViewRoleIds}
              placeholder={t.adminRoles}
            />
            <MultiSelect
              options={userOptions}
              selected={viewUserIds}
              onChange={setViewUserIds}
              placeholder={t.adminMember}
            />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-section-title">{t.adminRosterEditors}</h3>
          <p className="text-sm text-muted-foreground">{t.adminRosterEditorsDesc}</p>
        </div>
        <MultiSelect
          options={roleOptions}
          selected={editRoleIds}
          onChange={setEditRoleIds}
          placeholder={t.adminRoles}
        />
        <MultiSelect
          options={userOptions}
          selected={editUserIds}
          onChange={setEditUserIds}
          placeholder={t.adminMember}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? <ButtonSpinner className="mr-2" /> : null}
          {t.adminSaveChanges}
        </Button>
        <Button variant="outline" onClick={() => router.push(`/rosters/${roster.id}`)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          {t.adminViewRoster}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">{t.adminDeleteRoster}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{t.adminDeleteRoster}</AlertDialogTitle>
              <AlertDialogDescription>{t.adminDeleteRosterDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => onDelete(roster.id)}
              >
                {t.adminYesDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function AdminCustomRostersPage() {
  const { currentUser, isAdmin } = useAuth();
  const t = translations[currentUser?.preferredLanguage || "en"];
  const { definitions, loading, addDefinition, updateDefinition, deleteDefinition } =
    useRosterDefinitions();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = definitions.find((d) => d.id === selectedId) ?? null;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const id = await addDefinition(name);
      setSelectedId(id);
      setNewName("");
      toast({ title: t.adminCreateRoster });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t.error,
        description: err instanceof Error ? err.message : t.adminCreateRosterFailed,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<RosterDefinition>) => {
    await updateDefinition(id, data);
  };

  const handleDelete = async (id: string) => {
    await deleteDefinition(id);
    if (selectedId === id) setSelectedId(null);
    toast({ title: t.adminDeleteRoster });
  };

  if (!isAdmin) return null;

  return (
    <div className="admin-page">
      <PageHeader title={t.adminCustomRosters} />

      {loading ? (
        <ListLoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="widget-surface space-y-3">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.adminRosterName}
                className="h-10 rounded-xl"
              />
              <IconButton
                aria-label="Create roster"
                icon={creating ? ButtonSpinner : PlusCircle}
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="shrink-0"
                variant="default"
              />
            </div>

            {definitions.length === 0 ? (
              <EmptyState icon={ClipboardList} title={t.adminNoCustomRosters} />
            ) : (
              <div className="space-y-1">
                {definitions.map((def) => (
                  <Button
                    key={def.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedId(def.id)}
                    className={cn(
                      "h-auto min-h-11 w-full justify-start gap-2 rounded-xl px-3 py-2 text-left text-sm",
                      selectedId === def.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <ClipboardList className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium">{def.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </aside>

          <div>
            {selected ? (
              <RosterSettingsPanel
                key={selected.id}
                roster={selected}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                t={t}
              />
            ) : (
              <EmptyState icon={ClipboardList} title={t.adminSelectRoster} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
