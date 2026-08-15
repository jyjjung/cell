'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import ResponsesTable from '@/components/forms/ResponsesTable';
import ExportResponsesDialog from '@/components/forms/ExportResponsesDialog';
import { sortedFields } from '@/lib/forms/export-responses';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Check,
  Download,
  Link2,
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
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

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

  const fieldCount = sortedFields(form).length;
  const totalLabel =
    typeof form.responseCount === 'number'
      ? `${form.responseCount} response${form.responseCount === 1 ? '' : 's'}`
      : `${responses.length} loaded`;
  const generatedAt = new Date().toLocaleString();

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
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Forms export
            </p>
            <PageHeader
              title={form.title}
              description={`${totalLabel} · ${fieldCount} column${fieldCount === 1 ? '' : 's'} · ${generatedAt}${
                typeof form.maxResponses === 'number' && form.maxResponses > 0
                  ? ` · limit ${form.maxResponses}`
                  : ''
              }`}
            />
          </div>
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
            onClick={() => setExportOpen(true)}
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
        <div className="space-y-4">
          <ResponsesTable
            form={form}
            responses={responses}
            getRowClassName={(response) =>
              response.lastValidationErrors && Object.keys(response.lastValidationErrors).length > 0
                ? 'bg-destructive/5'
                : undefined
            }
          />

          {cursor ? (
            <div className="flex justify-center">
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

          <p className="text-[10px] text-muted-foreground">
            Same layout as PDF export. Rows highlighted in red need attention.
          </p>
        </div>
      )}

      <ExportResponsesDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        form={form}
        responses={responses}
        fetchAllForExport={fetchAllForExport}
        exportCap={EXPORT_CAP}
      />
    </div>
  );
}
