
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

export default function AdminQTRosterPage() {
  const { roster, loading: rosterLoading, upsertEntry, deleteEntry } = useQTRoster();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [localChanges, setLocalChanges] = useState<Record<string, Partial<QTRosterEntry>>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  
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
            userId: matchedUser ? matchedUser.uid : null 
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

  const handleSave = async (date: string) => {
    setSavingStates(prev => ({ ...prev, [date]: true }));
    const existingEntry = rosterMap.get(date) || {};
    const changes = localChanges[date] || {};

    const resolvedUserId = changes.userId !== undefined ? changes.userId : (existingEntry.userId || null);

    const dataToSave: Omit<QTRosterEntry, 'id'> = {
        date: date,
        userId: resolvedUserId,
        personName: changes.personName !== undefined ? changes.personName : (existingEntry.personName || ''),
        title: changes.title !== undefined ? changes.title : (existingEntry.title || ''),
        passage: changes.passage !== undefined ? changes.passage : (existingEntry.passage || ''),
    };
    
    if (!dataToSave.personName) {
       toast({ variant: "destructive", title: "Missing Person", description: `Please enter or select a person for ${format(new Date(date), "MMM d")}` });
       setSavingStates(prev => ({ ...prev, [date]: false }));
       return;
    }

    try {
      await upsertEntry(dataToSave);
      setLocalChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[date];
        return newChanges;
      });
      toast({ title: "Sync Successful", description: `Roster for ${format(new Date(date), "MMM d")} updated.` });
    } catch (error) {
      console.error("Failed to save roster entry", error);
      toast({ variant: "destructive", title: "Sync Failed", description: "Database rejected the transmission." });
    } finally {
      setSavingStates(prev => ({ ...prev, [date]: false }));
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
    <div className="max-w-6xl mx-auto space-y-16 pb-24">
      <header className="space-y-6">
        <div className="space-y-2">
            <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none uppercase italic">QT Rota.</h1>
            <div className="flex items-center gap-2 text-primary">
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Spiritual Timeline Management</p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-y border-white/5">
            <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronsLeft className="mr-2 h-4 w-4" /> Previous Phase
            </Button>
            <div className="text-center">
                <h2 className="text-2xl font-black tracking-tighter uppercase">{monthLabel}</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.4em] mt-1">Current Chronos</p>
            </div>
            <Button variant="outline" className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-[10px]" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                Next Phase <ChevronsRight className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </header>

      {loading ? (
        <div className="h-[40vh] flex flex-col items-center justify-center gap-4 opacity-30">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest">Scanning Matrix</p>
        </div>
      ) : (
        <div className="border border-white/5 rounded-[2.5rem] overflow-hidden bg-card/20 backdrop-blur-md">
          <Table>
            <TableHeader className="bg-muted/30">
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
                const isSaving = savingStates[dateStr];
                const isLinked = !!(localChanges[dateStr]?.userId ?? entry?.userId);

                return (
                  <TableRow key={dateStr} className={cn("border-white/5 transition-colors group", isDirty && "bg-primary/5")}>
                    <TableCell className="font-black tracking-tighter">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{format(dateObj, 'EEE')}</span>
                            <span className="text-xl">{format(dateObj, 'MMM d')}</span>
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
                                "h-12 rounded-xl bg-muted/20 border-white/5 transition-all focus:bg-background",
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
                          className="h-12 w-12 shrink-0 rounded-xl"
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
                        className="h-12 rounded-xl bg-muted/20 border-white/5"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={displayData.passage}
                        onChange={(e) => handleFieldChange(dateStr, 'passage', e.target.value)}
                        placeholder="Reference"
                        className="h-12 rounded-xl bg-muted/20 border-white/5 font-mono text-xs font-bold uppercase tracking-widest"
                      />
                    </TableCell>
                    <TableCell className="text-right py-6">
                       <div className="flex justify-end gap-2">
                        <Button 
                            size="icon" 
                            variant={isDirty ? "default" : "outline"} 
                            onClick={() => handleSave(dateStr)} 
                            disabled={isSaving}
                            className="h-12 w-12 rounded-xl"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button 
                            size="icon" 
                            variant="destructive" 
                            onClick={() => handleDelete(dateStr)} 
                            disabled={!entry}
                            className="h-12 w-12 rounded-xl opacity-20 group-hover:opacity-100 transition-opacity"
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
