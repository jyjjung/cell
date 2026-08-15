'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ReportPanel from '@/components/forms/ReportPanel';
import ExportResponsesDialog from '@/components/forms/ExportResponsesDialog';
import { useToast } from '@/hooks/use-toast';
import { toMillisSafe } from '@/lib/firestore-timestamp';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Download,
  Link2,
  X,
} from 'lucide-react';

const FETCH_PAGE = 50;
const EXPORT_CAP = 500;

type Props = {
  formId: string;
};

export default function AdminFormResponsesPage({ formId }: Props) {
  const { isAdmin, loadingAuth } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFixed, setExportFixed] = useState<FormResponse | null>(null);

  const selected = useMemo(
    () => (selectedId ? responses.find((r) => r.id === selectedId) ?? null : null),
    [responses, selectedId],
  );

  const loadForm = useCallback(async () => {
    const headers = await getClientAuthHeaders();
    const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(formId)}`, { headers });
    if (!res.ok) throw new Error('Failed to load form');
    const data = await res.json();
    setForm(data.form as FormDefinition);
  }, [formId]);

  const loadResponses = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      if (options?.append) setLoadingMore(true);
      try {
        const headers = await getClientAuthHeaders();
        const qs = new URLSearchParams({ limit: String(FETCH_PAGE) });
        if (options?.cursor) qs.set('cursor', options.cursor);
        const res = await fetch(
          `/api/forms/admin/definitions/${encodeURIComponent(formId)}/responses?${qs.toString()}`,
          { headers },
        );
        if (!res.ok) throw new Error('Failed to load responses');
        const data = await res.json();
        const page = Array.isArray(data.responses) ? (data.responses as FormResponse[]) : [];
        setResponses((prev) => (options?.append ? [...prev, ...page] : page));
        setCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      } finally {
        if (options?.append) setLoadingMore(false);
      }
    },
    [formId],
  );

  useEffect(() => {
    if (loadingAuth || !isAdmin) return;
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([loadForm(), loadResponses()]);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load';
        toast({ variant: 'destructive', title: 'Forms', description: message });
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [loadingAuth, isAdmin, loadForm, loadResponses, toast]);

  const fetchAllForExport = useCallback(async (): Promise<FormResponse[]> => {
    const headers = await getClientAuthHeaders();
    const all: FormResponse[] = [];
    let next: string | null = null;
    do {
      const qs = new URLSearchParams({ limit: String(FETCH_PAGE) });
      if (next) qs.set('cursor', next);
      const res = await fetch(
        `/api/forms/admin/definitions/${encodeURIComponent(formId)}/responses?${qs.toString()}`,
        { headers },
      );
      if (!res.ok) throw new Error('Failed to load responses for export');
      const data = await res.json();
      const page = Array.isArray(data.responses) ? (data.responses as FormResponse[]) : [];
      all.push(...page);
      next = typeof data.nextCursor === 'string' ? data.nextCursor : null;
      if (all.length >= EXPORT_CAP) break;
    } while (next);
    return all.slice(0, EXPORT_CAP);
  }, [formId]);

  const copyPublicGuestLink = async () => {
    if (!form?.publicToken || form.status === 'draft') {
      toast({
        variant: 'destructive',
        title: 'Not shareable yet',
        description: 'Publish the form before sharing responses.',
      });
      return;
    }
    const absolute = `${window.location.origin}/forms/public/${form.publicToken}/responses`;
    try {
      await navigator.clipboard.writeText(absolute);
      setPublicLinkCopied(true);
      window.setTimeout(() => setPublicLinkCopied(false), 2000);
      toast({
        title: 'Responses link copied',
        description: 'Anyone with this link can view submissions — no sign-in required.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: absolute });
    }
  };

  const openBulkExport = () => {
    setExportFixed(null);
    setExportOpen(true);
  };

  const openSingleExport = (response: FormResponse) => {
    setExportFixed(response);
    setExportOpen(true);
  };

  if (!loadingAuth && !isAdmin) {
    return (
      <div className="page-container">
        <PageHeader title="Admin • Responses" />
        <EmptyState title="Permission denied" description="Sign in as an admin to view responses." />
      </div>
    );
  }

  if (loadingAuth || loading) return <PageLoading />;
  if (!form) {
    return (
      <div className="page-container">
        <PageHeader title="Admin • Responses" />
        <EmptyState title="Form not found" description="This form may have been deleted." />
      </div>
    );
  }

  const totalLabel =
    typeof form.responseCount === 'number'
      ? `${form.responseCount} total`
      : `${responses.length} loaded`;

  return (
    <div className="page-container space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" className="rounded-xl -ml-2 w-fit">
            <Link href="/forms">
              <ArrowLeft className="h-4 w-4" />
              Forms
            </Link>
          </Button>
          <PageHeader
            title={form.title}
            description={`Responses · ${totalLabel}${
              typeof form.maxResponses === 'number' && form.maxResponses > 0
                ? ` · limit ${form.maxResponses}`
                : ''
            }`}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={`/admin/forms/${encodeURIComponent(form.id)}`}>Edit form</Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={form.status === 'draft' || !form.publicToken}
            onClick={() => void copyPublicGuestLink()}
          >
            {publicLinkCopied ? (
              <Check className="h-4 w-4 mr-1.5" />
            ) : (
              <Link2 className="h-4 w-4 mr-1.5" />
            )}
            {publicLinkCopied ? 'Copied' : 'Share responses'}
          </Button>
          <Button
            className="rounded-xl"
            disabled={responses.length === 0}
            onClick={openBulkExport}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download…
          </Button>
        </div>
      </div>

      {responses.length === 0 ? (
        <EmptyState
          title="No responses yet"
          description="Share the responses link so guests can see submissions without signing in."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
          <section className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              All responses
            </p>
            {responses.map((r) => {
              const errs = r.lastValidationErrors ?? {};
              const hasErrors = Object.keys(errs).length > 0;
              const updatedMs = toMillisSafe(r.updatedAt);
              const isSelected = selectedId === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${
                    isSelected
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border/60 bg-card/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.submitterEmail || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {updatedMs ? new Date(updatedMs).toLocaleString() : '—'}
                      </p>
                    </div>
                    {hasErrors ? (
                      <Badge variant="destructive" className="shrink-0 gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Needs attention
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        Complete
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}

            {cursor ? (
              <div className="flex justify-center pt-1">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  disabled={loadingMore}
                  onClick={() => void loadResponses({ append: true, cursor })}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-border/60 bg-background p-4 space-y-4 min-h-[240px]">
            {!selected ? (
              <div className="flex h-full min-h-[200px] items-center justify-center">
                <p className="text-sm text-muted-foreground text-center px-4">
                  Select a response to view or download it.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Single response
                    </p>
                    <h3 className="text-section-title truncate mt-0.5">{selected.submitterEmail}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl shrink-0"
                    onClick={() => setSelectedId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <ReportPanel
                  form={form}
                  response={selected}
                  compactHeader
                  onDownload={() => openSingleExport(selected)}
                />
              </>
            )}
          </section>
        </div>
      )}

      <ExportResponsesDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        form={form}
        responses={responses}
        fixedResponse={exportFixed}
        initialPickedIds={selectedId ? [selectedId] : undefined}
        fetchAllForExport={fetchAllForExport}
        exportCap={EXPORT_CAP}
      />
    </div>
  );
}
