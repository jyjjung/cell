
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import type { AppEvent } from '@/types';
import { EventForm } from '@/components/admin/event-form';
import BiblePlanAdminForm from '@/components/admin/bible-plan-admin-form';
import BatchEventImportForm from '@/components/admin/batch-event-import-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Edit, Trash2, CalendarPlus, ListOrdered, BookHeart, UploadCloud } from 'lucide-react';
import EventCard from '@/components/events/event-card'; 
import { Separator } from '@/components/ui/separator';

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const { events, addEvent, updateEvent, deleteEvent, loading: eventsLoading } = useEvents();
  const [isMounted, setIsMounted] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    if (!isAdmin && typeof window !== "undefined") { 
      router.push('/admin');
    }
  }, [isAdmin, router]);

  if (!isMounted || !isAdmin) {
    return <div className="flex justify-center items-center h-64"><p>Loading admin area...</p></div>;
  }

  const handleAddEvent = async (data: AppEvent) => {
    const { id, ...eventDataNoId } = data; // id might be empty string if new
    try {
      await addEvent(eventDataNoId);
      toast({ title: "Event Added", description: `"${data.title}" has been successfully added.` });
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

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    if (window.confirm(`Are you sure you want to delete the event "${eventTitle}"?`)) {
      try {
        await deleteEvent(eventId);
        toast({ title: "Event Deleted", description: `"${eventTitle}" has been successfully deleted.` });
      } catch (error) {
        console.error("Failed to delete event:", error);
        toast({
          title: "Deletion Failed",
          description: `Could not delete event "${eventTitle}". Please try again.`,
          variant: "destructive",
        });
      }
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
              <DialogContent className="sm:max-w-[600px]">
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
          <CardDescription>Add, edit, or remove events for Cell Dates. Events are stored in Firestore.</CardDescription>
        </CardHeader>
      </Card>

      {eventsLoading ? (
         <Card><CardContent className="p-6 text-center"><p>Loading events...</p></CardContent></Card>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ListOrdered className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No events yet. Click "Add New Event" to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="flex flex-col">
              <CardContent className="p-0 flex-grow">
                <EventCard event={event} />
              </CardContent>
              <div className="p-4 border-t flex justify-end space-x-2 bg-background/50">
                  <Button variant="outline" size="sm" onClick={() => openEditModal(event)}>
                    <Edit className="mr-2 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteEvent(event.id, event.title)}
                  >
                    <Trash2 className="mr-2 h-3 w-3" /> Delete
                  </Button>
                </div>
            </Card>
          ))}
        </div>
      )}

      <Separator className="my-12" />

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center space-x-2">
              <UploadCloud className="h-6 w-6 text-primary" /> 
              <CardTitle className="text-2xl">Batch Import Events</CardTitle>
            </div>
          <CardDescription>Quickly add multiple "Snacks" or "QT" events by pasting text. Each event entry should be a date (DD/MM/YYYY) on one line, and the person's name on the next. The first line of the text must be "Snacks:" or "QT:".</CardDescription>
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
          <CardDescription>Generate and set the Bible reading plan for all users. This plan is stored in Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
            <BiblePlanAdminForm />
        </CardContent>
      </Card>

    </div>
  );
}
