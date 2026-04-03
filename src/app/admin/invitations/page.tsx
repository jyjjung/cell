
"use client";

import { useState } from 'react';
import { useInvitations } from '@/hooks/use-invitations';
import { InvitationForm } from '@/components/admin/invitation-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, MailOpen, Loader2, Calendar, MapPin, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PageHeader } from '@/components/ui/page-layout';
import { Badge } from '@/components/ui/badge';
import type { AppInvitation } from '@/types';

export default function AdminInvitationsPage() {
  const { invitations, addInvitation, updateInvitation, deleteInvitation, loading } = useInvitations();
  const [editingInvitation, setEditingInvitation] = useState<AppInvitation | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const handleCreate = async (data: any) => {
    try {
      await addInvitation(data);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Error creating invitation:", error);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editingInvitation) return;
    try {
      await updateInvitation(editingInvitation.id, data);
      setEditingInvitation(null);
      setIsFormModalOpen(false);
    } catch (error) {
      console.error("Error updating invitation:", error);
    }
  };

  const openEdit = (invite: AppInvitation) => {
    setEditingInvitation(invite);
    setIsFormModalOpen(true);
  };

  const openAdd = () => {
    setEditingInvitation(null);
    setIsFormModalOpen(true);
  };

  return (
    <div className="relative space-y-12 pb-32 max-w-5xl mx-auto px-4 md:px-8 mt-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <PageHeader 
          title="Invitations Hub" 
          description="Create standalone scheduling invites for your community."
          icon={MailOpen}
          accentColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-blue-500 hover:bg-blue-600 rounded-2xl h-12 px-6 shadow-xl shadow-blue-500/20 font-bold uppercase tracking-widest text-xs">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-2xl border-white/10 rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-[0.2em] text-foreground/80 mb-6">
                {editingInvitation ? 'Edit Invitation' : 'Create Invitation'}
              </DialogTitle>
            </DialogHeader>
            <InvitationForm
              invitation={editingInvitation}
              onSubmit={editingInvitation ? handleUpdate : handleCreate}
              onCancel={() => setIsFormModalOpen(false)}
              submitButtonText={editingInvitation ? "Update Invitation" : "Launch Invitation"}
            />
          </DialogContent>
        </Dialog>
      </header>

      <section className="space-y-4">
        {loading ? (
          <div className="h-64 flex items-center justify-center rounded-[2.5rem] bg-white/5 border-2 border-dashed border-white/10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="p-20 text-center bg-white/5 rounded-[2.5rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
              <MailOpen className="h-10 w-10 text-blue-500/40" />
            </div>
            <h3 className="text-xl font-bold mb-2">No active invitations</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              Invitations are standalone scheduling links. Click "Create New Invite" to get started with your first one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {invitations.map((invite) => (
              <div key={invite.id} className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black tracking-tight text-foreground group-hover:text-blue-400 transition-colors">
                      {invite.title}
                    </h3>
                    <Badge variant="outline" className="rounded-full bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-black uppercase px-3 py-1">
                      {Object.keys(invite.responses || {}).length} Response(s)
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {invite.dateOptions.length} Date Options</span>
                    {invite.location && <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {invite.location}</span>}
                    <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {invite.allowedRoleIds?.length || 'Everyone'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => openEdit(invite)}
                    className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-500 border border-white/5 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[2.5rem] bg-black/95 backdrop-blur-2xl border-white/10 shadow-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Delete Invitation?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm">
                          This will permanently delete "{invite.title}" and all its recorded responses. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-3 mt-6">
                        <AlertDialogCancel className="rounded-2xl h-12 px-8">Keep it</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteInvitation(invite.id)}
                          className="bg-red-500 hover:bg-red-600 rounded-2xl h-12 px-8 font-black uppercase tracking-widest text-xs"
                        >
                          Yes, Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
