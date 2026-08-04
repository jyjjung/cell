"use client";

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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

export default function FormsPage() {
  const { currentUser, loadingAuth } = useAuth();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkToken, setLinkToken] = useState('');

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

  if (loadingAuth) return <PageLoading />;

  return (
    <div className="page-container">
      <PageHeader title="Forms" description="Submit responses and view reports." />

      {!currentUser ? (
        <div className="space-y-4 ui-surface">
          <p className="text-sm text-muted-foreground">
            You can submit as a guest using a form link. Paste the token you were given:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="publicToken">Form link token</Label>
              <Input
                id="publicToken"
                value={linkToken}
                onChange={(e) => setLinkToken(e.target.value)}
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                className="mt-1"
              />
            </div>
            <Button
              asChild
              disabled={!linkToken.trim()}
              className="rounded-xl"
            >
              <Link href={`/forms/public/${encodeURIComponent(linkToken.trim())}`}>Open form</Link>
            </Button>
          </div>
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
                    .sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0))
                    .map((form) => (
                      <div key={form.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/40 p-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{form.title}</p>
                          {form.description ? <p className="text-sm text-muted-foreground">{form.description}</p> : null}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <Button
                            asChild
                            variant="outline"
                            className="rounded-xl"
                            disabled={!form.publicToken}
                          >
                            <Link href={form.publicToken ? `/forms/public/${form.publicToken}` : '#'}>
                              Open
                            </Link>
                          </Button>
                          {responsesByFormId.get(form.id)?.length ? (
                            <p className="text-xs text-muted-foreground">
                              {responsesByFormId.get(form.id)!.length} submission(s)
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">No submissions yet</p>
                          )}
                        </div>
                      </div>
                    ))}
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
                              Submitted: {r.createdAt ? new Date(r.createdAt.toMillis()).toLocaleString() : '—'}
                            </p>
                          </div>
                          <Button asChild variant="secondary" className="rounded-xl">
                            <Link href={`/forms/guest/${encodeURIComponent(r.formId)}/${encodeURIComponent(r.id)}`}>
                              View
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

