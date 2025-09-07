
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import type { AppEvent } from '@/types';
import { EventForm } from '@/components/admin/event-form';
import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import BatchEventImportForm from '@/components/admin/batch-event-import-form';
import MemoryVerseAdmin from '@/components/admin/memory-verse-admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { PlusCircle, Edit, Trash2, ListOrdered, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { startOfDay, parseISO, format, isSameDay } from 'date-fns';
import { usePageLoading } from '@/contexts/page-loading-context';
import { Calendar } from '@/components/ui/calendar';
import { EventCategory } from '@/types';
import { cn } from '@/lib/utils';
import type { DayProps } from 'react-day-picker';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { categoryBackgroundColors, categoryBorderColors, categoryTextColors } from '@/lib/color-utils';


export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { events, addEvent, updateEvent, deleteEvent, loading: eventsLoading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeletingPast, setIsDeletingPast] = useState(false);
  const { toast } = useToast();
  const { setIsPageLoading } = usePageLoading(); 

  // Calendar State
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isAdmin && isMounted) { 
      setIsPageLoading(true); 
      router.push('/admin');
    }
  }, [isAdmin, router, isMounted, setIsPageLoading]);

  // Calendar memoized data
  const eventsByDate = useMemo(() => {
    const map = new Map<string, AppEvent[]>();
    if (!events) return map;
    events.forEach(event => {
      try {
        const eventDateStr = format(parseISO(event.date), 'yyyy-MM-dd');
        if (!map.has(eventDateStr)) {
          map.set(eventDateStr, []);
        }
        map.get(eventDateStr)!.push(event);
      } catch (e) {
        console.error("Error parsing event date for calendar:", event.date, e);
      }
    });
    map.forEach((dayEvents) => {
        dayEvents.sort((a,b) => a.category.localeCompare(b.category));
    });
    return map;
  }, [events]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateStr) || [];
  }, [selectedDate, eventsByDate]);

  // Custom Day for Calendar
  function CustomDay(props: DayProps) {
    const { date, displayMonth } = props;
    const isCurrentMonth = displayMonth.getMonth() === date.getMonth();
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateStr) || [];
    const isToday = isSameDay(date, new Date());

    return (
      <div className={cn("relative flex h-full flex-col p-0.5 border-t border-border/80 text-[10px]",!isCurrentMonth && "bg-muted/30 text-muted-foreground/50",isSameDay(date, selectedDate || new Date(0)) && isCurrentMonth && "bg-accent")}>
        <time dateTime={format(date, 'yyyy-MM-dd')} className={cn("self-start font-semibold p-1 rounded-full", isToday && "flex h-5 w-5 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-xs")}>
          {format(date, 'd')}
        </time>
        {isCurrentMonth && dayEvents.length > 0 && (
          <div className="mt-0.5 flex-grow overflow-y-auto -mx-0.5 px-0.5 space-y-0.5 text-left">
            {dayEvents.slice(0, 2).map((event) => (
              <div key={event.id} className={cn("p-0.5 rounded-sm leading-tight truncate font-medium", categoryBackgroundColors[event.category], categoryTextColors[event.category])}>
                {event.title}
              </div>
            ))}
             {dayEvents.length > 2 && (
              <div className="text-muted-foreground pl-1 pt-0.5">+ {dayEvents.length - 2} more</div>
            )}
          </div>
        )}
      </div>
    );
  }

  const CalendarSkeleton = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3"><Skeleton className="w-full aspect-video" /></div>
      <div className="lg:col-span-1"><Skeleton className="w-full h-48" /></div>
    </div>
  );


  if (!isMounted) { 
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
   if (!isAdmin && isMounted) { 
    return null; 
  }

  const handleUndoAddSingleEvent = async (eventId: string, eventTitle: string) => {
    try {
      await deleteEvent(eventId);
      toast({
        title: "Undo Successful",
        description: `Event "${eventTitle}" has been removed.`,
      });
    } catch (error) {
      toast({
        title: "Undo Failed",
        description: `Could not remove event "${eventTitle}". Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleAddEvent = async (data: AppEvent) => {
    const { id, ...eventDataNoId } = data;
    try {
      const newEventId = await addEvent(eventDataNoId);
      toast({ 
        title: "Event Added", 
        description: `"${data.title}" has been successfully added.`,
        action: (
            <ToastAction altText="Undo add event" onClick={() => handleUndoAddSingleEvent(newEventId, data.title)}>
              Undo
            </ToastAction>
        ),
        duration: 7000, 
      });
      setIsFormModalOpen(false);
    } catch (error) {
       toast({ title: "Error Adding Event", description: `Failed to add "${data.title}". Please try again.`, variant: "destructive" });
    }
  };

  const handleUpdateEvent = async (data: AppEvent) => {
     try {
      await updateEvent(data);
      toast({ title: "Event Updated", description: `"${data.title}" has been successfully updated.` });
      setEditingEvent(null);
      setIsFormModalOpen(false);
    } catch (error) {
      toast({ title: "Error Updating Event", description: `Failed to update "${data.title}". Please try again.`, variant: "destructive" });
    }
  };

  const openEditModal = (event: AppEvent) => {
    setEditingEvent(event);
    setIsFormModalOpen(true);
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setIsFormModalOpen(true);
  };

  const handleDeletePastEvents = async () => {
    setIsDeletingPast(true);
    const today = startOfDay(new Date());
    const pastEventsToDelete = events.filter(event => {
        try {
            const eventDate = parseISO(event.date); 
            return eventDate < today;
        } catch(e) { 
            console.error("Error parsing event date for deletion:", event.date, e);
            return false; 
        }
    });

    if (pastEventsToDelete.length === 0) {
      toast({ title: "No Past Events", description: "There are no past events to delete." });
      setIsDeletingPast(false);
      return;
    }

    try {
      const deletionPromises = pastEventsToDelete.map(event => deleteEvent(event.id));
      const results = await Promise.allSettled(deletionPromises);

      const successfulDeletions = results.filter(result => result.status === 'fulfilled').length;
      const failedDeletions = results.length - successfulDeletions;

      if (successfulDeletions > 0) {
        toast({ title: "Past Events Deleted", description: `${successfulDeletions} past event(s) have been deleted.` });
      }
      if (failedDeletions > 0) {
         toast({ title: "Deletion Error", description: `Failed to delete ${failedDeletions} past event(s). Check console for details.`, variant: "destructive" });
      }
    } catch (error: any) {
      console.error("Error during batch deletion of past events:", error);
      toast({ title: "Error Deleting Past Events", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsDeletingPast(false);
    }
  };


  return (
    <div className="space-y-8">
        <Accordion type="multiple" className="w-full space-y-6" defaultValue={["events-manager"]}>
            <AccordionItem value="events-manager" className="border-b-0">
                <Card>
                    <AccordionTrigger className="p-4 hover:no-underline w-full">
                        <CardHeader className="p-0 flex-row justify-between items-center w-full">
                            <CardTitle className="text-xl">Manage Events</CardTitle>
                             <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={(e) => { e.stopPropagation(); openAddModal(); }} onFocus={(e) => e.stopPropagation()}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
                                </DialogHeader>
                                <EventForm
                                event={editingEvent}
                                onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}
                                onCancel={() => {
                                    setEditingEvent(null);
                                    setIsFormModalOpen(false);
                                }}
                                submitButtonText={editingEvent ? "Update Event" : "Create Event"}
                                />
                            </DialogContent>
                            </Dialog>
                        </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        {eventsLoading ? (
                            <div className="p-6 text-center flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /><p>Loading events...</p></div>
                        ) : events.length === 0 ? (
                            <div className="p-10 text-center bg-muted/50 rounded-lg">
                            <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No events yet. Click "Add New Event" to get started.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead className="min-w-[250px]">Title</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.map((event) => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.title}</TableCell>
                                        <TableCell>{format(parseISO(event.date), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{event.category}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="icon" onClick={() => openEditModal(event)} aria-label="Edit event">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" aria-label="Delete event">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the event titled "{event.title}".
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                onClick={async () => {
                                                    try {
                                                    await deleteEvent(event.id);
                                                    toast({ title: "Event Deleted", description: `"${event.title}" has been successfully deleted.` });
                                                    } catch (error) {
                                                    console.error("Failed to delete event:", error);
                                                    toast({
                                                        title: "Deletion Failed",
                                                        description: `Could not delete event "${event.title}". Please try again.`,
                                                        variant: "destructive",
                                                    });
                                                    }
                                                }}
                                                >
                                                Yes, delete event
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            </div>
                        )}
                    </AccordionContent>
                </Card>
            </AccordionItem>
            
            <AccordionItem value="event-calendar" className="border-b-0">
                <Card>
                    <AccordionTrigger className="p-4 hover:no-underline w-full">
                        <CardHeader className="p-0 flex-row justify-between items-center w-full">
                            <CardTitle className="text-xl">Event Calendar</CardTitle>
                        </CardHeader>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        {eventsLoading ? <CalendarSkeleton /> : (
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                <div className="lg:col-span-3">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        month={month}
                                        onMonthChange={setMonth}
                                        className="p-0 border rounded-md"
                                        classNames={{
                                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-3",
                                            month: "space-y-4 w-full",
                                            table: "w-full border-collapse",
                                            head_row: "flex border-b",
                                            head_cell: "text-muted-foreground w-[14.28%] text-center font-normal text-[0.8rem] py-2",
                                            row: "flex w-full",
                                            cell: "h-20 w-[14.28%] p-0 [&:not(:last-child)]:border-r",
                                            day_button: "h-full w-full p-0 font-normal",
                                            day_selected: "", day_today: "", day_outside: "", day_disabled: "text-muted-foreground opacity-50",
                                        }}
                                        components={{ Day: CustomDay }}
                                    />
                                </div>
                                <div className="lg:col-span-1">
                                    <div className="sticky top-20">
                                        <h3 className="font-semibold text-lg mb-2">{selectedDate ? format(selectedDate, "PPP") : "No date selected"}</h3>
                                        <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-2 border rounded-md p-2">
                                            {selectedDayEvents.length > 0 ? selectedDayEvents.map(event => (
                                                <div key={event.id} className={cn("p-2 rounded-md border-l-4", categoryBorderColors[event.category])}>
                                                    <div className="flex items-start justify-between">
                                                        <p className="font-semibold text-sm">{event.title}</p>
                                                        <div className={cn("text-xs font-medium px-2 py-0.5 rounded-full", categoryBackgroundColors[event.category], categoryTextColors[event.category] )}>{event.category}</div>
                                                    </div>
                                                    {event.details && <p className="text-xs text-muted-foreground mt-1">{event.details}</p>}
                                                </div>
                                            )) : (
                                                <p className="text-muted-foreground text-sm text-center py-4">No events scheduled.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </Accordion>


      <Separator />

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Batch Import Events</CardTitle>
            </CardHeader>
            <CardContent>
                <BatchEventImportForm />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Manage Bible Plan</CardTitle>
            </CardHeader>
            <CardContent>
                <BiblePlanAdminForm />
            </CardContent>
        </Card>
      </div>

      <Separator />

       <div className="grid md:grid-cols-2 gap-8">
         <Card>
            <CardHeader>
                <CardTitle className="text-xl">Manage Memory Verses</CardTitle>
            </CardHeader>
            <CardContent>
                <MemoryVerseAdmin />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="text-xl">Data Management</CardTitle>
                <CardDescription>Perform maintenance tasks like cleaning up old data.</CardDescription>
            </CardHeader>
            <CardContent>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletingPast || eventsLoading}>
                    {isDeletingPast ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Clean Up Past Events
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Deletion of Past Events</AlertDialogTitle>
                    <AlertDialogDescription>
                    Are you sure you want to permanently delete all events that have already occurred? This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePastEvents} disabled={isDeletingPast}>
                    {isDeletingPast ? 'Deleting...' : 'Yes, delete past events'}
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <p className="text-sm text-muted-foreground mt-2">
                This will remove all events from the database whose date is before today.
            </p>
            </CardContent>
        </Card>
      </div>

    </div>
  );
}

    
