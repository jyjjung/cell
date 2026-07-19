
"use client";

import UserSelector from '@/components/chat/UserSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-layout';
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
import { ChevronsLeft, ChevronsRight, Loader2, Save, Trash2, UserCheck, Users } from 'lucide-react';
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
        toast({ title: "Saved", description: `${datesWithChanges.length} entries updated.` });
    } catch (error) {
        console.error("Failed to save roster entry", error);
        toast({ variant: "destructive", title: "Save failed", description: "Could not save changes." });
    } finally {
        setIsSavingAll(false);
    }
  };

  const handleDelete = async (date: string) => {
    if (!rosterMap.has(date)) return;
    try {
        await deleteEntry(date);
        toast({ title: "Entry removed", description: format(new Date(date), "MMM d") });
    } catch (error) {
        console.error("Failed to delete roster entry", error);
        toast({ variant: "destructive", title: "Purge Failed", description: "Could not remove the entry." });
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
                        {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
        <div className="empty-inline gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-micro-label">{t.adminLoadingRoster}</p>
        </div>
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
                    <div key={dateStr} className={cn("widget-surface space-y-3", isDirty && "ring-2 ring-primary bg-primary/5")}>
                         <div className="flex justify-between items-center">
                             <div className="flex flex-col">
                                 <span className="text-micro-label">{format(dateObj, 'EEE')}</span>
                                 <span className="text-section-title">{format(dateObj, 'MMM d')}</span>
                             </div>
                             <Button 
                                size="icon" 
                                variant="destructive" 
                                onClick={() => handleDelete(dateStr)} 
                                disabled={!entry}
                                className="h-8 w-8 rounded-lg opacity-20 hover:opacity-100 transition-opacity"
                             >
                                <Trash2 className="h-3 w-3" />
                             </Button>
                         </div>
                         <div className="space-y-3">
                             <div className="relative w-full">
                               <Input
                                 value={displayData.personName}
                                 onChange={(e) => handlePersonNameChange(dateStr, e.target.value)}
                                 placeholder={t.adminPerson}
                                 className={cn(
                                     "h-10 rounded-xl bg-muted border-white/5 transition-all text-xs",
                                     isLinked && "pr-8 border-success/30 focus-visible:ring-success/30"
                                 )}
                               />
                               <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditingDate(dateStr);
                                    setIsSelectorOpen(true);
                                  }}
                                >
                                  <Users className="h-3 w-3" />
                                </Button>
                             </div>
                             <Input
                                value={displayData.title}
                                onChange={(e) => handleFieldChange(dateStr, 'title', e.target.value)}
                                placeholder={t.adminTitle}
                                className="h-10 rounded-xl bg-muted border-white/5 text-xs"
                             />
                             <Input
                                value={displayData.passage}
                                onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                                placeholder={t.adminPassage}
                                className="h-10 rounded-xl bg-muted border-white/5 font-mono text-xs"
                             />
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
                                "h-9 rounded-lg bg-muted border-white/5 transition-all focus:bg-background text-xs",
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
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg"
                          onClick={() => {
                            setEditingDate(dateStr);
                            setIsSelectorOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={displayData.title}
                        onChange={(e) => handleFieldChange(dateStr, 'title', e.target.value)}
                        placeholder={t.adminTitle}
                        className="h-9 rounded-lg bg-muted border-white/5 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={displayData.passage}
                        onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                        placeholder={t.adminPassage}
                        className="h-9 rounded-lg bg-muted border-white/5 font-mono text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex justify-end gap-2">
                        <Button 
                            size="icon" 
                            variant="destructive" 
                            onClick={() => handleDelete(dateStr)} 
                            disabled={!entry}
                            className="h-9 w-9 rounded-lg opacity-30 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
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
