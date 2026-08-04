"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/loading-spinner';
import type { FormAnswerValue, FormDefinition, FormResponse } from '@/types/forms';
import FormRenderer from '@/components/forms/FormRenderer';
import ReportPanel from '@/components/forms/ReportPanel';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Save } from 'lucide-react';

export default function GuestResponsePage({ params }: { params: { formId: string; responseId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormDefinition | null>(null);
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [draftAnswers, setDraftAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/forms/guest/${encodeURIComponent(params.formId)}/${encodeURIComponent(params.responseId)}`);
        if (!res.ok) throw new Error('Response not found');
        const data = await res.json();
        setForm(data.form as FormDefinition);
        setResponse(data.response as FormResponse);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not load response';
        toast({ variant: 'destructive', title: 'Forms', description: message });
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [params.formId, params.responseId, toast]);

  useEffect(() => {
    if (!response) return;
    setDraftAnswers(response.answers ?? {});
  }, [response]);

  const hasErrors = useMemo(() => {
    const errs = response?.lastValidationErrors;
    return errs && typeof errs === 'object' ? Object.keys(errs).length > 0 : false;
  }, [response]);

  const handleSave = async () => {
    if (!form || !response) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/forms/guest/${encodeURIComponent(params.formId)}/${encodeURIComponent(params.responseId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: draftAnswers }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');

      // Refresh the response to pull updated validation errors + timestamps.
      const refreshedRes = await fetch(`/api/forms/guest/${encodeURIComponent(params.formId)}/${encodeURIComponent(params.responseId)}`);
      if (refreshedRes.ok) {
        const refreshed = await refreshedRes.json();
        setForm(refreshed.form as FormDefinition);
        setResponse(refreshed.response as FormResponse);
      } else {
        // Still allow the optimistic save.
        setResponse((prev) =>
          prev
            ? {
                ...prev,
                answers: draftAnswers,
                lastValidationErrors: data.errorsByFieldId ?? null,
              }
            : prev,
        );
      }

      if (!data.errorsByFieldId || Object.keys(data.errorsByFieldId).length === 0) {
        toast({ title: 'Saved', description: 'Your response has been updated.' });
        // “Return to home” for forms UX.
        router.push('/forms');
      } else {
        toast({ variant: 'destructive', title: 'Fix required fields', description: 'Some required fields are missing.' });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading />;
  if (!form || !response) return <div className="page-container">Response not found.</div>;

  const errorsList = response.lastValidationErrors ?? {};
  const submittedOk = searchParams.get('submitted') === '1';

  return (
    <div className="page-container">
      <div className="ui-card p-4 md:p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-page-title">{form.title}</h1>
          <p className="text-sm text-muted-foreground">Submitter email: {response.submitterEmail}</p>
        </div>

        {submittedOk && !hasErrors ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
            Saved successfully. You can review answers and download a report below.
          </div>
        ) : null}

        {hasErrors ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Some fields need attention
            </div>
            <ul className="mt-2 list-disc pl-5 text-destructive">
              {Object.entries(errorsList).map(([fieldId, msg]) => (
                <li key={fieldId}>
                  {form.fields.find((f) => f.id === fieldId)?.label ?? fieldId}: {msg}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <FormRenderer
          form={form}
          value={draftAnswers}
          onChange={setDraftAnswers}
          errorsByFieldId={response.lastValidationErrors}
          readOnly={saving}
        />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => router.push('/forms')} disabled={saving}>
              Back to forms
            </Button>
          </div>

          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" className="rounded-xl" asChild>
              <a href="#report">
                Report
              </a>
            </Button>
            <Button className="rounded-xl" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        <div id="report">
          <ReportPanel form={form} response={response} />
        </div>
      </div>
    </div>
  );
}

