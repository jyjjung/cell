'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/page-layout';
import { PageHeader } from '@/components/ui/page-layout';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Inbox, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function FormsPage() {
  const { currentUser, loadingAuth, isAdmin } = useAuth();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FormResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formsWithResponses = useMemo(
    () =>
      forms
        .filter((f) => (typeof f.responseCount === 'number' ? f.responseCount > 0 : false))
        .slice()
        .sort((a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt)),
    [forms],
  );

  useEffect(() => {
    if (!currentUser?.uid) return;
    if (loadingAuth) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const headers = await getClientAuthHeaders();

        const [formsRes, responsesRes] = await Promise.all([
          fetch('/api/forms/user/definitions', { headers }),
          fetch('/api/forms/user/responses', { headers }),
        ]);

        if (!formsRes.ok) throw new Error('Failed to load forms');
        if (!responsesRes.ok) throw new Error('Failed to load responses');

        const formsData = await formsRes.json();
        const responsesData = await responsesRes.json();

        setForms(Array.isArray(formsData.forms) ? formsData.forms : []);
        setResponses(Array.isArray(responsesData.responses) ? responsesData.responses : []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load forms';
        toast({ variant: 'destructive', title: 'Forms', description: message });
      } finally {
        setLoading(false);
      }
    };

    void fetchAll();
  }, [currentUser?.uid, loadingAuth, toast]);

  const responsesByFormId = useMemo(() => {
    const map = new Map<string, FormResponse[]>();
    for (const r of responses) {
      const list = map.get(r.formId) ?? [];
      list.push(r);
      map.set(r.formId, list);
    }
    return map;
  }, [responses]);

  const handleDeleteResponse = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const headers = await getClientAuthHeaders();
      const res = await fetch(
        `/api/forms/guest/${encodeURIComponent(deleteTarget.formId)}/${encodeURIComponent(deleteTarget.id)}`,
        { method: 'DELETE', headers },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete response');
      setResponses((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast({ title: 'Response deleted', description: 'Your submission was removed.' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not delete response';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setDeleting(false);
    }
  };

  if (loadingAuth) return <PageLoading />;

  return (
    <div className="page-container">
      <PageHeader
        title="Forms"
        description={
          isAdmin
            ? 'Open a form, submit answers, and review everyone’s responses.'
            : 'Open a form, submit answers, and revisit your responses.'
        }
      />

      {!currentUser ? (
        <div className="ui-surface max-w-xl space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to see forms shared with you. If someone sent you a guest form link, open that link
            directly — no account needed.
          </p>
          <Button asChild className="rounded-xl">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="ui-section">
            <div className="ui-card space-y-3">
              <h2 className="text-section-title">Available forms</h2>

              {loading && forms.length === 0 ? (
                <div className="empty-inline">
                  <LoadingSpinner />
                </div>
              ) : forms.length === 0 ? (
                <EmptyState title="No forms available" description="An admin will add forms you can access." />
              ) : (
                <div className="space-y-2">
                  {forms
                    .slice()
                    .sort((a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt))
                    .map((form) => {
                      const submissionCount = responsesByFormId.get(form.id)?.length ?? 0;
                      const totalResponses = form.responseCount ?? 0;
                      const needsAttention = form.needsAttentionCount ?? 0;
                      return (
                        <div
                          key={form.id}
                          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{form.title}</p>
                              {isAdmin && needsAttention > 0 ? (
                                <Badge variant="destructive">
                                  {needsAttention} need attention
                                </Badge>
                              ) : null}
                            </div>
                            {form.description ? (
                              <p className="text-sm text-muted-foreground">{form.description}</p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {form.deadlineDate ? <span>Due {form.deadlineDate}</span> : null}
                              <span>
                                {submissionCount > 0
                                  ? `Your submissions: ${submissionCount}`
                                  : 'You haven’t submitted'}
                              </span>
                              {isAdmin ? (
                                <span>
                                  {totalResponses} total response{totalResponses === 1 ? '' : 's'}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-xl shrink-0 self-start"
                            size="sm"
                            disabled={!form.publicToken}
                          >
                            <Link href={form.publicToken ? `/forms/public/${form.publicToken}` : '#'}>
                              {submissionCount > 0 ? 'Open again' : 'Fill out'}
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </section>

          {isAdmin ? (
            <section className="ui-section">
              <div className="ui-card space-y-3">
                <div>
                  <h2 className="text-section-title">All responses</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review one submission or download everyone’s answers for a form.
                  </p>
                </div>
                {loading && formsWithResponses.length === 0 ? (
                  <div className="empty-inline">
                    <LoadingSpinner />
                  </div>
                ) : formsWithResponses.length === 0 ? (
                  <EmptyState
                    title="No responses yet"
                    description="When people submit a published form, you’ll review them here."
                  />
                ) : (
                  <div className="space-y-2">
                    {formsWithResponses.map((form) => {
                      const count = form.responseCount ?? 0;
                      const needs = form.needsAttentionCount ?? 0;
                      return (
                        <div
                          key={form.id}
                          className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-3 sm:flex-row sm:items-center"
                        >
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
                          <Button asChild className="rounded-xl shrink-0" size="sm">
                            <Link href={`/admin/forms/${encodeURIComponent(form.id)}/responses`}>
                              <Inbox className="h-3.5 w-3.5" />
                              View responses
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          <section className="ui-section">
            <div className="ui-card space-y-3">
              <h2 className="text-section-title">Your submissions</h2>
              {responses.length === 0 ? (
                <EmptyState title="No submissions yet" description="When you submit a form, it will appear here." />
              ) : (
                <div className="space-y-2">
                  {responses
                    .slice()
                    .sort((a, b) => toMillisSafe(b.updatedAt) - toMillisSafe(a.updatedAt))
                    .slice(0, 50)
                    .map((r) => {
                      const hasErrors = r.lastValidationErrors && Object.keys(r.lastValidationErrors).length > 0;
                      const submittedMs = toMillisSafe(r.createdAt);
                      return (
                        <div
                          key={r.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {r.formTitleSnapshot ?? 'Form'}{' '}
                              {hasErrors ? (
                                <span className="inline-flex items-center gap-1 text-xs text-destructive ml-2">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Needs attention
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {submittedMs ? new Date(submittedMs).toLocaleString() : '—'}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button asChild variant="secondary" className="rounded-xl">
                              <Link href={`/forms/guest/${encodeURIComponent(r.formId)}/${encodeURIComponent(r.id)}`}>
                                {hasErrors ? 'Fix' : 'View'}
                              </Link>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-xl text-destructive hover:text-destructive"
                              aria-label="Delete submission"
                              onClick={() => setDeleteTarget(r)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!deleting && !open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your response
              {deleteTarget?.formTitleSnapshot ? ` for “${deleteTarget.formTitleSnapshot}”` : ''}. You can’t undo
              this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDeleteResponse();
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
