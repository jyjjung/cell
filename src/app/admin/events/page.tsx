
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useEvents } from '@/hooks/use-events';
import type { AppEvent } from '@/types';
import { EventForm } from '@/components/admin/event-form';
import BatchEventImportForm from '@/components/admin/batch-event-import-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, ListOrdered, Loader2 } from 'lucide-react';
import { startOfDay, format } from 'date-fns';
import { eventIsFullyBefore, parseDay } from '@/lib/event-occurrences';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { translations } from '@/lib/translations';

export default function AdminEventsPage() {
  const { events, addEvent, updateEvent, deleteEvent, loading: eventsLoading } = useEvents();
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeletingPast, setIsDeletingPast] = useState(false);
  const { currentUser } = useAuth();
  const t = translations[currentUser?.preferredLanguage || 'en'];

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
    return { upcomingEvents: upcoming, pastEvents: past.sort((a,b) => parseDay(b.date).getTime() - parseDay(a.date).getTime()) };
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
     <div className="admin-table-wrap">
        <Table className="admin-table">
            <TableHeader>
            <TableRow>
                <TableHead className="min-w-[250px]">{t.titleLabel}</TableHead>
                <TableHead>{t.date}</TableHead>
                <TableHead>{t.adminCategory}</TableHead>
                <TableHead className="text-right">{t.adminActions}</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {eventsToDisplay.map((event) => (
                <TableRow key={event.id}>
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>{format(parseDay(event.date), "dd/MM/yyyy")}</TableCell>
                <TableCell>{event.category}</TableCell>
                <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEditModal(event)} aria-label={t.adminEditEvent}>
                    <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon" aria-label={t.adminYesDelete}>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                        <AlertDialogTitle className="text-section-title">{t.adminDeleteEvent}</AlertDialogTitle>
                        <AlertDialogDescription>{t.adminDeleteEventDesc}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                            try {
                                await deleteEvent(event.id);
                            } catch (error) {
                                console.error("Failed to delete event:", error);
                            }
                            }}
                        >
                            {t.adminYesDelete}
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
    <div className="admin-page">
      <header className="space-y-3">
        <PageHeader 
          title={t.adminManageEvents}
          action={
            <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddModal} size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" /> {t.adminAddEvent}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-section-title">{editingEvent ? t.adminEditEvent : t.adminAddEvent}</DialogTitle>
                </DialogHeader>
                <EventForm
                  event={editingEvent}
                  onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}
                  onCancel={() => {
                    setEditingEvent(null);
                    setIsFormModalOpen(false);
                  }}
                  submitButtonText={editingEvent ? t.adminUpdateEvent : t.adminCreateEvent}
                />
              </DialogContent>
            </Dialog>
          }
        />
      </header>

      <section className="space-y-3">
        <h2 className="text-section-title">{t.adminUpcomingEvents}</h2>
        {eventsLoading ? (
            <div className="empty-inline">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        ) : upcomingEvents.length === 0 ? (
            <EmptyState icon={ListOrdered} title={t.adminNoUpcomingEvents} description={t.adminNoEventsHint} />
        ) : (
            <EventTable eventsToDisplay={upcomingEvents} />
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-section-title">{t.adminMaintenance}</h2>
        <div className="grid md:grid-cols-2 gap-3">
            <div className="widget-surface space-y-3">
                <h3 className="panel-title">{t.adminBatchImport}</h3>
                <p className="panel-subtitle">{t.adminBatchImportDesc}</p>
                <BatchEventImportForm />
            </div>

            <div className="widget-surface space-y-3">
                <h3 className="panel-title">{t.adminDataCleanup}</h3>
                <p className="panel-subtitle">{t.adminDataCleanupDesc}</p>
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeletingPast || eventsLoading}>
                    {isDeletingPast ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    {t.adminCleanPastEvents}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                    <AlertDialogTitle className="text-section-title">{t.adminCleanPastEvents}</AlertDialogTitle>
                    <AlertDialogDescription>{t.adminDeletePastConfirm}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>{t.adminCancel}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePastEvents} disabled={isDeletingPast}>
                        {isDeletingPast ? t.adminDeleting : t.adminYesDelete}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    </section>

      {pastEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-section-title">{t.adminPastEvents}</h2>
           <div className="admin-table-wrap">
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="past-events" className="border-b-0">
                    <AccordionTrigger className="app-card-sm text-sm hover:no-underline">
                        {t.adminViewPastEvents.replace('{count}', String(pastEvents.length))}
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
