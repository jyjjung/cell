'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/loading-spinner';
import type { FormAnswerValue, FormDefinition, FormResponse } from '@/types/forms';
import FormRenderer from '@/components/forms/FormRenderer';
import FormSubmitThanks from '@/components/forms/FormSubmitThanks';
import { validateFormResponse } from '@/lib/forms/validation';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { AlertTriangle, Save } from 'lucide-react';

/** Guest / member view of a single response — edit answers only (no CSV/PDF report). */
export default function GuestResponsePage({ params }: { params: { formId: string; responseId: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();

  const [form, setForm] = useState<FormDefinition | null>(null);
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [draftAnswers, setDraftAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [clientErrors, setClientErrors] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/forms/guest/${encodeURIComponent(params.formId)}/${encodeURIComponent(params.responseId)}`,
        );
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
    setClientErrors(null);
  }, [response]);

  const serverErrors = response?.lastValidationErrors ?? null;
  const displayErrors = clientErrors ?? serverErrors;

  const hasErrors = useMemo(() => {
    return displayErrors && typeof displayErrors === 'object' ? Object.keys(displayErrors).length > 0 : false;
  }, [displayErrors]);

  const submittedOk = searchParams.get('submitted') === '1';
  const showThanks = (submittedOk || justSaved) && !hasErrors;

  const handleAnswersChange = (next: Record<string, FormAnswerValue>) => {
    setDraftAnswers(next);
    if (clientErrors) setClientErrors(null);
  };

  const handleSave = async () => {
    if (!form || !response) return;

    const { errorsByFieldId } = validateFormResponse(form, draftAnswers);
    if (Object.keys(errorsByFieldId).length > 0) {
      setClientErrors(errorsByFieldId);
      toast({
        variant: 'destructive',
        title: 'Fix required fields',
        description: 'Fill in the required fields below before saving.',
      });
      return;
    }

    setSaving(true);
    try {
      const token = currentUser ? await auth.currentUser?.getIdToken() : null;
      const res = await fetch(
        `/api/forms/guest/${encodeURIComponent(params.formId)}/${encodeURIComponent(params.responseId)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ answers: draftAnswers }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');

      if (!data.errorsByFieldId || Object.keys(data.errorsByFieldId).length === 0) {
        setJustSaved(true);
        setClientErrors(null);
        setResponse((prev) =>
          prev
            ? {
                ...prev,
                answers: draftAnswers,
                lastValidationErrors: undefined,
              }
            : prev,
        );
      } else {
        setClientErrors(data.errorsByFieldId);
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

  if (showThanks) {
    return (
      <div className="page-container">
        <FormSubmitThanks formTitle={form.title} />
      </div>
    );
  }

  const errorsList = displayErrors ?? {};

  return (
    <div className="page-container">
      <div className="ui-card p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-page-title">{form.title}</h1>
          <p className="text-sm text-muted-foreground">Submitted as {response.submitterEmail}</p>
        </div>

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
          onChange={handleAnswersChange}
          errorsByFieldId={displayErrors}
          readOnly={saving}
          profileLinkedHint={!!currentUser}
        />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Button variant="outline" className="rounded-xl" onClick={() => router.push('/forms')} disabled={saving}>
            Back to forms
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
    </div>
  );
}
