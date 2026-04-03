
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { 
  CalendarIcon, 
  Plus, 
  Trash2, 
  MapPin, 
  Type, 
  AlignLeft, 
  Users,
  Clock,
  Pencil,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MultiSelect } from '@/components/ui/multi-select';
import { useRoles } from '@/hooks/use-roles';
import { parseDay } from '@/lib/event-occurrences';
import type { AppInvitation } from '@/types';

const invitationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().optional(),
  dateOptions: z.array(z.string()).min(1, "At least one date option is required"),
  allowedRoleIds: z.array(z.string()).default([]),
});

type InvitationFormValues = z.infer<typeof invitationSchema>;

interface InvitationFormProps {
  invitation?: AppInvitation | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  submitButtonText?: string;
}

export function InvitationForm({
  invitation,
  onSubmit,
  onCancel,
  submitButtonText = "Create Invite"
}: InvitationFormProps) {
  const { roles } = useRoles();
  const [tempDate, setTempDate] = useState<Date | undefined>(new Date());
  const [tempStartTime, setTempStartTime] = useState<string>("");
  const [tempEndTime, setTempEndTime] = useState<string>("");
  const [editingIso, setEditingIso] = useState<string | null>(null);

  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      title: invitation?.title || '',
      description: invitation?.description || '',
      location: invitation?.location || '',
      dateOptions: invitation?.dateOptions || [],
      allowedRoleIds: invitation?.allowedRoleIds || [],
    }
  });

  const roleOptions = roles.map(r => ({ label: r.name, value: r.id }));
  const dateOptions = form.watch('dateOptions');

  const addDate = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    let timeStr = "";
    if (tempStartTime) {
      timeStr = tempEndTime ? `${tempStartTime}-${tempEndTime}` : tempStartTime;
    }
    const iso = timeStr ? `${dateStr} ${timeStr}` : dateStr;
    
    let newOptions = [...dateOptions];
    if (editingIso) {
      const index = newOptions.indexOf(editingIso);
      if (index !== -1) {
        newOptions[index] = iso;
      } else if (!dateOptions.includes(iso)) {
        newOptions.push(iso);
      }
    } else if (!dateOptions.includes(iso)) {
      newOptions.push(iso);
    }
    
    form.setValue('dateOptions', newOptions.sort());
    setTempStartTime("");
    setTempEndTime("");
    setEditingIso(null);
  };

  const startEditDate = (iso: string) => {
    const [d, t] = iso.split(' ');
    setTempDate(new Date(d));
    if (t) {
      const [start, end] = t.split('-');
      setTempStartTime(start);
      setTempEndTime(end || "");
    } else {
      setTempStartTime("");
      setTempEndTime("");
    }
    setEditingIso(iso);
  };

  const removeDate = (iso: string) => {
    form.setValue('dateOptions', dateOptions.filter(d => d !== iso));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Type className="w-4 h-4" /> Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Youth Summer BBQ" {...field} className="rounded-2xl bg-white/5 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Location (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Church Backyard / Zoom" {...field} className="rounded-2xl bg-white/5 border-white/10" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><AlignLeft className="w-4 h-4" /> Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What should people know about this event?" 
                      className="min-h-[120px] rounded-2xl bg-white/5 border-white/10 resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
             <FormField
              control={form.control}
              name="allowedRoleIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Users className="w-4 h-4" /> Who is this for?</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={roleOptions}
                      onChange={field.onChange}
                      selected={field.value}
                      placeholder="Everyone (default)"
                      className="rounded-2xl bg-white/5 border-white/10"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">Leave empty for a public invitation.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Scheduling Options</FormLabel>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 justify-start font-normal h-10 text-xs">
                      <Plus className="mr-2 h-3.5 w-3.5" /> {tempDate ? format(tempDate, 'MMM d') : 'Pick Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-white/10 bg-black/90 backdrop-blur-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={tempDate}
                      onSelect={(d) => setTempDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <div className="relative flex-1">
                  <Input 
                    type="time" 
                    value={tempStartTime}
                    onChange={(e) => setTempStartTime(e.target.value)}
                    className="rounded-2xl bg-white/5 border-white/10 h-10 text-[10px] pl-7 pr-1"
                  />
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                </div>

                <div className="relative flex-1">
                  <Input 
                    type="time" 
                    value={tempEndTime}
                    onChange={(e) => setTempEndTime(e.target.value)}
                    className="rounded-2xl bg-white/5 border-white/10 h-10 text-[10px] pl-7 pr-1"
                  />
                  <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                </div>

                <Button 
                  type="button"
                  onClick={() => {
                    if (editingIso) {
                      const dateStr = tempDate ? format(tempDate, 'yyyy-MM-dd') : "";
                      const timeStr = tempStartTime ? (tempEndTime ? `${tempStartTime}-${tempEndTime}` : tempStartTime) : "";
                      const currentIso = timeStr ? `${dateStr} ${timeStr}` : dateStr;
                      
                      if (currentIso === editingIso) {
                        setEditingIso(null);
                        setTempStartTime("");
                        setTempEndTime("");
                        return;
                      }
                    }
                    if (tempDate) {
                      addDate(tempDate);
                    }
                  }}
                  className={cn(
                    "rounded-2xl h-10 px-4 transition-all",
                    editingIso ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20" : "bg-primary hover:bg-primary/90"
                  )}
                >
                   {editingIso ? (
                     (() => {
                        const dateStr = tempDate ? format(tempDate, 'yyyy-MM-dd') : "";
                        const timeStr = tempStartTime ? (tempEndTime ? `${tempStartTime}-${tempEndTime}` : tempStartTime) : "";
                        const currentIso = timeStr ? `${dateStr} ${timeStr}` : dateStr;
                        return currentIso === editingIso ? 'Close' : 'Update';
                     })()
                   ) : 'Add'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {dateOptions.map((iso) => {
                   const hasTime = iso.includes(' ');
                   const [d, t] = iso.split(' ');
                   return (
                    <div key={iso} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 group hover:border-white/10 transition-all">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                          {format(parseDay(d), 'EEE, MMM d')}
                        </span>
                        {hasTime && (
                           <span className="text-[9px] font-medium text-blue-400 uppercase tracking-tighter">
                             at {t.replace('-', ' - ')}
                           </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => startEditDate(iso)}
                          className={cn(
                            "h-7 w-7 rounded-lg transition-colors",
                            editingIso === iso ? "bg-amber-500/20 text-amber-500" : "hover:bg-white/10"
                          )}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeDate(iso)}
                          className="h-7 w-7 rounded-lg hover:bg-red-500/20 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {dateOptions.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/40 italic p-4 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    No dates added yet. Add at least one to continue.
                  </p>
                )}
              </div>
              <FormMessage>{form.formState.errors.dateOptions?.message}</FormMessage>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={onCancel} className="rounded-2xl px-6 h-10 text-xs">
            Cancel
          </Button>
          <Button type="submit" className="rounded-2xl px-8 h-10 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-xs">
            {submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
