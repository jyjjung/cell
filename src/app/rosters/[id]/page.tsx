"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  Save,
  Users,
  PlusCircle,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  isSameMonth,
  parseISO,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NavPageHeader, EmptyState } from "@/components/ui/page-layout";
import { useAuth } from "@/contexts/auth-context";
import { translations } from "@/lib/translations";
import { useRosterDefinitions } from "@/hooks/useRosterDefinitions";
import { useCustomRoster } from "@/hooks/useCustomRoster";
import { useAllUsers } from "@/hooks/use-all-users";
import {
  userCanSeeRoster,
  sortedRosterFields,
  formatCustomRosterEntrySummary,
} from "@/lib/roster-access";
import type { CustomRosterEntry, RosterFieldDefinition, RosterFieldValue } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import UserSelector from "@/components/chat/UserSelector";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatUserDisplayName } from "@/lib/formatting";
import { RosterFeedCard } from "@/components/ui/roster-feed-card";
import { parseDay } from "@/lib/event-occurrences";

function emptyFieldValues(fields: RosterFieldDefinition[]): Record<string, RosterFieldValue> {
  return Object.fromEntries(fields.map((f) => [f.id, { text: "", userId: null }]));
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

  const [currentDate, setCurrentDate] = useState(new Date());
  const [localChanges, setLocalChanges] = useState<
    Record<string, Record<string, RosterFieldValue>>
  >({});
  const [savingDates, setSavingDates] = useState<Record<string, boolean>>({});
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorContext, setSelectorContext] = useState<{
    date: string;
    fieldId: string;
  } | null>(null);
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));

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

  useEffect(() => {
    if (!loadingAuth && definition && currentUser && !canView) {
      router.replace("/rosters");
    }
  }, [loadingAuth, definition, currentUser, canView, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dateParam = new URLSearchParams(window.location.search).get("date");
    if (dateParam) {
      try {
        setCurrentDate(parseISO(dateParam));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const rosterMap = useMemo(() => {
    const map = new Map<string, CustomRosterEntry>();
    roster.forEach((entry) => map.set(entry.date, entry));
    return map;
  }, [roster]);

  const monthEntries = useMemo(
    () =>
      roster
        .filter((entry) => isSameMonth(parseDay(entry.date), currentDate))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [roster, currentDate],
  );

  const getDisplayValues = useCallback(
    (dateStr: string, entry?: CustomRosterEntry) => {
      const local = localChanges[dateStr];
      const base = entry?.fieldValues ?? emptyFieldValues(fields);
      if (!local) return base;
      return { ...base, ...local };
    },
    [localChanges, fields],
  );

  const handleFieldChange = (
    dateStr: string,
    fieldId: string,
    value: RosterFieldValue,
  ) => {
    setLocalChanges((prev) => ({
      ...prev,
      [dateStr]: { ...(prev[dateStr] ?? {}), [fieldId]: value },
    }));
  };

  const handleSaveDate = async (dateStr: string) => {
    const entry = rosterMap.get(dateStr);
    const fieldValues = getDisplayValues(dateStr, entry);
    const hasContent = Object.values(fieldValues).some(
      (v) => (v.text?.trim() ?? "") || v.userId,
    );
    if (!hasContent) return;

    setSavingDates((prev) => ({ ...prev, [dateStr]: true }));
    try {
      if (entry) {
        await updateEntry(entry.id, { date: dateStr, fieldValues });
      } else {
        await addEntry({ date: dateStr, fieldValues });
      }
      setLocalChanges((prev) => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
      toast({ title: t.rosterSaveEntry });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setSavingDates((prev) => ({ ...prev, [dateStr]: false }));
    }
  };

  const handleDelete = async (dateStr: string) => {
    const entry = rosterMap.get(dateStr);
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      setLocalChanges((prev) => {
        const next = { ...prev };
        delete next[dateStr];
        return next;
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete",
      });
    }
  };

  const handleAddDate = async () => {
    if (!newDate.trim()) return;
    if (rosterMap.has(newDate)) {
      setCurrentDate(parseISO(newDate));
      setAddDateOpen(false);
      return;
    }
    try {
      await addEntry({ date: newDate, fieldValues: emptyFieldValues(fields) });
      setCurrentDate(parseISO(newDate));
      setAddDateOpen(false);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to add date",
      });
    }
  };

  const loading = loadingAuth || defsLoading || rosterLoading || usersLoading;

  if (loading) {
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
        <EmptyState title={t.adminNoCustomRosters} description={t.customRostersDesc} />
      </div>
    );
  }

  const monthLabel = format(currentDate, "MMMM yyyy");

  return (
    <div className="page-container">
      <NavPageHeader title={definition.name} description={t.customRostersDesc} />

      {!canEdit && (
        <p className="mb-4 text-sm text-muted-foreground">{t.rosterEditorsOnly}</p>
      )}

      <div className="mb-4 flex flex-col gap-3 border-y border-border/50 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
          <ChevronsLeft className="mr-1 h-4 w-4" /> {t.adminPrevMonth}
        </Button>
        <h2 className="text-section-title text-center">{monthLabel}</h2>
        <div className="flex items-center justify-end gap-2">
          {canEdit && fields.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setAddDateOpen(true)}>
              <PlusCircle className="mr-1 h-4 w-4" />
              {t.rosterAddEntry}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
            {t.adminNextMonth} <ChevronsRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>

      {fields.length === 0 ? (
        <EmptyState title={t.rosterNoFields} description={t.adminSelectRoster} />
      ) : canEdit ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {monthEntries.map((entry) => {
            const dateStr = entry.date;
            const dateObj = parseDay(dateStr);
            const values = getDisplayValues(dateStr, entry);
            const isDirty = !!localChanges[dateStr];
            const isSaving = savingDates[dateStr];

            return (
              <div
                key={dateStr}
                className={cn(
                  "widget-surface space-y-3",
                  isDirty && "ring-2 ring-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-micro-label">{format(dateObj, "EEE")}</span>
                    <p className="text-section-title">{format(dateObj, "MMM d")}</p>
                  </div>
                  <div className="flex gap-1">
                    {isDirty && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={isSaving}
                        onClick={() => handleSaveDate(dateStr)}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    {entry && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8 opacity-30 hover:opacity-100"
                        onClick={() => handleDelete(dateStr)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {fields.map((field) => {
                  const value = values[field.id] ?? { text: "", userId: null };
                  const linkedUser = value.userId ? usersMap.get(value.userId) : undefined;

                  if (field.type === "user") {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="text-micro-label">{field.label}</label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={
                              linkedUser
                                ? formatUserDisplayName(linkedUser)
                                : value.text ?? ""
                            }
                            placeholder={t.adminSelectMember}
                            className={cn(
                              "h-10 rounded-xl pr-10",
                              linkedUser && "border-success/30",
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                            onClick={() => {
                              setSelectorContext({ date: dateStr, fieldId: field.id });
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
                          handleFieldChange(dateStr, field.id, {
                            ...value,
                            text: e.target.value,
                          })
                        }
                        className="h-10 rounded-xl"
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
          {monthEntries.length === 0 && (
            <p className="col-span-full text-center text-sm text-muted-foreground">
              {t.rosterNoEntries}
            </p>
          )}
        </div>
      ) : (
        <div className="stack-gap-sm">
          {monthEntries.length === 0 ? (
            <EmptyState title={t.rosterNoEntries} />
          ) : (
            monthEntries.map((entry, index) => {
              const summary = formatCustomRosterEntrySummary(
                entry,
                definition,
                usersMap,
              );
              return (
                <RosterFeedCard
                  key={entry.id}
                  date={parseDay(entry.date)}
                  label={definition.name}
                  title={summary.split(",")[0]?.split(":")[1]?.trim() || definition.name}
                  description={
                    <p className="text-xs text-muted-foreground line-clamp-3">{summary}</p>
                  }
                  index={index}
                />
              );
            })
          )}
        </div>
      )}

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
              selectorContext
                ? [
                    getDisplayValues(
                      selectorContext.date,
                      rosterMap.get(selectorContext.date),
                    )[selectorContext.fieldId]?.userId ?? "",
                  ].filter(Boolean)
                : []
            }
            onSelectionChange={(uids) => {
              if (!selectorContext) return;
              const uid = uids[0];
              const user = uid ? usersMap.get(uid) : undefined;
              handleFieldChange(selectorContext.date, selectorContext.fieldId, {
                userId: uid ?? null,
                text: user ? formatUserDisplayName(user) : "",
              });
              setSelectorOpen(false);
              setSelectorContext(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addDateOpen} onOpenChange={setAddDateOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t.rosterAddEntry}</DialogTitle>
          </DialogHeader>
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="h-10 rounded-xl"
          />
          <Button onClick={handleAddDate} className="w-full">
            {t.rosterAddEntry}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
