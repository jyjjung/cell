
"use client";

import UserSelector from '@/components/chat/UserSelector';
import { ButtonSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-layout';
import { ListLoadingSkeleton } from '@/components/ui/loading-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useToast } from '@/hooks/use-toast';
import { useQTRoster } from '@/hooks/useQTRoster';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { QTRosterEntry } from '@/types';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Save, Trash2, UserCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function AdminQTRosterPage() {
  const { roster, loading: rosterLoading, upsertEntry, deleteEntry } = useQTRoster();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localChanges, setLocalChanges] = useState<Record<string, Partial<QTRosterEntry>>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);

  const { toast } = useToast();
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

  const otherUsers = useMemo(() => allUsers.filter(u => u.firstName), [allUsers]);

  const { monthDates, monthLabel } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return {
      monthDates: eachDayOfInterval({ start, end }),
      monthLabel: format(currentDate, 'MMMM yyyy'),
    };
  }, [currentDate]);

  const rosterMap = useMemo(() => {
    const map = new Map<string, QTRosterEntry>();
    roster.forEach(entry => map.set(entry.date, entry));
    return map;
  }, [roster]);

  const normalizeText = (text: string): string => {
    if (!text) return '';
    return text.normalize('NFKC').replace(/\s+/g, ' ').trim();
  };

  const handleFieldChange = (date: string, field: 'title' | 'passage' | 'personName', value: string) => {
    const cleanValue = normalizeText(value);
    setLocalChanges(prev => ({
      ...prev,
      [date]: { ...prev[date], [field]: cleanValue },
    }));
  };
  
  const handlePersonNameChange = (date: string, name: string) => {
    const cleanName = normalizeText(name);
    const matchedUser = otherUsers.find(u => `${u.firstName} ${u.lastName}`.trim().toLowerCase() === cleanName.toLowerCase());
    setLocalChanges(prev => ({
        ...prev,
        [date]: { 
            ...prev[date], 
            personName: cleanName, 
            userId: matchedUser ? matchedUser.uid : undefined 
        },
    }));
  };

  const handleUserSelected = (date: string, uids: string[]) => {
    if (uids.length > 0) {
        const selectedUser = otherUsers.find(u => u.uid === uids[0]);
        if (selectedUser) {
            setLocalChanges(prev => ({
                ...prev,
                [date]: {
                    ...prev[date],
                    userId: selectedUser.uid,
                    personName: `${selectedUser.firstName} ${selectedUser.lastName}`.trim(),
                },
            }));
        }
    }
    setIsSelectorOpen(false);
    setEditingDate(null);
  };

  const handleBulkSave = async () => {
    const datesWithChanges = Object.keys(localChanges);
    if (datesWithChanges.length === 0) return;
    
    setIsSavingAll(true);
    
    try {
        const promises = datesWithChanges.map(async (date) => {
            const existingEntry = (rosterMap.get(date) || {}) as Partial<QTRosterEntry>;
            const changes = localChanges[date] || {};
            const resolvedUserId = changes.userId !== undefined ? changes.userId : (existingEntry.userId || undefined);

            const dataToSave: Omit<QTRosterEntry, 'id'> & { userId?: string } = {
                date,
                personName: changes.personName !== undefined ? changes.personName : (existingEntry.personName || ''),
                title: changes.title !== undefined ? changes.title : (existingEntry.title || ''),
                passage: changes.passage !== undefined ? changes.passage : (existingEntry.passage || ''),
                ...(resolvedUserId ? { userId: resolvedUserId } : {}),
            };

            return upsertEntry(dataToSave);
        });

        await Promise.all(promises);
        setLocalChanges({});
        toast({
          title: t.saved,
          description: t.adminEntriesUpdated.replace('{count}', String(datesWithChanges.length)),
        });
    } catch (error) {
        console.error("Failed to save roster entry", error);
        toast({ variant: "destructive", title: t.adminSaveFailed, description: t.adminCouldNotSave });
    } finally {
        setIsSavingAll(false);
    }
  };

  const handleDelete = async (date: string) => {
    if (!rosterMap.has(date)) return;
    try {
        await deleteEntry(date);
        toast({ title: t.adminEntryRemoved, description: format(new Date(date), "MMM d") });
    } catch (error) {
        console.error("Failed to delete roster entry", error);
        toast({ variant: "destructive", title: t.adminPurgeFailed, description: t.adminCouldNotRemove });
    }
  };

  const loading = rosterLoading || usersLoading;

  return (
    <div className="admin-page">
      <header className="space-y-3">
        <PageHeader title={t.adminQTRoster} />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-y border-border/50">
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                    <ChevronsLeft className="mr-1 h-4 w-4" /> {t.adminPrevMonth}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'timeline' ? 'grid' : 'timeline')}>
                    {viewMode === 'timeline' ? t.adminSwitchToGrid : t.adminSwitchToTimeline}
                </Button>
            </div>
            <h2 className="text-section-title">{monthLabel}</h2>
            <div className="flex items-center gap-2">
                {Object.keys(localChanges).length > 0 && (
                    <Button onClick={handleBulkSave} disabled={isSavingAll} size="sm">
                        {isSavingAll ? <ButtonSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {t.adminSaveDrafts.replace('{count}', String(Object.keys(localChanges).length))}
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                    {t.adminNextMonth} <ChevronsRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </div>
      </header>

      {loading ? (
        <ListLoadingSkeleton />
      ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {monthDates.map(dateObj => {
                const dateStr = format(dateObj, 'yyyy-MM-dd');
                const entry = rosterMap.get(dateStr);
                const localData = localChanges[dateStr] || {};
                
                const displayData = {
                  personName: localData.personName ?? entry?.personName ?? '',
                  title: localData.title ?? entry?.title ?? '',
                  passage: localData.passage ?? entry?.passage ?? '',
                };

                const isDirty = !!localChanges[dateStr];
                const isLinked = !!(localChanges[dateStr]?.userId ?? entry?.userId);

                return (
                    <div key={dateStr} className={cn(
                      "flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5",
                      isDirty && "ring-2 ring-primary bg-primary/5"
                    )}>
                         <div className="flex items-center justify-between">
                             <div className="flex flex-col">
                                 <span className="text-[11px] font-medium text-muted-foreground">{format(dateObj, 'EEE')}</span>
                                 <span className="text-lg font-semibold text-foreground">{format(dateObj, 'MMM d')}</span>
                             </div>
                             <IconButton
                                aria-label="Delete entry"
                                icon={Trash2}
                                variant="secondary"
                                onClick={() => handleDelete(dateStr)}
                                disabled={!entry}
                                className="rounded-lg text-destructive opacity-40 hover:opacity-100"
                             />
                         </div>
                         <div className="space-y-3">
                             <div className="space-y-1">
                               <p className="text-[11px] font-medium text-muted-foreground">{t.adminPerson}</p>
                               <div className="relative w-full">
                                 <Input
                                   value={displayData.personName}
                                   onChange={(e) => handlePersonNameChange(dateStr, e.target.value)}
                                   placeholder={t.adminPerson}
                                   className={cn(
                                       "h-9 rounded-[10px] border-border bg-muted pr-10 text-[13px]",
                                       isLinked && "border-success/30 focus-visible:ring-success/30"
                                   )}
                                 />
                                 <IconButton
                                    aria-label="Select person"
                                    icon={Users}
                                    variant="secondary"
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg"
                                    onClick={() => {
                                      setEditingDate(dateStr);
                                      setIsSelectorOpen(true);
                                    }}
                                  />
                               </div>
                             </div>
                             <div className="space-y-1">
                               <p className="text-[11px] font-medium text-muted-foreground">{t.adminTitle}</p>
                               <Input
                                  value={displayData.title}
                                  onChange={(e) => handleFieldChange(dateStr, 'title', e.target.value)}
                                  placeholder={t.adminTitle}
                                  className="h-9 rounded-[10px] border-border bg-muted text-[13px]"
                               />
                             </div>
                             <div className="space-y-1">
                               <p className="text-[11px] font-medium text-muted-foreground">{t.adminPassage}</p>
                               <Input
                                  value={displayData.passage}
                                  onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                                  placeholder={t.adminPassage}
                                  className="h-9 rounded-[10px] border-border bg-muted font-mono text-[13px]"
                               />
                             </div>
                         </div>
                    </div>
                );
              })}
          </div>
      ) : (
        <div className="admin-table-wrap">
          <Table className="admin-table">
            <TableHeader className="bg-muted">
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="w-[120px]">{t.adminDate}</TableHead>
                <TableHead className="w-[300px]">{t.adminPerson}</TableHead>
                <TableHead>{t.adminTitle}</TableHead>
                <TableHead>{t.adminPassage}</TableHead>
                <TableHead className="w-[120px] text-right">{t.adminActions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthDates.map(dateObj => {
                const dateStr = format(dateObj, 'yyyy-MM-dd');
                const entry = rosterMap.get(dateStr);
                const localData = localChanges[dateStr] || {};
                
                const displayData = {
                  personName: localData.personName ?? entry?.personName ?? '',
                  title: localData.title ?? entry?.title ?? '',
                  passage: localData.passage ?? entry?.passage ?? '',
                };

                const isDirty = !!localChanges[dateStr];
                const isLinked = !!(localChanges[dateStr]?.userId ?? entry?.userId);

                return (
                  <TableRow key={dateStr} className={cn("transition-colors group", isDirty && "bg-primary/5")}>
                    <TableCell>
                        <div className="flex flex-col">
                            <span className="text-micro-label">{format(dateObj, 'EEE')}</span>
                            <span className="text-sm font-semibold">{format(dateObj, 'MMM d')}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                          <Input
                            value={displayData.personName}
                            onChange={(e) => handlePersonNameChange(dateStr, e.target.value)}
                            placeholder={t.adminPerson}
                            className={cn(
                                "h-9 rounded-[10px] border-border bg-muted text-[13px] transition-all",
                                isLinked && "pr-10 border-success/30 focus-visible:ring-success/30"
                            )}
                          />
                          <AnimatePresence>
                            {isLinked && (
                                <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <UserCheck className="h-4 w-4 text-success" />
                                </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <IconButton
                          aria-label="Select person"
                          icon={Users}
                          variant="secondary"
                          className="shrink-0 rounded-lg"
                          onClick={() => {
                            setEditingDate(dateStr);
                            setIsSelectorOpen(true);
                          }}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={displayData.title}
                        onChange={(e) => handleFieldChange(dateStr, 'title', e.target.value)}
                        placeholder={t.adminTitle}
                        className="h-9 rounded-[10px] border-border bg-muted text-[13px]"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={displayData.passage}
                        onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                        placeholder={t.adminPassage}
                        className="h-9 rounded-[10px] border-border bg-muted font-mono text-[13px]"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                        <IconButton
                            aria-label="Delete entry"
                            icon={Trash2}
                            variant="destructive"
                            onClick={() => handleDelete(dateStr)}
                            disabled={!entry}
                            className="rounded-lg opacity-30 group-hover:opacity-100"
                        />
                       </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
        <DialogContent className="rounded-2xl">
            <DialogHeader>
                <DialogTitle className="text-section-title">{t.adminSelectMember}</DialogTitle>
                <DialogDescription>{t.adminSelectMemberDesc}</DialogDescription>
            </DialogHeader>
            {editingDate && (
            <UserSelector
                users={otherUsers}
                loading={usersLoading}
                selectedUsers={[]}
                onSelectionChange={(uids) => handleUserSelected(editingDate, uids)}
                selectionMode="single"
            />
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
