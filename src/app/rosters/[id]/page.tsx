"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CalendarOff, PlusCircle, Trash2, Save, Users, Pencil } from "lucide-react";
import { format, isBefore, startOfToday, compareAsc } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavPageHeader, EmptyState } from "@/components/ui/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { useRosterDefinitions } from "@/hooks/useRosterDefinitions";
import { useCustomRoster } from "@/hooks/useCustomRoster";
import { useAllUsers } from "@/hooks/use-all-users";
import {
  userCanSeeRoster,
  sortedRosterFields,
  formatCustomRosterEntrySummary,
  getCustomRosterEntryTitle,
  entryHasContent,
} from "@/lib/roster-access";
import type { CustomRosterEntry, RosterFieldDefinition, RosterFieldValue } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import UserSelector from "@/components/chat/UserSelector";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatUserDisplayName } from "@/lib/formatting";
import { ScheduleMonthGroup, ScheduleOccurrenceRow } from "@/components/schedule/schedule-occurrence-row";
import { parseDay } from "@/lib/event-occurrences";

function emptyFieldValues(fields: RosterFieldDefinition[]): Record<string, RosterFieldValue> {
  return Object.fromEntries(fields.map((f) => [f.id, { text: "", userId: null }]));
}

function groupEntriesByMonth(entries: CustomRosterEntry[]) {
  const groups = new Map<string, CustomRosterEntry[]>();
  const sorted = [...entries].sort((a, b) => compareAsc(parseDay(a.date), parseDay(b.date)));

  for (const entry of sorted) {
    try {
      const key = format(parseDay(entry.date), "MMMM yyyy");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(entry);
    } catch {
      /* skip invalid dates */
    }
  }
  return groups;
}

