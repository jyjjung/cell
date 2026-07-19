
"use client";

import { PixelAvatar } from '@/components/avatar/PixelAvatar';
import UserSelector from '@/components/chat/UserSelector';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-layout';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { useToast } from '@/hooks/use-toast';
import { useCleaningDays } from '@/hooks/useCleaningDays';
import { useCleaningRoster } from '@/hooks/useCleaningRoster';
import { formatUserDisplayName } from '@/lib/formatting';
import { translations } from '@/lib/translations';
import { cn } from '@/lib/utils';
import type { CleaningRosterEntry, UserProfileData } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth, subMonths } from 'date-fns';
import { ChevronsLeft, ChevronsRight, Edit, Loader2, PlusCircle, Save, Trash2, UserPlus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const daySchema = z.object({ name: z.string().min(1, "Name required.") });
type DayFormValues = z.infer<typeof daySchema>;

function ManageCleaningDays({ t }: { t: (typeof translations)['en'] }) {
    const { cleaningDays, addCleaningDay, updateCleaningDay, deleteCleaningDay } = useCleaningDays();
    const [editingDay, setEditingDay] = useState<{ id: string; name: string } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const form = useForm<DayFormValues>({ resolver: zodResolver(daySchema) });

    const handleAdd = async (data: DayFormValues) => {
        setIsSaving(true);
        try {
            await addCleaningDay(data.name);
            toast({ title: "Duty added" });
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
            toast({ title: "Duty updated" });
            setEditingDay(null);
            form.reset({ name: "" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="space-y-4">
            <h2 className="text-section-title">{t.adminDutyModules}</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                <div className="widget-surface space-y-4">
                    <form onSubmit={form.handleSubmit(editingDay ? handleUpdate : handleAdd)} className="space-y-3">
                        <div className="space-y-2">
                            <label htmlFor="dayName" className="text-micro-label ml-1">
                                {editingDay ? t.adminRenameModule.replace('{name}', editingDay.name) : t.adminModuleName}
                            </label>
                            <Input id="dayName" {...form.register("name")} placeholder="e.g. Wednesday" className="h-10 rounded-lg" />
                            {form.formState.errors.name && <p className="text-micro-label text-destructive ml-1">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={isSaving} size="sm" className="flex-grow">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDay ? <><Save className="h-4 w-4 mr-2" /> {t.adminSaveModule}</> : <><PlusCircle className="h-4 w-4 mr-2" /> {t.adminAddModule}</>)}
                            </Button>
                            {editingDay && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingDay(null); form.reset({ name: "" }); }}>{t.adminCancel}</Button>}
                        </div>
                    </form>
                </div>

                <div className="admin-table-wrap">
                    <Table className="admin-table">
                        <TableHeader className="bg-muted">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead>{t.adminDesignation}</TableHead>
                                <TableHead className="text-right">{t.adminControl}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cleaningDays.map(day => (
                                <TableRow key={day.id} className="group">
                                    <TableCell className="font-medium text-sm">{day.name}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingDay(day); form.setValue("name", day.name); }}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8 opacity-30 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent className="rounded-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-section-title">{t.adminDeleteModule}</AlertDialogTitle>
                                                        <AlertDialogDescription>{t.adminDeleteModuleDesc}</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteCleaningDay(day.id)} className="bg-destructive hover:bg-destructive/90">{t.adminYesDelete}</AlertDialogAction>
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
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

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
        toast({ variant: "destructive", title: "Incomplete", description: `Pick duty and members for ${format(new Date(date), "MMM d")}` });
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
      toast({ title: "Saved", description: format(new Date(date), "MMM d") });
      setLocalChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[date];
        return newChanges;
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Save failed" });
    } finally {
      setSavingStates(prev => ({ ...prev, [date]: false }));
    }
  };
  
  const handleDelete = async (date: string) => {
    if (!rosterMap.has(date)) return;
    try {
        await deleteEntry(date);
        toast({ title: "Entry removed" });
    } catch (error) {
        toast({ variant: "destructive", title: "Purge Error" });
    }
  };

  const loading = rosterLoading || usersLoading || daysLoading;

  return (
    <div className="admin-page">
      <header className="space-y-4">
        <PageHeader title={t.adminCleaningRoster} />
      </header>

      <ManageCleaningDays t={t} />
      
      <Separator className="opacity-50" />

      <section className="space-y-4">
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                <h2 className="text-section-title">{t.adminTimelineView}</h2>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl border border-border/50">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-micro-label px-2">{monthLabel}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex justify-center py-2">
                <ToggleGroup type="multiple" value={selectedDaysOfWeek} onValueChange={(val) => setSelectedDaysOfWeek(val.length > 0 ? val : [])} aria-label="Filter by day of week" className="bg-muted p-1 rounded-xl border border-border/50">
                    {daysOfWeek.map(day => (
                        <ToggleGroupItem key={day.value} value={day.value} className="h-8 w-8 rounded-lg text-xs font-medium transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">{day.label}</ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        </div>

        {loading ? (
            <div className="empty-inline gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="text-micro-label">{t.loading}</p>
            </div>
        ) : (
            <div className="admin-table-wrap">
                <Table className="admin-table">
                    <TableHeader className="bg-muted">
                        <TableRow className="hover:bg-transparent border-white/5">
                            <TableHead className="w-[140px]">{t.adminCleaningDate}</TableHead>
                            <TableHead className="w-[220px]">{t.adminDutyType}</TableHead>
                            <TableHead>{t.adminAssignedTo}</TableHead>
                            <TableHead className="w-[120px] text-right">{t.adminActions}</TableHead>
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
                                <TableRow key={dateStr} className={cn("group transition-colors", isDirty && "bg-primary/5")}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-micro-label">{format(dateObj, 'EEE')}</span>
                                            <span className="text-sm font-semibold">{format(dateObj, 'MMM d')}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={displayData.dayId} onValueChange={(val) => handleFieldChange(dateStr, 'dayId', val)}>
                                            <SelectTrigger className="h-9 rounded-lg bg-muted border-white/5 text-xs"><SelectValue placeholder={t.adminDutyType} /></SelectTrigger>
                                            <SelectContent className="rounded-2xl">
                                                {cleaningDays.map(day => <SelectItem key={day.id} value={day.id} className="rounded-xl">{day.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {assignedUsers.map(user => (
                                                <Badge key={user.uid} variant="secondary" className="pl-1 pr-1 py-0.5 h-7 rounded-md gap-1 border-white/5 bg-muted">
                                                    <div className="h-6 w-6 rounded-full bg-muted border border-white/10 shrink-0">
                                                        <PixelAvatar avatar={user.avatar} />
                                                    </div>
                                                    <span className="text-[10px] font-medium truncate max-w-[80px]">
                                                        {formatUserDisplayName(user)}
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
                                                    <Button variant="outline" size="sm" className="h-8 rounded-lg border-dashed border-white/20 bg-transparent hover:bg-muted px-3">
                                                        <UserPlus className="h-3 w-3 mr-2" />
                                                        <span className="text-micro-label">{t.adminAssign}</span>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
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
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant={isDirty ? "default" : "outline"} onClick={() => handleSave(dateStr)} disabled={isSaving || !canSave} className="h-9 w-9 rounded-lg">
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            </Button>
                                            <Button size="icon" variant="destructive" onClick={() => handleDelete(dateStr)} disabled={!entry} className="h-9 w-9 rounded-lg opacity-30 group-hover:opacity-100 transition-opacity">
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
