
"use client";

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, Save, ChevronsLeft, ChevronsRight, PlusCircle, Edit, ListTodo, UserPlus, X } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addMonths, subMonths, getDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import UserSelector from '@/components/chat/UserSelector';
import { useAllUsers } from '@/hooks/use-all-users';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { PixelAvatar } from '@/components/avatar/PixelAvatar';

const daySchema = z.object({ name: z.string().min(1, "Name required.") });
type DayFormValues = z.infer<typeof daySchema>;

function ManageCleaningDays() {
    const { cleaningDays, loading, addCleaningDay, updateCleaningDay, deleteCleaningDay } = useCleaningDays();
    const [editingDay, setEditingDay] = useState<{ id: string; name: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const form = useForm<DayFormValues>({ resolver: zodResolver(daySchema) });

    const handleAdd = async (data: DayFormValues) => {
        setIsSaving(true);
        try {
            await addCleaningDay(data.name);
            toast({ title: "Module Added" });
            form.reset({ name: "" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (data: DayFormValues) => {
        if (!editingDay) return;
        setIsSaving(true);
        try {
            await updateCleaningDay(editingDay.id, data.name);
            toast({ title: "Module Re-synced" });
            setEditingDay(null);
            form.reset({ name: "" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tighter uppercase">Duty Modules.</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Classification Types</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="p-8 border border-white/5 rounded-[2.5rem] bg-card/20 backdrop-blur-md space-y-6">
                    <form onSubmit={form.handleSubmit(editingDay ? handleUpdate : handleAdd)} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="dayName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                                {editingDay ? `Renaming: ${editingDay.name}` : "Module Name"}
                            </label>
                            <Input id="dayName" {...form.register("name")} placeholder="e.g. Wednesday Refresh" className="h-14 rounded-2xl bg-background/50 border-2" />
                            {form.formState.errors.name && <p className="text-[10px] font-black text-destructive uppercase tracking-widest ml-1">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSaving} className="h-14 rounded-2xl flex-grow font-black uppercase tracking-widest text-[10px]">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDay ? <><Save className="h-4 w-4 mr-2" /> Commit</> : <><PlusCircle className="h-4 w-4 mr-2" /> Initialize Module</>)}
                            </Button>
                            {editingDay && <Button type="button" variant="ghost" className="h-14 rounded-2xl px-6 font-black uppercase tracking-widest text-[10px]" onClick={() => { setEditingDay(null); form.reset({ name: "" }); }}>Abort</Button>}
                        </div>
                    </form>
                </div>

                <div className="border border-white/5 rounded-[2.5rem] overflow-hidden bg-card/20 backdrop-blur-md">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="font-black uppercase tracking-widest text-[10px]">Designation</TableHead>
                                <TableHead className="text-right font-black uppercase tracking-widest text-[10px]">Control</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cleaningDays.map(day => (
                                <TableRow key={day.id} className="border-white/5 group">
                                    <TableCell className="py-4 font-black tracking-tight uppercase text-sm">{day.name}</TableCell>
                                    <TableCell className="text-right py-4">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={() => { setEditingDay(day); form.setValue("name", day.name); }}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-10 w-10 rounded-xl opacity-20 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-[2.5rem]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase">Purge Module?</AlertDialogTitle>
                                                        <AlertDialogDescription className="font-medium">Terminating "{day.name}" will orphan existing schedule points linked to this classification.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="rounded-2xl h-12 font-bold">Abort</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteCleaningDay(day.id)} className="rounded-2xl h-12 font-black bg-destructive hover:bg-destructive/90">Execute Purge</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </section>
    );
}

const daysOfWeek = [
  { label: "S", value: "0" }, { label: "M", value: "1" }, { label: "T", value: "2" },
  { label: "W", value: "3" }, { label: "T", value: "4" }, { label: "F", value: "5" }, { label: "S", value: "6" },
];

export default function AdminCleaningRosterPage() {
  const { roster, loading: rosterLoading, upsertEntry, deleteEntry } = useCleaningRoster();
  const { allUsers, loading: usersLoading } = useAllUsers();
  const { cleaningDays, loading: daysLoading } = useCleaningDays();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<string[]>(['0', '1', '2', '3', '4', '5', '6']);
  const [localChanges, setLocalChanges] = useState<Record<string, Partial<CleaningRosterEntry>>>({});
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u])), [allUsers]);

  const { monthDates, monthLabel } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return {
      monthDates: eachDayOfInterval({ start, end }),
      monthLabel: format(currentDate, 'MMMM yyyy'),
    };
  }, [currentDate]);

  const filteredMonthDates = useMemo(() => {
    if (selectedDaysOfWeek.length === 7) return monthDates;
    return monthDates.filter(date => selectedDaysOfWeek.includes(String(getDay(date))));
  }, [monthDates, selectedDaysOfWeek]);

  const rosterMap = useMemo(() => new Map(roster.map(entry => [entry.date, entry])), [roster]);

  const handleFieldChange = (date: string, field: keyof CleaningRosterEntry, value: any) => {
    setLocalChanges(prev => ({
      ...prev,
      [date]: { ...prev[date], [field]: value },
    }));
  };

  const handleSave = async (date: string) => {
    setSavingStates(prev => ({ ...prev, [date]: true }));
    const existingEntry = rosterMap.get(date);
    const changes = localChanges[date];

    if (!changes || (!changes.dayId && !existingEntry?.dayId) || (!changes.assignedUserIds && !existingEntry?.assignedUserIds)) {
        toast({ variant: "destructive", title: "Incomplete Parameters", description: `Identify identity pool and module for ${format(new Date(date), "MMM d")}` });
        setSavingStates(prev => ({ ...prev, [date]: false }));
        return;
    }

    const dataToSave: Omit<CleaningRosterEntry, 'id' | 'updatedAt' | 'isCompleted'> = {
        date: date,
        dayId: changes.dayId ?? existingEntry!.dayId,
        assignedUserIds: changes.assignedUserIds ?? existingEntry!.assignedUserIds,
    };

    try {
      await upsertEntry(dataToSave);
      toast({ title: "Sync Successful", description: `Timeline updated for ${format(new Date(date), "MMM d")}.` });
      setLocalChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[date];
        return newChanges;
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Sync Error", description: "Database rejected the transmission." });
    } finally {
      setSavingStates(prev => ({ ...prev, [date]: false }));
    }
  };
  
  const handleDelete = async (date: string) => {
    if (!rosterMap.has(date)) return;
    try {
        await deleteEntry(date);
        toast({ title: "Temporal Point Purged" });
    } catch (error) {
        toast({ variant: "destructive", title: "Purge Error" });
    }
  };

  const loading = rosterLoading || usersLoading || daysLoading;

  return (
    <div className="max-w-6xl mx-auto space-y-24 pb-24">
      <header className="space-y-6">
        <div className="space-y-2">
            <h1 className="text-2xl sm:text-2xl font-black tracking-tighter leading-none uppercase italic">Service Rota.</h1>
            <div className="flex items-center gap-2 text-green-500">
                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                <p className="text-[10px] font-black tracking-[0.3em] uppercase opacity-70">Sanctuary Maintenance Command</p>
            </div>
        </div>
      </header>

      <ManageCleaningDays />
      
      <Separator className="opacity-50" />

      <section className="space-y-12">
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black tracking-tighter uppercase">Timeline View.</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Schedule Orchestration</p>
                </div>
                <div className="flex items-center gap-4 bg-muted/20 p-1.5 rounded-2xl border border-white/5">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-black uppercase tracking-widest px-4">{monthLabel}</span>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex justify-center py-4">
                <ToggleGroup type="multiple" value={selectedDaysOfWeek} onValueChange={(val) => setSelectedDaysOfWeek(val.length > 0 ? val : [])} aria-label="Filter by day of week" className="bg-muted/20 p-1.5 rounded-2xl border border-white/5">
                    {daysOfWeek.map(day => (
                        <ToggleGroupItem key={day.value} value={day.value} className="h-10 w-10 rounded-xl font-black text-xs transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{day.label}</ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        </div>

        {loading ? (
            <div className="h-[40vh] flex flex-col items-center justify-center gap-4 opacity-30">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Compiling Timeline</p>
            </div>
        ) : (
            <div className="border border-white/5 rounded-[2.5rem] overflow-hidden bg-card/20 backdrop-blur-md">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="w-[140px] font-black uppercase tracking-widest text-[10px]">Spatial Date</TableHead>
                            <TableHead className="w-[220px] font-black uppercase tracking-widest text-[10px]">Module Type</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px]">Assigned Identities</TableHead>
                            <TableHead className="w-[120px] text-right font-black uppercase tracking-widest text-[10px]">Control</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMonthDates.map(dateObj => {
                            const dateStr = format(dateObj, 'yyyy-MM-dd');
                            const entry = rosterMap.get(dateStr);
                            const localData = localChanges[dateStr] || {};
                            
                            const displayData = {
                                dayId: localData.dayId ?? entry?.dayId ?? '',
                                assignedUserIds: localData.assignedUserIds ?? entry?.assignedUserIds ?? [],
                            };

                            const assignedUsers = displayData.assignedUserIds.map(uid => usersMap.get(uid)).filter(Boolean) as UserProfileData[];

                            const isDirty = !!localChanges[dateStr];
                            const isSaving = savingStates[dateStr];
                            const canSave = displayData.dayId && displayData.assignedUserIds.length > 0;

                            return (
                                <TableRow key={dateStr} className={cn("border-white/5 group transition-colors", isDirty && "bg-primary/5")}>
                                    <TableCell className="font-black tracking-tighter">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{format(dateObj, 'EEE')}</span>
                                            <span className="text-xl">{format(dateObj, 'MMM d')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={displayData.dayId} onValueChange={(val) => handleFieldChange(dateStr, 'dayId', val)}>
                                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-white/5"><SelectValue placeholder="Identify Module" /></SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                {cleaningDays.map(day => <SelectItem key={day.id} value={day.id} className="rounded-xl">{day.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {assignedUsers.map(user => (
                                                <Badge key={user.uid} variant="secondary" className="pl-1 pr-1 py-0.5 h-8 rounded-lg gap-1 border-white/5 bg-muted/30">
                                                    <div className="h-6 w-6 rounded-md overflow-hidden bg-muted border border-white/10 shrink-0">
                                                        <PixelAvatar avatar={user.avatar} />
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[80px]">
                                                        {user.firstName}
                                                    </span>
                                                    <button 
                                                        onClick={() => {
                                                            const newList = displayData.assignedUserIds.filter(id => id !== user.uid);
                                                            handleFieldChange(dateStr, 'assignedUserIds', newList);
                                                        }}
                                                        className="hover:text-destructive transition-colors p-0.5 opacity-40 hover:opacity-100"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                            
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-dashed border-white/20 bg-transparent hover:bg-muted/20 px-3">
                                                        <UserPlus className="h-3 w-3 mr-2" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Assign</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-0 rounded-3xl overflow-hidden border-white/5 bg-card/95 backdrop-blur-2xl shadow-2xl" align="start">
                                                    <UserSelector
                                                        users={allUsers.filter(u => u.firstName)}
                                                        loading={usersLoading}
                                                        selectedUsers={displayData.assignedUserIds}
                                                        onSelectionChange={(val) => handleFieldChange(dateStr, 'assignedUserIds', val)}
                                                        selectionMode="multiple"
                                                        height="h-[300px]"
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-6">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant={isDirty ? "default" : "outline"} onClick={() => handleSave(dateStr)} disabled={isSaving || !canSave} className="h-12 w-12 rounded-xl">
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={() => handleDelete(dateStr)} disabled={!entry} className="h-12 w-12 rounded-xl opacity-20 group-hover:opacity-100 transition-opacity">
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
      </section>
    </div>
  );
}