export default function CustomRosterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rosterDefId = typeof params.id === "string" ? params.id : null;
  const { currentUser, isAdmin, loadingAuth } = useAuth();
  const t = translations[currentUser?.preferredLanguage || "en"];
  const { definitions, loading: defsLoading } = useRosterDefinitions();
  const definition = definitions.find((d) => d.id === rosterDefId) ?? null;
  const { roster, loading: rosterLoading, canEdit, addEntry, updateEntry, deleteEntry } =
    useCustomRoster(rosterDefId, definition);
  const { allUsers, loading: usersLoading } = useAllUsers();
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [targetDate] = useState(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") : null,
  );
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomRosterEntry | null>(null);
  const [draftDate, setDraftDate] = useState("");
  const [draftValues, setDraftValues] = useState<Record<string, RosterFieldValue>>({});
  const [saving, setSaving] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorFieldId, setSelectorFieldId] = useState<string | null>(null);

  const fields = useMemo(() => sortedRosterFields(definition?.fields), [definition?.fields]);

  const usersMap = useMemo(() => {
    const map = new Map<string, (typeof allUsers)[number]>();
    allUsers.forEach((u) => map.set(u.uid, u));
    return map;
  }, [allUsers]);

  const canView = useMemo(() => {
    if (!currentUser || !definition) return false;
    return userCanSeeRoster(currentUser, definition, isAdmin);
  }, [currentUser, definition, isAdmin]);

  const visibleEntries = useMemo(() => {
    if (!definition) return [];
    const list = canEdit ? roster : roster.filter((e) => entryHasContent(e, definition));
    return list;
  }, [roster, definition, canEdit]);

  const { upcomingByMonth, pastByMonth } = useMemo(() => {
    const today = startOfToday();
    const upcoming = groupEntriesByMonth(
      visibleEntries.filter((e) => !isBefore(parseDay(e.date), today)),
    );
    const past = groupEntriesByMonth(
      visibleEntries.filter((e) => isBefore(parseDay(e.date), today)),
    );
    const pastArray = Array.from(past.entries()).reverse();
    pastArray.forEach(([, entries]) => entries.reverse());
    return {
      upcomingByMonth: Array.from(upcoming.entries()),
      pastByMonth: pastArray,
    };
  }, [visibleEntries]);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!loadingAuth && definition && currentUser && !canView) {
      router.replace("/rosters");
    }
  }, [loadingAuth, definition, currentUser, canView, router]);

  useEffect(() => {
    if (!isMounted || rosterLoading || !targetDate) return;
    const el = document.getElementById(`date-${targetDate}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    const timer = setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    }, 3000);
    return () => clearTimeout(timer);
  }, [isMounted, rosterLoading, targetDate]);

  const openNewEntry = () => {
    setEditingEntry(null);
    setDraftDate(format(new Date(), "yyyy-MM-dd"));
    setDraftValues(emptyFieldValues(fields));
    setEditOpen(true);
  };

  const openEditEntry = (entry: CustomRosterEntry) => {
    setEditingEntry(entry);
    setDraftDate(entry.date);
    setDraftValues(entry.fieldValues ?? emptyFieldValues(fields));
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!draftDate.trim()) return;
    const hasContent = Object.values(draftValues).some(
      (v) => (v.text?.trim() ?? "") || v.userId,
    );
    if (!hasContent) return;

    setSaving(true);
    try {
      const payload = { date: draftDate, fieldValues: draftValues };
      if (editingEntry) {
        await updateEntry(editingEntry.id, payload);
      } else {
        await addEntry(payload);
      }
      toast({ title: t.rosterSaveEntry });
      setEditOpen(false);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEntry) return;
    setSaving(true);
    try {
      await deleteEntry(editingEntry.id);
      setEditOpen(false);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete",
      });
    } finally {
      setSaving(false);
    }
  };

  const loading = loadingAuth || defsLoading || rosterLoading || usersLoading;

  if (!isMounted || loading) {
    return (
      <div className="page-container">
        <div className="empty-inline gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-micro-label">{t.loadingRoster}</p>
        </div>
      </div>
    );
  }

  if (!definition) {
    return (
      <div className="page-container">
        <EmptyState title={t.adminNoCustomRosters} />
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="page-container">
        <NavPageHeader title={definition.name} />
        <EmptyState title={t.rosterNoFields} description={t.adminSelectRoster} />
      </div>
    );
  }

  let globalIdx = 0;

  const renderEntry = (entry: CustomRosterEntry, faded = false) => {
    const entryDate = parseDay(entry.date);
    const title = getCustomRosterEntryTitle(entry, definition, usersMap) || definition.name;
    const summary = formatCustomRosterEntrySummary(entry, definition, usersMap);
    const currentIndex = globalIdx++;

    return (
      <ScheduleOccurrenceRow
        key={entry.id}
        id={`date-${entry.date}`}
        index={currentIndex}
        date={entryDate}
        label={definition.name}
        title={title}
        className={faded ? "opacity-80" : undefined}
        meta={summary ? <span className="line-clamp-2">{summary}</span> : undefined}
        rightElement={
          canEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              onClick={() => openEditEntry(entry)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : undefined
        }
      />
    );
  };

  const renderMonthGroup = (month: string, entries: CustomRosterEntry[], faded = false) => (
    <ScheduleMonthGroup key={month} month={month}>
      {entries.map((entry) => renderEntry(entry, faded))}
    </ScheduleMonthGroup>
  );

  return (
    <div className="page-container">
      <NavPageHeader
        title={definition.name}
        action={
          canEdit ? (
            <Button variant="outline" size="sm" onClick={openNewEntry} className="h-9 rounded-lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.rosterAddEntry}
            </Button>
          ) : undefined
        }
      />

      {!canEdit && (
        <p className="mb-4 text-sm text-muted-foreground">{t.rosterEditorsOnly}</p>
      )}

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="upcoming" className="rounded-md text-sm">{t.upcoming}</TabsTrigger>
          <TabsTrigger value="past" className="rounded-md text-sm">{t.past}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 stack-gap-sm">
          {upcomingByMonth.length > 0 ? (
            upcomingByMonth.map(([month, entries]) => renderMonthGroup(month, entries))
          ) : (
            <EmptyState icon={CalendarOff} title={t.horizonIsClear} />
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 stack-gap-sm">
          {pastByMonth.length > 0 ? (
            pastByMonth.map(([month, entries]) => renderMonthGroup(month, entries, true))
          ) : (
            <EmptyState icon={CalendarOff} title={t.rosterNoPastEntries} />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingEntry ? t.adminSaveChanges : t.rosterAddEntry}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-micro-label">{t.adminDate}</label>
              <Input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            {fields.map((field) => {
              const value = draftValues[field.id] ?? { text: "", userId: null };
              const linkedUser = value.userId ? usersMap.get(value.userId) : undefined;

              if (field.type === "user") {
                return (
                  <div key={field.id} className="space-y-1">
                    <label className="text-micro-label">{field.label}</label>
                    <div className="relative">
                      <Input
                        readOnly
                        value={linkedUser ? formatUserDisplayName(linkedUser) : value.text ?? ""}
                        placeholder={t.adminSelectMember}
                        className={cn("h-10 rounded-xl pr-10", linkedUser && "border-success/30")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                        onClick={() => {
                          setSelectorFieldId(field.id);
                          setSelectorOpen(true);
                        }}
                      >
                        <Users className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={field.id} className="space-y-1">
                  <label className="text-micro-label">{field.label}</label>
                  <Input
                    value={value.text ?? ""}
                    onChange={(e) =>
                      setDraftValues((prev) => ({
                        ...prev,
                        [field.id]: { ...value, text: e.target.value },
                      }))
                    }
                    className="h-10 rounded-xl"
                  />
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {editingEntry && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={saving}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t.adminYesDelete}
              </Button>
            )}
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t.rosterSaveEntry}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t.adminSelectMember}</DialogTitle>
          </DialogHeader>
          <UserSelector
            users={allUsers}
            loading={usersLoading}
            selectionMode="single"
            selectedUsers={
              selectorFieldId && draftValues[selectorFieldId]?.userId
                ? [draftValues[selectorFieldId].userId!]
                : []
            }
            onSelectionChange={(uids) => {
              if (!selectorFieldId) return;
              const uid = uids[0];
              const user = uid ? usersMap.get(uid) : undefined;
              setDraftValues((prev) => ({
                ...prev,
                [selectorFieldId]: {
                  userId: uid ?? null,
                  text: user ? formatUserDisplayName(user) : "",
                },
              }));
              setSelectorOpen(false);
              setSelectorFieldId(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
