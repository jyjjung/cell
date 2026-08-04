'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner, PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormRenderer from '@/components/forms/FormRenderer';
import FormSubmitThanks from '@/components/forms/FormSubmitThanks';
import type { FormAnswerValue, FormDefinition } from '@/types/forms';
import { isValidEmail, validateFormResponse } from '@/lib/forms/validation';
import {
  buildInitialAnswers,
  findFirstEmailField,
  formHasEmailField,
  formatProfileName,
} from '@/lib/forms/prefill';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';

export default function PublicFormPage({ params }: { params: { publicToken: string } }) {
  const { currentUser, loadingAuth } = useAuth();
  const { toast } = useToast();

  const [loadingForm, setLoadingForm] = useState(true);
  const [form, setForm] = useState<FormDefinition | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [email, setEmail] = useState<string>('');
  const [emailTouched, setEmailTouched] = useState(false);

  const [answers, setAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasEmailField = useMemo(() => (form ? formHasEmailField(form) : false), [form]);

  useEffect(() => {
    if (!loadingAuth) {
      const maybeEmail = typeof currentUser?.email === 'string' ? currentUser.email : '';
      if (maybeEmail) setEmail(maybeEmail);
    }
  }, [currentUser?.email, loadingAuth]);

  useEffect(() => {
    const fetchForm = async () => {
      setLoadingForm(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/forms/public/${encodeURIComponent(params.publicToken)}/config`);
        if (!res.ok) throw new Error('Form not found or not published yet.');
        const data = await res.json();
        setForm(data.form as FormDefinition);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not load form';
        setLoadError(message);
        toast({ variant: 'destructive', title: 'Forms', description: message });
      } finally {
        setLoadingForm(false);
      }
    };
    void fetchForm();
  }, [params.publicToken, toast]);

  useEffect(() => {
    if (!form || submitted) return;
    const profile = currentUser
      ? {
          name: formatProfileName(currentUser),
          email: currentUser.email,
          phone: currentUser.phone,
          birthday: currentUser.birthday,
        }
      : null;
    setAnswers(buildInitialAnswers(form, profile));
    setFieldErrors(null);
  }, [form, currentUser, submitted]);

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const askForEmail = !currentUser && !hasEmailField;
  const canSubmit = !!form && !submitting;

  const handleAnswersChange = (next: Record<string, FormAnswerValue>) => {
    setAnswers(next);
    if (fieldErrors) setFieldErrors(null);
    if (hasEmailField) {
      const emailField = findFirstEmailField(form?.fields ?? []);
      if (emailField) {
        const fromField = next[emailField.id];
        if (typeof fromField === 'string') setEmail(fromField);
      }
    }
  };

  const resolveSubmitEmail = (): string => {
    if (hasEmailField && form) {
      const emailField = findFirstEmailField(form.fields);
      if (emailField) {
        const fromField = answers[emailField.id];
        if (typeof fromField === 'string' && fromField.trim()) return fromField.trim();
      }
    }
    return email.trim();
  };

  const handleSubmit = async () => {
    if (!form) return;

    const submitEmail = resolveSubmitEmail();
    if (!isValidEmail(submitEmail)) {
      setEmailTouched(true);
      if (hasEmailField) {
        const emailField = findFirstEmailField(form.fields);
        if (emailField) {
          setFieldErrors({ [emailField.id]: 'Enter a valid email address.' });
        }
      }
      toast({ variant: 'destructive', title: 'Email required', description: 'Enter a valid email to submit.' });
      return;
    }

    const { errorsByFieldId } = validateFormResponse(form, answers);
    if (Object.keys(errorsByFieldId).length > 0) {
      setFieldErrors(errorsByFieldId);
      toast({
        variant: 'destructive',
        title: 'Almost there',
        description: 'Please fill in the required fields marked below.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const token = currentUser ? await auth.currentUser?.getIdToken() : null;
      const res = await fetch(`/api/forms/public/${encodeURIComponent(params.publicToken)}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: submitEmail, answers }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Submit failed', description: data.error || 'Try again.' });
        return;
      }

      const responseId: string = data.responseId;
      if (!responseId) throw new Error('Missing responseId');

      const serverErrors =
        data.errorsByFieldId && typeof data.errorsByFieldId === 'object'
          ? (data.errorsByFieldId as Record<string, string>)
          : null;

      if (serverErrors && Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
        toast({
          variant: 'destructive',
          title: 'Fix required fields',
          description: 'Some answers still need attention.',
        });
        window.location.href = `/forms/guest/${encodeURIComponent(form.id)}/${encodeURIComponent(responseId)}`;
        return;
      }

      setSubmitted(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not submit form';
      toast({ variant: 'destructive', title: 'Submit failed', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAuth || loadingForm) return <PageLoading />;

  if (!form) {
    return (
      <div className="page-container">
        <div className="ui-card p-4 md:p-6 space-y-2">
          <h1 className="text-page-title">Form unavailable</h1>
          <p className="text-sm text-muted-foreground">
            {loadError ?? 'This form could not be found. Ask an admin for a fresh link.'}
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page-container">
        <FormSubmitThanks formTitle={form.title} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="ui-card p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-page-title">{form.title}</h1>
          {form.description ? <p className="text-sm text-muted-foreground">{form.description}</p> : null}
          {form.deadlineDate ? (
            <p className="text-xs text-muted-foreground">Deadline: {form.deadlineDate}</p>
          ) : null}
        </div>

        {askForEmail ? (
          <div className="space-y-2">
            <Label htmlFor="guestEmail">Your email</Label>
            <Input
              id="guestEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@example.com"
              aria-invalid={emailTouched && !emailValid}
              className={emailTouched && !emailValid ? 'border-destructive focus-visible:ring-destructive' : undefined}
            />
            {emailTouched && !emailValid ? (
              <p className="text-xs text-destructive" role="alert">
                Enter a valid email address.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                We use this to save your response so you can come back later.
              </p>
            )}
          </div>
        ) : currentUser && !hasEmailField ? (
          <p className="text-sm text-muted-foreground">
            Submitting as <span className="font-medium text-foreground">{email}</span>
          </p>
        ) : null}

        <FormRenderer
          form={form}
          value={answers}
          onChange={handleAnswersChange}
          errorsByFieldId={fieldErrors}
          readOnly={submitting}
          profileLinkedHint={!!currentUser}
        />

        <div className="flex justify-end gap-3 pt-1">
          <Button className="rounded-xl min-w-28" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? <LoadingSpinner /> : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
