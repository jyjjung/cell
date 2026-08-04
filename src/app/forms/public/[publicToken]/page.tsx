"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner, PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormRenderer from '@/components/forms/FormRenderer';
import type { FormAnswerValue, FormDefinition } from '@/types/forms';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function PublicFormPage({ params }: { params: { publicToken: string } }) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loadingForm, setLoadingForm] = useState(true);
  const [form, setForm] = useState<FormDefinition | null>(null);

  const [email, setEmail] = useState<string>('');
  const [emailTouched, setEmailTouched] = useState(false);

  const [answers, setAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loadingAuth) {
      const maybeEmail = typeof currentUser?.email === 'string' ? currentUser.email : '';
      if (maybeEmail) setEmail(maybeEmail);
    }
  }, [currentUser?.email, loadingAuth]);

  useEffect(() => {
    const fetchForm = async () => {
      setLoadingForm(true);
      try {
        const res = await fetch(`/api/forms/public/${encodeURIComponent(params.publicToken)}/config`);
        if (!res.ok) throw new Error('Form not found');
        const data = await res.json();
        setForm(data.form as FormDefinition);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Could not load form';
        toast({ variant: 'destructive', title: 'Forms', description: message });
      } finally {
        setLoadingForm(false);
      }
    };
    void fetchForm();
  }, [params.publicToken, toast]);

  useEffect(() => {
    if (!form) return;
    // Initialize answers for all fields so conditional evaluation has stable keys.
    const initial: Record<string, FormAnswerValue> = {};
    for (const field of form.fields) {
      if (field.type === 'checkbox') initial[field.id] = [];
      else initial[field.id] = '';
    }
    setAnswers(initial);
  }, [form]);

  const emailValid = useMemo(() => {
    const e = email.trim();
    return e.includes('@') && e.includes('.');
  }, [email]);

  const shouldAskForEmail = !currentUser && !email.trim();
  const canSubmit = !!form && emailValid && !submitting;

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    try {
      if (!emailValid) {
        setEmailTouched(true);
        return;
      }

      const res = await fetch(`/api/forms/public/${encodeURIComponent(params.publicToken)}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, answers }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Submit failed', description: data.error || 'Try again.' });
        return;
      }

      const responseId: string = data.responseId;
      if (!responseId) throw new Error('Missing responseId');

      const submittedOk = !data.errorsByFieldId || Object.keys(data.errorsByFieldId).length === 0;
      router.push(
        `/forms/guest/${encodeURIComponent(form.id)}/${encodeURIComponent(responseId)}${
          submittedOk ? '?submitted=1' : ''
        }`,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not submit form';
      toast({ variant: 'destructive', title: 'Submit failed', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAuth && loadingForm) return <PageLoading />;
  if (!form) return <div className="page-container">Form not found.</div>;

  return (
    <div className="page-container">
      <div className="ui-card p-4 md:p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-page-title">{form.title}</h1>
          {form.description ? <p className="text-sm text-muted-foreground">{form.description}</p> : null}
        </div>

        {emailTouched && !emailValid ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Please enter a valid email to continue.
          </div>
        ) : null}

        {(!currentUser || shouldAskForEmail) && (
          <div className="space-y-2">
            <Label htmlFor="guestEmail">Your email</Label>
            <Input
              id="guestEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="you@example.com"
              disabled={!!currentUser}
            />
          </div>
        )}

        <FormRenderer form={form} value={answers} onChange={setAnswers} readOnly={submitting} />

        <div className="flex justify-end gap-3">
          <Button
            className="rounded-xl"
            disabled={!canSubmit || !emailValid}
            onClick={() => void handleSubmit()}
          >
            {submitting ? <LoadingSpinner /> : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}

