
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
import { auth } from '@/lib/firebase';
import { useAllUsers } from '@/hooks/use-all-users';
import { useToast } from '@/hooks/use-toast';
import { useQTRoster } from '@/hooks/useQTRoster';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { QTRosterEntry } from '@/types';
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, FileScan, Save, Trash2, UserCheck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type ScannedRosterEntry = {
  date: string;
  row1?: string;
  row2?: string;
  title?: string;
  passage?: string;
};

export default function AdminQTRosterPage() {
  const { roster, loading: rosterLoading, upsertEntry, deleteEntry } = useQTRoster();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localChanges, setLocalChanges] = useState<Record<string, Partial<QTRosterEntry>>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<'uploading' | 'analyzing' | 'preparing' | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanRowPreference, setScanRowPreference] = useState<'1' | '2'>('1');
  const [scannedEntries, setScannedEntries] = useState<ScannedRosterEntry[]>([]);
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

  const handleCancelChanges = () => {
    setLocalChanges({});
    setScanFile(null);
    setScannedEntries([]);
  };

  const applyScannedRow = (entries: ScannedRosterEntry[], row: '1' | '2') => {
    setLocalChanges((previousChanges) => {
      const nextChanges = { ...previousChanges };
      entries.forEach((entry) => {
        const personName = row === '1' ? entry.row1 : entry.row2;
        if (!personName?.trim()) return;
        const matchedUser = otherUsers.find((user) =>
          `${user.firstName} ${user.lastName}`.trim().toLowerCase() === personName.trim().toLowerCase(),
        );
        nextChanges[entry.date] = {
          ...nextChanges[entry.date],
          personName: personName.trim(),
          ...(entry.title?.trim() ? { title: entry.title } : {}),
          ...(entry.passage?.trim() ? { passage: entry.passage } : {}),
          ...(matchedUser ? { userId: matchedUser.uid } : {}),
        };
      });
      return nextChanges;
    });
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

  const handleScan = async () => {
    if (!scanFile) return;
    setIsScanning(true);
    setScanStatus('uploading');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');
      const formData = new FormData();
      formData.append('file', scanFile);
      formData.append('year', String(currentDate.getFullYear()));
      formData.append('month', String(currentDate.getMonth() + 1));
      setScanStatus('analyzing');
      const response = await fetch('/api/admin/qt-roster/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      setScanStatus('preparing');
      const result = await response.json() as {
        entries?: ScannedRosterEntry[];
        defaults?: { title?: string; passage?: string };
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || 'Could not scan the file.');
      const entries = result.entries || [];
      if (entries.length === 0) {
        toast({ variant: 'destructive', title: t.adminScanNoRows });
        return;
      }
      setScannedEntries(entries);
      applyScannedRow(entries, scanRowPreference);
      setScanFile(null);
      toast({ title: t.adminScanComplete, description: t.adminScanCompleteDesc.replace('{count}', String(entries.length)) });
    } catch (error) {
      console.error('Failed to scan QT roster', error);
      toast({ variant: 'destructive', title: t.adminScanFailed, description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsScanning(false);
      setScanStatus(null);
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
                    <>
                      <Button variant="outline" onClick={handleCancelChanges} disabled={isSavingAll} size="sm">
                        {t.adminCancelDrafts}
                    </Button>
                      <Button onClick={handleBulkSave} disabled={isSavingAll} size="sm">
                        {isSavingAll ? <ButtonSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        {t.adminSaveDrafts.replace('{count}', String(Object.keys(localChanges).length))}
                      </Button>
                    </>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={scanRowPreference}
                    onChange={(event) => {
                      const row = event.target.value as '1' | '2';
                      setScanRowPreference(row);
                      if (scannedEntries.length > 0) applyScannedRow(scannedEntries, row);
                    }}
                    aria-label={t.adminScanRow}
                    className="h-9 rounded-lg border border-input bg-muted px-2 text-xs text-foreground"
                  >
                    <option value="1">{t.adminScanRow1}</option>
                    <option value="2">{t.adminScanRow2}</option>
                  </select>
                  <Input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    aria-label={t.adminScanFile}
                    onChange={(event) => setScanFile(event.target.files?.[0] || null)}
                    className="h-9 w-52 rounded-lg bg-muted text-xs"
                  />
                  <Button variant="outline" size="sm" onClick={handleScan} disabled={!scanFile || isScanning}>
                    {isScanning ? <ButtonSpinner className="mr-2" /> : <FileScan className="mr-2 h-4 w-4" />}
                    {t.adminScan}
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                    {t.adminNextMonth} <ChevronsRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </div>
      </header>

      {isScanning && (
        <div
          className="rounded-xl border border-primary/30 bg-primary/5 p-4"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {scanStatus === 'uploading' ? t.adminScanUploading : scanStatus === 'preparing' ? t.adminScanPreparing : t.adminScanAnalyzing}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t.adminScanPleaseWait}</p>
            </div>
            <span className="text-xs font-medium text-primary">{t.adminScanInProgress}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
            <div className="h-full w-1/3 animate-[scan-progress_1.4s_ease-in-out_infinite] rounded-full bg-primary motion-reduce:animate-none motion-reduce:w-full" />
          </div>
        </div>
      )}

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
