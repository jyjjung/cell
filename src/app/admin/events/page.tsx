
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import type { AppEvent } from '@/types';
import { EventForm } from '@/components/admin/event-form';
import BatchEventImportForm from '@/components/admin/batch-event-import-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, ListOrdered, Loader2, Calendar } from 'lucide-react';
import { startOfDay, parseISO, format } from 'date-fns';
import { eventIsFullyBefore } from '@/lib/event-occurrences';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

export default function AdminEventsPage() {
  const { events, addEvent, updateEvent, deleteEvent, loading: eventsLoading } = useEvents();
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeletingPast, setIsDeletingPast] = useState(false);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const today = startOfDay(new Date());
    const upcoming: AppEvent[] = [];
    const past: AppEvent[] = [];
    events.forEach(event => {
      try {
        if (eventIsFullyBefore(event, today)) {
          past.push(event);
        } else {
          upcoming.push(event);
        }
      } catch (e) {
        console.error("Error parsing event date for filtering:", event.date, e);
      }
    });
    return { upcomingEvents: upcoming, pastEvents: past.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()) };
  }, [events]);


  const handleAddEvent = async (data: AppEvent) => {
    const { id, ...eventDataNoId } = data;
    try {
      await addEvent(eventDataNoId);
      setIsFormModalOpen(false);
    } catch (error) {
       console.error("Error Adding Event", error);
    }
  };

  const handleUpdateEvent = async (data: AppEvent) => {
     try {
      await updateEvent(data);
      setEditingEvent(null);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Error Updating Event", error);
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
    
    if (pastEvents.length === 0) {
      setIsDeletingPast(false);
      return;
    }

    try {
      const deletionPromises = pastEvents.map(event => deleteEvent(event.id));
      await Promise.allSettled(deletionPromises);
    } catch (error: any) {
      console.error("Error during batch deletion of past events:", error);
    } finally {
      setIsDeletingPast(false);
    }
  };

  const EventTable = ({ eventsToDisplay }: { eventsToDisplay: AppEvent[] }) => (
     <div className="overflow-x-auto border rounded-lg">
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
            {eventsToDisplay.map((event) => (
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
                            } catch (error) {
                                console.error("Failed to delete event:", error);
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
  );


  return (
    <div className="space-y-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Manage Events</h1>
        </div>
        <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
            <DialogTrigger asChild>
            <Button onClick={openAddModal}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Event
            </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
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
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Upcoming Events</h2>
        {eventsLoading ? (
            <div className="h-40 flex items-center justify-center rounded-lg bg-muted/50 border-2 border-dashed">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : upcomingEvents.length === 0 ? (
            <div className="p-10 text-center bg-muted/50 rounded-lg border-2 border-dashed flex flex-col items-center justify-center h-40">
              <ListOrdered className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="font-semibold">No upcoming events</h3>
              <p className="text-muted-foreground text-sm">Click "Add New Event" to get started.</p>
            </div>
        ) : (
            <EventTable eventsToDisplay={upcomingEvents} />
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Maintenance</h2>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4 border rounded-lg p-6">
                <h3 className="text-lg font-semibold">Batch Import Events</h3>
                <p className="text-sm text-muted-foreground">Quickly add multiple events from a formatted text or a snack rota.</p>
                <BatchEventImportForm />
            </div>

            <div className="space-y-4 border rounded-lg p-6">
                <h3 className="text-lg font-semibold">Data Management</h3>
                <p className="text-sm text-muted-foreground">Perform tasks like cleaning up old data.</p>
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
                <p className="text-xs text-muted-foreground">
                This removes events that have no occurrences on or after today (including finished recurring series).
                </p>
            </div>
        </div>
    </section>

      {pastEvents.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">Past Events</h2>
           <div className="border rounded-lg">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="past-events" className="border-b-0">
                    <AccordionTrigger className="px-6 text-base hover:no-underline">
                        View {pastEvents.length} Past Event(s)
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                        <EventTable eventsToDisplay={pastEvents} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
           </div>
        </section>
      )}

    </div>
  );
}
