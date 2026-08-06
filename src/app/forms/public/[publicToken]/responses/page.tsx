'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { stringifyAnswerValue, sortedFields } from '@/lib/forms/export-responses';
import { displaySubmitterLabel } from '@/lib/forms/submitter-display';
import { Inbox } from 'lucide-react';

const PAGE_SIZE = 50;

type PublicFormSlice = Pick<FormDefinition, 'id' | 'title' | 'description' | 'fields' | 'responseCount'>;

export default function PublicFormResponsesPage({ params }: { params: { publicToken: string } }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [form, setForm] = useState<PublicFormSlice | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

  const fields = useMemo(
    () => (form ? sortedFields(form as FormDefinition) : ([] as FormFieldDefinition[])),
    [form],
  );

  const loadPage = useCallback(
    async (options?: { append?: boolean; cursor?: string | null }) => {
      if (options?.append) setLoadingMore(true);
      else setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
        if (options?.cursor) qs.set('cursor', options.cursor);
        const res = await fetch(
          `/api/forms/public/${encodeURIComponent(params.publicToken)}/responses?${qs.toString()}`,
        );
        if (!res.ok) throw new Error('Could not load responses');
        const data = await res.json();
        const page = Array.isArray(data.responses) ? (data.responses as FormResponse[]) : [];
        if (!options?.append && data.form) {
          setForm(data.form as PublicFormSlice);
        }
        setResponses((prev) => (options?.append ? [...prev, ...page] : page));
        setCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not load responses';
        toast({ variant: 'destructive', title: 'Forms', description: message });
        if (!options?.append) setForm(null);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [params.publicToken, toast],
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  if (loading) return <PageLoading />;

  if (!form) {
    return (
      <div className="page-container">
        <PageHeader title="Responses" />
        <EmptyState title="Not found" description="This responses link is invalid or the form was removed." />
      </div>
    );
  }

  const totalLabel =
    typeof form.responseCount === 'number' ? `${form.responseCount} total` : `${responses.length} shown`;

  return (
    <div className="page-container space-y-5">
      <PageHeader
        title={form.title}
        description={
          form.description
            ? `${form.description} · Responses · ${totalLabel}`
            : `Responses · ${totalLabel}`
        }
      />

      {responses.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No responses yet"
          description="When people submit this form, their answers will appear here."
        />
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 text-left">
                  <th className="whitespace-nowrap px-3.5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    #
                  </th>
                  <th className="whitespace-nowrap px-3.5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Submitter
                  </th>
                  {fields.map((field) => (
                    <th
                      key={field.id}
                      className="whitespace-nowrap px-3.5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((response, index) => (
                  <tr
                    key={response.id}
                    className="border-b border-border/40 last:border-0 odd:bg-background even:bg-muted/15"
                  >
                    <td className="px-3.5 py-3 align-top text-muted-foreground tabular-nums">
                      {index + 1}
                    </td>
                    <td className="px-3.5 py-3 align-top font-medium">
                      {displaySubmitterLabel(response, form as FormDefinition)}
                    </td>
                    {fields.map((field) => {
                      const value = stringifyAnswerValue(response.answers?.[field.id]);
                      return (
                        <td
                          key={field.id}
                          className="max-w-[240px] px-3.5 py-3 align-top whitespace-pre-wrap break-words"
                        >
                          {value || <span className="text-muted-foreground">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cursor ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={loadingMore}
                onClick={() => void loadPage({ append: true, cursor })}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
