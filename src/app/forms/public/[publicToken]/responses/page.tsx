'use client';

import { useCallback, useEffect, useState, use } from 'react';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import ResponsesTable from '@/components/forms/ResponsesTable';
import { Inbox } from 'lucide-react';

const PAGE_SIZE = 50;

type PublicFormSlice = Pick<FormDefinition, 'id' | 'title' | 'description' | 'fields' | 'responseCount'>;

export default function PublicFormResponsesPage(props: { params: Promise<{ publicToken: string }> }) {
  const params = use(props.params);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [form, setForm] = useState<PublicFormSlice | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);

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

  return (
    <div className="page-container space-y-5">
      <PageHeader title={form.title} />

      {responses.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No responses yet"
          description="When people submit this form, their answers will appear here."
        />
      ) : (
        <div className="space-y-4">
          <ResponsesTable form={form as FormDefinition} responses={responses} responsive />

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
