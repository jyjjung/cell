
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import type { AppEvent } from '@/types';
import { EventForm } from '@/components/admin/event-form';
import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import BatchEventImportForm from '@/components/admin/batch-event-import-form';
import MemoryVerseAdmin from '@/components/admin/memory-verse-admin'; // Import new component
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { PlusCircle, Edit, Trash2, CalendarPlus, ListOrdered, BookHeart, UploadCloud, Trash, Loader2, Brain } from 'lucide-react'; // Added Brain icon
import { Separator } from '@/components/ui/separator';
import { startOfDay, parseISO, format } from 'date-fns';
import { usePageLoading } from '@/contexts/page-loading-context';

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isAdmin && isMounted) { 
      setIsPageLoading(true); 
      router.push('/admin');
    }
  }, [isAdmin, router, isMounted, setIsPageLoading]);


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
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <CalendarPlus className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Manage Events</CardTitle>
            </div>
            <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddModal}>
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
          </div>
        </CardHeader>
        <CardContent className="p-0"> 
          {eventsLoading ? (
            <div className="p-6 text-center flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary mr-2" /><p>Loading events...</p></div>
          ) : events.length === 0 ? (
            <div className="p-6 text-center">
              <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No events yet. Click "Add New Event" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-2 text-xs min-w-[200px]">Title</TableHead>
                  <TableHead className="px-3 py-2 text-xs">Date</TableHead>
                  <TableHead className="px-3 py-2 text-xs">Category</TableHead>
                  <TableHead className="text-right px-3 py-2 text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium px-3 py-1.5">{event.title}</TableCell>
                    <TableCell className="px-3 py-1.5">{format(parseISO(event.date), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="px-3 py-1.5">{event.category}</TableCell>
                    <TableCell className="text-right space-x-1 px-3 py-1.5">
                      <Button variant="outline" size="xs" onClick={() => openEditModal(event)} aria-label="Edit event">
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="xs" aria-label="Delete event">
                            <Trash2 className="h-3 w-3" />
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
          )}
        </CardContent>
      </Card>

      <Separator className="my-12" />

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center space-x-2">
              <UploadCloud className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Batch Import Events</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            <BatchEventImportForm />
        </CardContent>
      </Card>

      <Separator className="my-12" />

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center space-x-2">
              <BookHeart className="h-6 w-6 text-accent" />
              <CardTitle className="text-2xl">Manage Global Bible Reading Plan</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            <BiblePlanAdminForm />
        </CardContent>
      </Card>

      <Separator className="my-12" />

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-green-500" /> {/* Updated Icon */}
              <CardTitle className="text-2xl">Manage Memory Verses</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            <MemoryVerseAdmin />
        </CardContent>
      </Card>
      
      <Separator className="my-12" />

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Trash className="h-6 w-6 text-destructive" />
            <CardTitle className="text-2xl">Data Management</CardTitle>
          </div>
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
  );
}
