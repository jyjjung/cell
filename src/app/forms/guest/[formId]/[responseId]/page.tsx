'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageLoading } from '@/components/ui/loading-spinner';
import type { FormAnswerValue, FormDefinition, FormResponse } from '@/types/forms';
import FormRenderer from '@/components/forms/FormRenderer';
import FormSubmitThanks from '@/components/forms/FormSubmitThanks';
import { validateFormResponse } from '@/lib/forms/validation';
import { formResponsesAreLocked, formResponsesLockedMessage } from '@/lib/forms/lifecycle';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase';
import { AlertTriangle, Save, Trash2 } from 'lucide-react';
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const responsesLocked = useMemo(
    () => (form ? formResponsesAreLocked(form, response) : false),
    [form, response],
  );

  const canDeleteOwn = useMemo(() => {
    if (responsesLocked) return false;
    if (!currentUser || !response) return false;
    if (response.submitterUserId && response.submitterUserId === currentUser.uid) return true;
    const userEmail = (currentUser.email ?? '').trim().toLowerCase();
    const responseEmail = (response.submitterEmail ?? '').trim().toLowerCase();
    return !!userEmail && !!responseEmail && userEmail === responseEmail;
  }, [currentUser, response, responsesLocked]);

  const handleAnswersChange = (next: Record<string, FormAnswerValue>) => {
    if (responsesLocked) return;
    setDraftAnswers(next);
    if (clientErrors) setClientErrors(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in to delete your response.');
      const res = await fetch(
        `/api/forms/guest/${encodeURIComponent(params.formId)}/${encodeURIComponent(params.responseId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete response');
      toast({ title: 'Response deleted', description: 'Your submission was removed.' });
      router.push('/forms');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not delete response';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleSave = async () => {
    if (!form || !response) return;
    if (formResponsesAreLocked(form, response)) {
      toast({
        variant: 'destructive',
        title: 'Responses locked',
        description: formResponsesLockedMessage(form),
      });
      return;
    }

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
          {responsesLocked ? (
            <p className="text-sm text-muted-foreground">{formResponsesLockedMessage(form)}</p>
          ) : null}
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
          readOnly={saving || responsesLocked}
          profileLinkedHint={!!currentUser}
        />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => router.push(currentUser ? '/forms' : '/')}
              disabled={saving || deleting}
            >
              {currentUser ? 'Back to forms' : 'Done'}
            </Button>
            {canDeleteOwn ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl text-destructive hover:text-destructive"
                disabled={saving || deleting}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
          {!responsesLocked ? (
            <Button className="rounded-xl" onClick={() => void handleSave()} disabled={saving || deleting}>
              {saving ? (
                'Saving…'
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!deleting) setConfirmDelete(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your response. You can’t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
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
