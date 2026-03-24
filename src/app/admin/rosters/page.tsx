
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRosterDefinitions } from '@/hooks/useRosterDefinitions';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Trash2, PlusCircle, Edit, Lock, CalendarIcon, List, UserCheck, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useCustomRoster } from '@/hooks/useCustomRoster';
import type { RosterDefinition, CustomRosterEntry, RosterVisibility, RosterAssignment } from '@/types';
import { useRoles } from '@/hooks/use-roles';
import { useAllUsers } from '@/hooks/use-all-users';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import UserSelector from '@/components/chat/UserSelector';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


// --- PERMISSIONS DIALOG (Unchanged) ---
function RosterPermissionsDialog({
    definition,
    isOpen,
    onOpenChange,
    onSave,
}: {
    definition: RosterDefinition | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, visibility: RosterVisibility) => Promise<void>;
}) {
    const { allUsers, loading: usersLoading } = useAllUsers();
    const { roles, loading: rolesLoading } = useRoles();
    const [visibilityType, setVisibilityType] = useState<'public' | 'private'>('public');
    const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
    const [allowedRoleIds, setAllowedRoleIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && definition) {
            const vis = definition.visibility;
            setVisibilityType(vis?.type || 'public');
            setAllowedUserIds(vis?.allowedUserIds || []);
            setAllowedRoleIds(vis?.allowedRoleIds || []);
        }
    }, [isOpen, definition]);

    const handleSave = async () => {
        if (!definition) return;
        setIsSaving(true);
        const newVisibility: RosterVisibility = {
            type: visibilityType,
            ...(visibilityType === 'private' && {
                allowedUserIds,
                allowedRoleIds,
            }),
        };
        await onSave(definition.id, newVisibility);
        setIsSaving(false);
        onOpenChange(false);
    };
    
    const roleOptions: MultiSelectItem[] = useMemo(() => 
      roles.map(role => ({ value: role.id, label: role.name })), 
      [roles]
    );

    const loading = usersLoading || rolesLoading;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Permissions for "{definition?.name}"</DialogTitle>
                    <DialogDescription>
                        Control who can view this roster. By default, all rosters are public.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    <RadioGroup value={visibilityType} onValueChange={(v) => setVisibilityType(v as 'public' | 'private')}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="public" id="r-public" />
                            <Label htmlFor="r-public">Public (Visible to everyone)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="private" id="r-private" />
                            <Label htmlFor="r-private">Private (Visible to selected users/roles)</Label>
                        </div>
                    </RadioGroup>

                    {visibilityType === 'private' && (
                        <div className="space-y-4 pt-4 border-t">
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    <div className="space-y-2">
                                        <Label>Allowed Roles</Label>
                                        <MultiSelect
                                            options={roleOptions}
                                            selected={allowedRoleIds}
                                            onChange={setAllowedRoleIds}
                                            placeholder="Select roles..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Allowed Users</Label>
                                        <UserSelector
                                            users={allUsers.filter(u => u.firstName)}
                                            loading={usersLoading}
                                            selectedUsers={allowedUserIds}
                                            onSelectionChange={setAllowedUserIds}
                                            selectionMode="multiple"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Permissions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ManageRosterDefinitions({ onSelectRoster }: { onSelectRoster: (id: string | null) => void }) {
    const { definitions, loading, addDefinition, updateDefinition, deleteDefinition, updateDefinitionVisibility } = useRosterDefinitions();
    const [editingDef, setEditingDef] = useState<RosterDefinition | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const definitionSchema = z.object({ name: z.string().min(1, "Roster name cannot be empty.") });
    const definitionForm = useForm<z.infer<typeof definitionSchema>>({
        resolver: zodResolver(definitionSchema),
        defaultValues: { name: "" },
    });
    const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
    const [editingPermissionsDef, setEditingPermissionsDef] = useState<RosterDefinition | null>(null);

    const handleAdd = async (data: {name: string}) => {
        setIsSaving(true);
        try {
            await addDefinition(data.name);
            toast({ title: "Roster Type Added" });
            definitionForm.reset({ name: "" });
        } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
        finally { setIsSaving(false); }
    };

    const handleUpdate = async (data: {name: string}) => {
        if (!editingDef) return;
        setIsSaving(true);
        try {
            await updateDefinition(editingDef.id, data.name);
            toast({ title: "Roster Type Updated" });
            setEditingDef(null);
            definitionForm.reset({ name: "" });
        } catch (e: any) { toast({ variant: "destructive", title: "Error", description: e.message }); }
        finally { setIsSaving(false); }
    };

    const handleSavePermissions = async (id: string, visibility: RosterVisibility) => {
      try {
          await updateDefinitionVisibility(id, visibility);
          toast({ title: "Permissions Updated" });
      } catch (e: any) {
          toast({ variant: "destructive", title: "Error", description: e.message });
      }
    };

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Manage Roster Types</h2>
            <div className="p-6 border rounded-lg max-w-2xl space-y-6">
                <Form {...definitionForm}>
                    <form onSubmit={definitionForm.handleSubmit(editingDef ? handleUpdate : handleAdd)} className="flex items-end gap-2">
                        <FormField
                            control={definitionForm.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormLabel className="text-sm font-medium">{editingDef ? `Editing "${editingDef.name}"` : "New Roster Type Name"}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Ushers Roster" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDef ? <Edit className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />)}</Button>
                        {editingDef && <Button type="button" variant="outline" onClick={() => { setEditingDef(null); definitionForm.reset({ name: "" }); }}>Cancel</Button>}
                    </form>
                </Form>

                {loading ? <Loader2 className="animate-spin" /> : (
                    <div className="border rounded-lg overflow-hidden">
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {definitions.map(def => (
                                    <TableRow key={def.id}>
                                        <TableCell>
                                          <div className="flex items-center">
                                            <Button variant="link" onClick={() => onSelectRoster(def.id)} className="p-0 h-auto">{def.name}</Button>
                                            {def.visibility?.type === 'private' && <Lock className="h-3 w-3 ml-2 text-muted-foreground" />}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingPermissionsDef(def); setIsPermissionsOpen(true); }}><Lock className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => { setEditingDef(def); definitionForm.setValue("name", def.name); }}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the "{def.name}" roster and all its entries.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteDefinition(def.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
            <RosterPermissionsDialog
                isOpen={isPermissionsOpen}
                onOpenChange={setIsPermissionsOpen}
                definition={editingPermissionsDef}
                onSave={handleSavePermissions}
            />
        </section>
    );
}

const rosterEntrySchema = z.object({
  date: z.date({ required_error: "A date is required." }),
  time: z.string().optional(),
  assignments: z.array(
    z.object({
      person: z.string().min(1, "Person's name is required."),
      duty: z.string().min(1, "Duty is required."),
      userId: z.string().nullable().optional(),
    })
  ).min(1, "At least one assignment is required."),
});

type RosterEntryFormValues = z.infer<typeof rosterEntrySchema>;

function RosterEntryForm({
  rosterDef,
  entry,
  onFinished,
}: {
  rosterDef: RosterDefinition;
  entry?: CustomRosterEntry | null;
  onFinished: () => void;
}) {
  const { addEntry, updateEntry } = useCustomRoster(rosterDef.id);
  const { allUsers, loading: usersLoading } = useAllUsers();
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<number | null>(null);

  const form = useForm<RosterEntryFormValues>({
    resolver: zodResolver(rosterEntrySchema),
    defaultValues: entry ? { ...entry, date: parseISO(entry.date) } : { date: new Date(), time: '', assignments: [{ person: '', duty: '', userId: null }] },
  });
  const { fields, append, remove, update } = useFieldArray({ control: form.control, name: 'assignments' });
  
  const otherUsers = useMemo(() => allUsers.filter(u => u.firstName), [allUsers]);

  const handlePersonNameChange = (index: number, name: string) => {
    const matchedUser = otherUsers.find(u => `${u.firstName} ${u.lastName}`.trim().toLowerCase() === name.trim().toLowerCase());
    update(index, {
      ...fields[index],
      person: name,
      userId: matchedUser ? matchedUser.uid : null,
    });
  };

  const handleUserSelected = (index: number, uids: string[]) => {
    if (uids.length > 0) {
      const selectedUser = otherUsers.find(u => u.uid === uids[0]);
      if (selectedUser) {
        update(index, {
          ...fields[index],
          person: `${selectedUser.firstName} ${selectedUser.lastName}`.trim(),
          userId: selectedUser.uid,
        });
      }
    }
    setIsSelectorOpen(false);
    setEditingAssignmentIndex(null);
  };


  async function handleSubmit(data: RosterEntryFormValues) {
    setIsLoading(true);
    const entryData = {
      date: data.date.toISOString().split('T')[0], // Store as YYYY-MM-DD
      time: data.time,
      assignments: data.assignments,
    };
    try {
      if (entry) {
        await updateEntry(entry.id, entryData, rosterDef.name);
      } else {
        await addEntry(entryData, rosterDef.name);
      }
      onFinished();
    } catch (e) {
      console.error("Failed to save roster entry", e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control} name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover modal={isMobile}>
                  <PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
          <FormField control={form.control} name="time" render={({ field }) => (
            <FormItem><FormLabel>Time (Optional)</FormLabel><FormControl><Input placeholder="e.g. 9:30 AM" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div>
          <FormLabel>Assignments</FormLabel>
          <div className="space-y-3 mt-2">
            {fields.map((field, index) => {
              const isLinked = !!field.userId;
              return (
              <div key={field.id} className="flex items-end gap-2">
                 <div className="flex items-center gap-2 flex-grow">
                  <div className="relative w-full">
                    <FormField control={form.control} name={`assignments.${index}.person`} render={({ field: formField }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input
                            placeholder="Person's Name"
                            {...formField}
                            onChange={(e) => handlePersonNameChange(index, e.target.value)}
                            className={cn(isLinked && "pr-8 border-green-500/50 focus-visible:ring-green-500/50")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    {isLinked && (
                      <UserCheck 
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" 
                        aria-label="User is linked"
                      />
                    )}
                  </div>
                   <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingAssignmentIndex(index);
                        setIsSelectorOpen(true);
                      }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                </div>

                <FormField control={form.control} name={`assignments.${index}.duty`} render={({ field: formField }) => (
                  <FormItem className="flex-grow"><FormControl><Input placeholder="Assigned Duty" {...formField} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )})}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ person: '', duty: '', userId: null })}><PlusCircle className="mr-2 h-4 w-4" />Add Person</Button>
          </div>
          <FormMessage>{form.formState.errors.assignments?.root?.message}</FormMessage>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onFinished}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Entry"}</Button>
        </DialogFooter>
      </form>
    </Form>
    <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
      <DialogContent>
        <DialogHeader>
            <DialogTitle>Select a User</DialogTitle>
            <DialogDescription>Link this assignment to a registered user.</DialogDescription>
        </DialogHeader>
        {editingAssignmentIndex !== null && (
          <UserSelector
            users={otherUsers}
            loading={usersLoading}
            selectedUsers={[]}
            onSelectionChange={(uids) => handleUserSelected(editingAssignmentIndex, uids)}
            selectionMode="single"
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

function RosterEntryManagement({ rosterDef }: { rosterDef: RosterDefinition }) {
  const { roster, loading, deleteEntry } = useCustomRoster(rosterDef.id);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CustomRosterEntry | null>(null);

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [roster]);

  return (
    <section className="space-y-4 mt-12">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Editing: {rosterDef.name}</h2>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEntry(null); setIsFormOpen(true); }}><PlusCircle className="mr-2 h-4 w-4" /> Add Entry</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingEntry ? 'Edit' : 'Add'} Roster Entry</DialogTitle>
              <DialogDescription>Fill in the details for this roster assignment.</DialogDescription>
            </DialogHeader>
            <RosterEntryForm rosterDef={rosterDef} entry={editingEntry} onFinished={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (<div className="h-60 flex items-center justify-center rounded-lg bg-muted/50 border-2 border-dashed"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : sortedRoster.length === 0 ? (
        <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-40">
          <List className="h-10 w-10 text-muted-foreground mb-3" />
          <h3 className="font-semibold">No Entries Yet</h3>
          <p className="text-muted-foreground text-sm">Click "Add Entry" to create the first one.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Assignments</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {sortedRoster.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium whitespace-nowrap">{format(parseISO(entry.date), 'EEE, MMM d, yyyy')}{entry.time && `, ${entry.time}`}</TableCell>
                  <TableCell>
                    <ul className="space-y-1">
                      {entry.assignments.map((a, i) => (
                        <li key={i}><span className="font-semibold">{a.person}:</span> {a.duty}</li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingEntry(entry); setIsFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <AlertDialog><AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger><AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this roster entry for {format(parseISO(entry.date), 'MMM d')}.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteEntry(entry.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent></AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

export default function AdminOtherRostersPage() {
    const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
    const { definitions } = useRosterDefinitions();
    const selectedRosterDef = useMemo(() => definitions.find(d => d.id === selectedRosterId), [definitions, selectedRosterId]);

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Manage Other Rosters</h1>
            </header>
            <ManageRosterDefinitions onSelectRoster={setSelectedRosterId} />
            {selectedRosterDef && (
                <>
                    <Separator />
                    <RosterEntryManagement rosterDef={selectedRosterDef} />
                </>
            )}
        </div>
    );
}

    

    