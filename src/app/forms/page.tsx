"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { extractPublicFormToken } from '@/lib/forms/validation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/page-layout';
import { PageHeader } from '@/components/ui/page-layout';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

export default function FormsPage() {
  const { currentUser, loadingAuth } = useAuth();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkInput, setLinkInput] = useState('');

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

  const resolvedToken = extractPublicFormToken(linkInput);

  if (loadingAuth) return <PageLoading />;

  return (
    <div className="page-container">
      <PageHeader title="Forms" description="Open a form, submit answers, and revisit your responses." />

      {!currentUser ? (
        <div className="space-y-4 ui-surface max-w-xl">
          <p className="text-sm text-muted-foreground">
            Paste the form link you were given (or just the token) to open it as a guest.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <Label htmlFor="publicToken">Form link</Label>
              <Input
                id="publicToken"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Paste link or token"
                className="mt-1"
              />
            </div>
            <Button asChild disabled={!resolvedToken} className="rounded-xl">
              <Link href={`/forms/public/${encodeURIComponent(resolvedToken)}`}>Open form</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="ui-section">
            <div className="ui-card space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
                <h2 className="text-section-title">Available forms</h2>
                <div className="flex flex-col sm:flex-row gap-2 items-end w-full sm:w-auto sm:max-w-md">
                  <div className="flex-1 w-full">
                    <Label htmlFor="openLink" className="text-xs text-muted-foreground">
                      Or open a guest link
                    </Label>
                    <Input
                      id="openLink"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      placeholder="Paste link or token"
                      className="mt-1"
                    />
                  </div>
                  <Button asChild variant="outline" disabled={!resolvedToken} className="rounded-xl shrink-0">
                    <Link href={`/forms/public/${encodeURIComponent(resolvedToken)}`}>Open</Link>
                  </Button>
                </div>
              </div>

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
                    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))
                    .map((form) => {
                      const submissionCount = responsesByFormId.get(form.id)?.length ?? 0;
                      return (
                        <div
                          key={form.id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold">{form.title}</p>
                            {form.description ? (
                              <p className="text-sm text-muted-foreground">{form.description}</p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {form.deadlineDate ? <span>Due {form.deadlineDate}</span> : null}
                              <span>
                                {submissionCount > 0
                                  ? `${submissionCount} submission${submissionCount === 1 ? '' : 's'}`
                                  : 'Not submitted yet'}
                              </span>
                            </div>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-xl shrink-0"
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

          <section className="ui-section">
            <div className="ui-card space-y-3">
              <h2 className="text-section-title">Your submissions</h2>
              {responses.length === 0 ? (
                <EmptyState title="No submissions yet" description="When you submit a form, it will appear here." />
              ) : (
                <div className="space-y-2">
                  {responses
                    .slice()
                    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))
                    .slice(0, 50)
                    .map((r) => {
                      const hasErrors = r.lastValidationErrors && Object.keys(r.lastValidationErrors).length > 0;
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
                              Submitted:{' '}
                              {r.createdAt ? new Date(r.createdAt.toMillis()).toLocaleString() : '—'}
                            </p>
                          </div>
                          <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={`/forms/guest/${encodeURIComponent(r.formId)}/${encodeURIComponent(r.id)}`}>
                              {hasErrors ? 'Fix' : 'View'}
                            </Link>
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
