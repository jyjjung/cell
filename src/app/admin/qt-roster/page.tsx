
"use client";

import { useState, useMemo } from 'react';
import { useQTRoster } from '@/hooks/useQTRoster';
import { useAllUsers } from '@/hooks/use-all-users';
import type { QTRosterEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Trash2, Save, ChevronsLeft, ChevronsRight, Users, UserCheck, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths } from 'date-fns';
import UserSelector from '@/components/chat/UserSelector';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/ui/page-layout';

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
        toast({ title: "Sync Successful", description: `All roster drafts committed.` });
    } catch (error) {
        console.error("Failed to save roster entry", error);
        toast({ variant: "destructive", title: "Sync Failed", description: "Database rejected the transmission." });
    } finally {
        setIsSavingAll(false);
    }
  };

  const handleDelete = async (date: string) => {
    if (!rosterMap.has(date)) return;
    try {
        await deleteEntry(date);
        toast({ title: "Entry Purged", description: `Roster entry for ${format(new Date(date), "MMM d")} removed.` });
    } catch (error) {
        console.error("Failed to delete roster entry", error);
        toast({ variant: "destructive", title: "Purge Failed", description: "Could not remove the entry." });
    }
  };

  const loading = rosterLoading || usersLoading;

  return (
    <div className="admin-page">
      <header className="space-y-4">
        <PageHeader
          title="QT Rota"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-y border-white/5">
            <div className="flex items-center gap-4">
                <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                    <ChevronsLeft className="mr-2 h-4 w-4" /> Prev. Month
                </Button>
                <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => setViewMode(viewMode === 'timeline' ? 'grid' : 'timeline')}>
                    {viewMode === 'timeline' ? 'Switch to Grid' : 'Switch to Timeline'}
                </Button>
            </div>
            <div className="text-center">
                <h2 className="text-2xl font-black tracking-tighter uppercase">{monthLabel}</h2>
            </div>
            <div className="flex items-center gap-4">
                {Object.keys(localChanges).length > 0 && (
                    <Button variant="primary" onClick={handleBulkSave} disabled={isSavingAll} className="h-14 rounded-2xl px-6 font-black whitespace-nowrap shadow-xl shadow-primary/20">
                        {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save ({Object.keys(localChanges).length} Drafts)
                    </Button>
                )}
                <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                    Next Month <ChevronsRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        </div>
      </header>

      {loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 opacity-30">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest">Scanning Matrix</p>
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
                    <div key={dateStr} className={cn("p-6 rounded-[2.5rem] bg-card/20 backdrop-blur-md border border-white/5 space-y-4", isDirty && "ring-2 ring-primary bg-primary/5")}>
                         <div className="flex justify-between items-center">
                             <div className="flex flex-col">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{format(dateObj, 'EEE')}</span>
                                 <span className="text-xl font-black tracking-tighter">{format(dateObj, 'MMM d')}</span>
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
                                 placeholder="Identity..."
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
                                placeholder="Message Theme"
                                className="h-10 rounded-xl bg-muted border-white/5 text-xs"
                             />
                             <Input
                                value={displayData.passage}
                                onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                                placeholder="Passage"
                                className="h-10 rounded-xl bg-muted border-white/5 font-mono text-[10px] uppercase tracking-widest"
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
                <TableHead className="w-[120px] font-black uppercase tracking-widest text-[10px]">Temporal Point</TableHead>
                <TableHead className="w-[300px] font-black uppercase tracking-widest text-[10px]">Assigned Identity</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">Message Title</TableHead>
                <TableHead className="font-black uppercase tracking-widest text-[10px]">Passage</TableHead>
                <TableHead className="w-[120px] text-right font-black uppercase tracking-widest text-[10px]">Actions</TableHead>
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
                    <TableCell className="font-black tracking-tighter">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{format(dateObj, 'EEE')}</span>
                            <span className="text-sm font-semibold">{format(dateObj, 'MMM d')}</span>
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                          <Input
                            value={displayData.personName}
                            onChange={(e) => handlePersonNameChange(dateStr, e.target.value)}
                            placeholder="Type or select identity..."
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
                        placeholder="Theme"
                        className="h-9 rounded-lg bg-muted border-white/5 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={displayData.passage}
                        onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                        placeholder="Reference"
                        className="h-9 rounded-lg bg-muted border-white/5 font-mono text-[11px] uppercase tracking-wide"
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
        <DialogContent className="rounded-[2.5rem]">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter uppercase">Identify Community Member</DialogTitle>
                <DialogDescription className="font-medium">Linking this temporal point to a registered identification profile.</DialogDescription>
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
