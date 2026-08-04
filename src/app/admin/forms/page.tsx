'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { FormDefinition } from '@/types/forms';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { toMillisSafe } from '@/lib/firestore-timestamp';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, Copy, Inbox, Pencil, Plus, Trash2 } from 'lucide-react';

export default function AdminFormsListPage() {
  const { isAdmin, loadingAuth } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadForms = async () => {
    setLoading(true);
    try {
      const headers = await getClientAuthHeaders();
      const res = await fetch('/api/forms/admin/definitions', { headers });
      if (!res.ok) throw new Error('Failed to load forms');
      const data = await res.json();
      setForms(Array.isArray(data.forms) ? (data.forms as FormDefinition[]) : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load forms';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loadingAuth) return;
    if (!isAdmin) return;
    void loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth, isAdmin]);

  const sortedForms = useMemo(
    () => [...forms].sort((a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt)),
    [forms],
  );

  const formsWithResponses = useMemo(
    () =>
      sortedForms.filter((f) => (typeof f.responseCount === 'number' ? f.responseCount > 0 : false)),
    [sortedForms],
  );

  const copyLink = async (form: FormDefinition) => {
    if (!form.publicToken || form.status === 'draft') {
      toast({
        variant: 'destructive',
        title: 'Not shareable yet',
        description: 'Publish the form before copying its guest link.',
      });
      return;
    }
    const absolute = `${window.location.origin}/forms/public/${form.publicToken}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopiedId(form.id);
      toast({ title: 'Guest form link copied' });
      window.setTimeout(() => setCopiedId((id) => (id === form.id ? null : id)), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusyDelete(true);
    try {
      const headers = await getClientAuthHeaders();
      const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(deletingId)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Delete failed');
      }
      toast({ title: 'Form deleted' });
      setDeletingId(null);
      await loadForms();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setBusyDelete(false);
    }
  };

  if (!loadingAuth && !isAdmin) {
    return (
      <div className="page-container">
        <PageHeader title="Admin • Forms" />
        <EmptyState title="Permission denied" description="Sign in as an admin to manage forms." />
      </div>
    );
  }

  if (loadingAuth || loading) return <PageLoading />;

  const deletingForm = deletingId ? forms.find((f) => f.id === deletingId) : null;

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title="Admin • Forms"
        description="Build forms in Forms maker. View, share, and download submissions in Responses."
      />

      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-section-title">Forms maker</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create and edit forms, then publish a guest link for people to fill out.
            </p>
          </div>
          <Button asChild className="rounded-xl shrink-0">
            <Link href="/admin/forms/new">
              <Plus className="h-4 w-4" />
              New form
            </Link>
          </Button>
        </div>

        {sortedForms.length === 0 ? (
          <div className="ui-card p-6 space-y-4">
            <EmptyState
              title="No forms yet"
              description="Create a form, add questions, then publish a guest link."
            />
            <div className="flex justify-center">
              <Button asChild className="rounded-xl">
                <Link href="/admin/forms/new">
                  <Plus className="h-4 w-4" />
                  New form
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="ui-card divide-y divide-border/60">
            {sortedForms.map((form) => (
              <div key={form.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => router.push(`/admin/forms/${encodeURIComponent(form.id)}`)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold truncate">{form.title}</p>
                    <Badge variant={form.status === 'published' ? 'success' : 'secondary'}>
                      {form.status === 'published' ? 'Live' : 'Draft'}
                    </Badge>
                  </div>
                  {form.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{form.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.fields.length} question{form.fields.length === 1 ? '' : 's'}
                    {form.deadlineDate ? ` · Due ${form.deadlineDate}` : ''}
                    {typeof form.maxResponses === 'number' && form.maxResponses > 0
                      ? ` · Limit ${form.maxResponses}`
                      : ''}
                  </p>
                </button>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => void copyLink(form)}
                    disabled={form.status === 'draft' || !form.publicToken}
                  >
                    {copiedId === form.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Guest link
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link href={`/admin/forms/${encodeURIComponent(form.id)}`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-destructive"
                    onClick={() => setDeletingId(form.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-section-title">Responses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            View one submission or download everyone’s answers for a form.
          </p>
        </div>

        {formsWithResponses.length === 0 ? (
          <div className="ui-card p-6">
            <EmptyState
              title="No responses yet"
              description="When people submit a published form, you’ll review and download them here."
            />
          </div>
        ) : (
          <div className="ui-card divide-y divide-border/60">
            {formsWithResponses.map((form) => {
              const count = form.responseCount ?? 0;
              const needs = form.needsAttentionCount ?? 0;
              return (
                <div key={form.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold truncate">{form.title}</p>
                      {needs > 0 ? (
                        <Badge variant="destructive">{needs} need attention</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {count} response{count === 1 ? '' : 's'}
                      {typeof form.maxResponses === 'number' && form.maxResponses > 0
                        ? ` · limit ${form.maxResponses}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button asChild className="rounded-xl" size="sm">
                      <Link href={`/admin/forms/${encodeURIComponent(form.id)}/responses`}>
                        <Inbox className="h-3.5 w-3.5" />
                        View responses
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sortedForms.length > 0 && formsWithResponses.length < sortedForms.length ? (
          <p className="text-xs text-muted-foreground">
            Forms without submissions yet aren’t listed here. Open them from Forms maker after people reply.
          </p>
        ) : null}
      </section>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && !busyDelete && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingForm
                ? `“${deletingForm.title}” and its submissions will be removed. This cannot be undone.`
                : 'This form and its submissions will be removed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyDelete}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busyDelete ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
