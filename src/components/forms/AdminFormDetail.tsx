"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/contexts/auth-context';
import { useAllUsers } from '@/hooks/use-all-users';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import { db } from '@/lib/firebase';
import type { AppRole } from '@/types';
import type { FormDefinition, FormFieldDefinition, FormAnswerValue } from '@/types/forms';
import {
  defaultLabelForFieldType,
  FORM_FIELD_TYPE_LABELS,
  isChoiceFieldType,
  isDateFieldType,
  isProfileReferenceFieldType,
  serializeFieldForFirestore,
} from '@/lib/forms/field-types';
import { buildInitialAnswers, formatProfileName } from '@/lib/forms/prefill';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FormRenderer from '@/components/forms/FormRenderer';
import FieldOptionsEditor from '@/components/forms/FieldOptionsEditor';
import WeekdaySelector from '@/components/forms/WeekdaySelector';
import { useToast } from '@/hooks/use-toast';
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
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Plus,
  Save as SaveIcon,
  Trash2,
} from 'lucide-react';

const NONE_SELECT_VALUE = '__none__';

function createFieldId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultField(order: number, type: FormFieldDefinition['type'] = 'text'): FormFieldDefinition {
  return {
    id: createFieldId(),
    label: defaultLabelForFieldType(type, order),
    type,
    order,
    required: type === 'contactName' || type === 'contactEmail',
    options: isChoiceFieldType(type) ? [] : undefined,
    conditional: undefined,
    visibility: undefined,
  };
}

function sanitizeFieldForApi(f: FormFieldDefinition): Record<string, unknown> {
  return serializeFieldForFirestore(f);
}

type Props = {
  /** Existing form id, or null when creating. */
  formId: string | null;
};

export default function AdminFormDetailPage({ formId: initialFormId }: Props) {
  const isNew = initialFormId === null;
  const { isAdmin, loadingAuth, currentUser } = useAuth();
  const { allUsers, refreshUsers } = useAllUsers();
  const { toast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [formId, setFormId] = useState<string | null>(initialFormId);
  const [formMeta, setFormMeta] = useState<FormDefinition | null>(null);
  const [activeTab, setActiveTab] = useState('build');

  const [builderTitle, setBuilderTitle] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderStatus, setBuilderStatus] = useState<'draft' | 'published'>('draft');
  const [builderDeadlineDate, setBuilderDeadlineDate] = useState('');
  const [builderMaxResponses, setBuilderMaxResponses] = useState('');
  const [builderAllowedRoleIds, setBuilderAllowedRoleIds] = useState<string[]>([]);
  const [builderAllowedUserIds, setBuilderAllowedUserIds] = useState<string[]>([]);
  const [builderFields, setBuilderFields] = useState<FormFieldDefinition[]>([]);
  const [expandedConditional, setExpandedConditional] = useState<Record<string, boolean>>({});
  const [savingBuilder, setSavingBuilder] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);

  const [accessOptionsOpen, setAccessOptionsOpen] = useState(false);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [accessOptionsLoading, setAccessOptionsLoading] = useState(false);
  const [accessOptionsLoaded, setAccessOptionsLoaded] = useState(false);

  const [previewAnswers, setPreviewAnswers] = useState<Record<string, FormAnswerValue>>({});

  const roleOptions: MultiSelectItem[] = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  );

  const userOptions: MultiSelectItem[] = useMemo(
    () =>
      allUsers.map((u) => ({
        value: u.uid,
        label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || u.uid,
      })),
    [allUsers],
  );

  const previewForm = useMemo((): FormDefinition => {
    return {
      id: formId ?? 'preview',
      title: builderTitle.trim() || 'Untitled form',
      description: builderDescription.trim() || undefined,
      fields: [...builderFields].sort((a, b) => a.order - b.order),
      status: builderStatus,
      deadlineDate: builderDeadlineDate || undefined,
      maxResponses: builderMaxResponses ? Number(builderMaxResponses) : undefined,
      createdAt: formMeta?.createdAt as FormDefinition['createdAt'],
      publicToken: formMeta?.publicToken,
      allowedRoleIds: builderAllowedRoleIds,
      allowedUserIds: builderAllowedUserIds,
      responseCount: formMeta?.responseCount,
    };
  }, [
    formId,
    builderTitle,
    builderDescription,
    builderFields,
    builderStatus,
    builderDeadlineDate,
    builderMaxResponses,
    formMeta,
    builderAllowedRoleIds,
    builderAllowedUserIds,
  ]);

  const publicPath = formMeta?.publicToken ? `/forms/public/${formMeta.publicToken}` : null;

  const loadAccessOptions = async () => {
    if (accessOptionsLoaded || accessOptionsLoading) return;
    setAccessOptionsLoading(true);
    try {
      await refreshUsers();
      const rolesSnap = await getDocs(query(collection(db, 'roles'), orderBy('name', 'asc')));
      const rolesData: AppRole[] = [];
      rolesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status !== 'archived') {
          rolesData.push({ ...data, id: docSnap.id } as AppRole);
        }
      });
      setRoles(rolesData);
      setAccessOptionsLoaded(true);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not load access options';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setAccessOptionsLoading(false);
    }
  };

  const applyFormToBuilder = (form: FormDefinition) => {
    setFormMeta(form);
    setFormId(form.id);
    setBuilderTitle(form.title ?? '');
    setBuilderDescription(form.description ?? '');
    setBuilderStatus(form.status === 'draft' ? 'draft' : 'published');
    setBuilderDeadlineDate(form.deadlineDate ?? '');
    setBuilderMaxResponses(
      typeof form.maxResponses === 'number' && form.maxResponses > 0 ? String(form.maxResponses) : '',
    );
    setBuilderAllowedRoleIds(form.allowedRoleIds ?? []);
    setBuilderAllowedUserIds(form.allowedUserIds ?? []);
    setBuilderFields([...form.fields].sort((a, b) => a.order - b.order));
    setExpandedConditional({});
    setLinkCopied(false);
  };

  useEffect(() => {
    if (loadingAuth || !isAdmin) return;
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!initialFormId) return;

    const fetchForm = async () => {
      setLoading(true);
      try {
        const headers = await getClientAuthHeaders();
        const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(initialFormId)}`, {
          headers,
        });
        if (!res.ok) throw new Error('Form not found');
        const data = await res.json();
        applyFormToBuilder(data.form as FormDefinition);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load form';
        toast({ variant: 'destructive', title: 'Forms', description: message });
        router.replace('/admin/forms');
      } finally {
        setLoading(false);
      }
    };

    void fetchForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth, isAdmin, isNew, initialFormId]);

  useEffect(() => {
    const profile = currentUser
      ? {
          name: formatProfileName(currentUser),
          email: currentUser.email,
          phone: currentUser.phone,
          birthday: currentUser.birthday,
        }
      : null;
    setPreviewAnswers(buildInitialAnswers(previewForm, profile));
    // Only reset when field set identity changes meaningfully.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    builderFields,
    currentUser?.uid,
    currentUser?.email,
    currentUser?.phone,
    currentUser?.birthday,
    currentUser?.firstName,
    currentUser?.lastName,
  ]);

  if (!loadingAuth && !isAdmin) {
    return (
      <div className="page-container">
        <PageHeader title="Admin • Forms" />
        <EmptyState title="Permission denied" description="Sign in as an admin to manage forms." />
      </div>
    );
  }

  if (loading) return <PageLoading />;

  const canSaveBuilder = builderTitle.trim().length > 0;
  const responseCount = formMeta?.responseCount ?? 0;

  const handleSaveBuilder = async () => {
    if (!canSaveBuilder) return;
    setSavingBuilder(true);
    try {
      const headers = await getClientAuthHeaders();
      const payload = {
        title: builderTitle.trim(),
        description: builderDescription.trim() || undefined,
        status: builderStatus,
        deadlineDate: builderDeadlineDate || undefined,
        maxResponses: builderMaxResponses.trim() ? Number(builderMaxResponses) : null,
        allowedRoleIds: builderAllowedRoleIds,
        allowedUserIds: builderAllowedUserIds,
        fields: [...builderFields].sort((a, b) => a.order - b.order).map(sanitizeFieldForApi),
      };

      if (formId) {
        const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(formId)}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.details || data.error || 'Failed to update form');
        const refreshed = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(formId)}`, {
          headers,
        }).then((r) => r.json());
        if (refreshed.form) applyFormToBuilder(refreshed.form as FormDefinition);
        toast({ title: 'Form saved' });
      } else {
        const res = await fetch('/api/forms/admin/definitions', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.details || data.error || 'Failed to create form');
        const newId = typeof data.formId === 'string' ? data.formId : null;
        if (!newId) throw new Error('Missing form id');
        toast({ title: 'Form created' });
        router.replace(`/admin/forms/${encodeURIComponent(newId)}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setSavingBuilder(false);
    }
  };

  const setField = (fieldId: string, patch: Partial<FormFieldDefinition>) => {
    setBuilderFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  };

  const addField = (type: FormFieldDefinition['type'] = 'text') => {
    setBuilderFields((prev) => {
      const nextOrder = prev.length ? Math.max(...prev.map((f) => f.order)) + 1 : 0;
      return [...prev, defaultField(nextOrder, type)];
    });
  };

  const moveFieldOrder = (fieldId: string, delta: number) => {
    setBuilderFields((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order).map((f) => ({ ...f }));
      const idx = sorted.findIndex((f) => f.id === fieldId);
      if (idx < 0) return prev;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= sorted.length) return prev;
      const aOrder = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[nextIdx].order };
      sorted[nextIdx] = { ...sorted[nextIdx], order: aOrder };
      return sorted;
    });
  };

  const copyPublicLink = async () => {
    if (!publicPath) return;
    const absolute = `${window.location.origin}${publicPath}`;
    try {
      await navigator.clipboard.writeText(absolute);
      setLinkCopied(true);
      toast({ title: 'Link copied' });
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy link' });
    }
  };

  const handleDelete = async () => {
    if (!formId) return;
    setBusyDelete(true);
    try {
      const headers = await getClientAuthHeaders();
      const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(formId)}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Delete failed');
      toast({ title: 'Form deleted' });
      router.push('/admin/forms');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Delete failed';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setBusyDelete(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="page-container">
      <div className="mb-4">
        <Button asChild variant="ghost" className="rounded-xl -ml-2 mb-2">
          <Link href="/admin/forms">
            <ArrowLeft className="h-4 w-4" />
            All forms
          </Link>
        </Button>
        <PageHeader
          title={isNew ? 'New form' : builderTitle || formMeta?.title || 'Edit form'}
          description={
            isNew
              ? 'Add questions, then save. You can publish and share a guest link afterward.'
              : 'Edit questions and preview. Open Responses from the Forms hub to review submissions.'
          }
        />
      </div>

      <div className="ui-card p-4 md:p-6 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 space-y-2">
            {publicPath ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-xs text-muted-foreground break-all min-w-0">{publicPath}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl shrink-0"
                  onClick={() => void copyPublicLink()}
                  disabled={builderStatus === 'draft'}
                >
                  {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {linkCopied ? 'Copied' : 'Copy link'}
                </Button>
                {builderStatus === 'draft' ? (
                  <span className="text-xs text-muted-foreground">Publish to share this link.</span>
                ) : (
                  <Badge variant="success">Live</Badge>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Save the form to generate a shareable guest link.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {formId ? (
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={`/admin/forms/${encodeURIComponent(formId)}/responses`}>
                  Responses
                  {responseCount > 0 ? ` (${responseCount})` : ''}
                </Link>
              </Button>
            ) : null}
            {formId ? (
              <Button
                variant="outline"
                className="rounded-xl text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : null}
            <Button
              className="rounded-xl"
              onClick={() => void handleSaveBuilder()}
              disabled={!canSaveBuilder || savingBuilder}
            >
              <SaveIcon className="h-4 w-4 mr-2" />
              {savingBuilder ? 'Saving…' : formId ? 'Save changes' : 'Create form'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="build">Build</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-3.5 w-3.5" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="build" className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="form-title">Title</Label>
              <Input
                id="form-title"
                value={builderTitle}
                onChange={(e) => setBuilderTitle(e.target.value)}
                placeholder="e.g. Weekend retreat signup"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-description">Description (optional)</Label>
              <Textarea
                id="form-description"
                value={builderDescription}
                onChange={(e) => setBuilderDescription(e.target.value)}
                placeholder="Short instructions for people filling this out"
                rows={3}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={builderStatus} onValueChange={(v) => setBuilderStatus(v as 'draft' | 'published')}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (not shareable)</SelectItem>
                    <SelectItem value="published">Published (live link)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-deadline">Deadline (optional)</Label>
                <Input
                  id="form-deadline"
                  type="date"
                  value={builderDeadlineDate}
                  onChange={(e) => setBuilderDeadlineDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-max-responses">Max responses (optional)</Label>
                <Input
                  id="form-max-responses"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder="Unlimited"
                  value={builderMaxResponses}
                  onChange={(e) => setBuilderMaxResponses(e.target.value.replace(/[^\d]/g, ''))}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no limit
                  {formMeta?.responseCount != null && builderMaxResponses
                    ? ` · ${formMeta.responseCount} so far`
                    : ''}
                  .
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 p-3">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => {
                  const next = !accessOptionsOpen;
                  setAccessOptionsOpen(next);
                  if (next) void loadAccessOptions();
                }}
              >
                <div>
                  <Label>Who can see this (signed-in)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {builderAllowedRoleIds.length === 0 && builderAllowedUserIds.length === 0
                      ? 'Open to everyone (default)'
                      : 'Restricted to selected roles/people'}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${accessOptionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {accessOptionsOpen ? (
                <div className="space-y-3 pt-3 border-t border-border/50 mt-3">
                  <p className="text-xs text-muted-foreground">
                    Leave both empty so every signed-in member can open it. Guests always use the public link.
                  </p>
                  {accessOptionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading roles and people…</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Roles</Label>
                        <MultiSelect
                          options={roleOptions}
                          selected={builderAllowedRoleIds}
                          onChange={setBuilderAllowedRoleIds}
                          placeholder="Everyone (or pick roles)"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">People</Label>
                        <MultiSelect
                          options={userOptions}
                          selected={builderAllowedUserIds}
                          onChange={setBuilderAllowedUserIds}
                          placeholder="Everyone (or pick people)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
              <div>
                <h3 className="text-section-title">Questions</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {builderFields.length === 0
                    ? 'Add questions people will answer.'
                    : `${builderFields.length} question${builderFields.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => addField('name')}>
                  + Profile name
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('email')}>
                  + Profile email
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('contactName')}>
                  + Name question
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('contactEmail')}>
                  + Email question
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('phone')}>
                  + Phone
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('birthday')}>
                  + Birthday
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('date')}>
                  + Date
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('dates')}>
                  + Multiple dates
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('yesno')}>
                  + Yes/No
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('text')}>
                  <Plus className="h-4 w-4" />
                  Add question
                </Button>
              </div>
            </div>

            {builderFields.length === 0 ? (
              <EmptyState
                title="No questions yet"
                description="Add Name, Email, Date, Yes/No, or any question type below."
              />
            ) : (
              <div className="space-y-3">
                {[...builderFields]
                  .sort((a, b) => a.order - b.order)
                  .map((field, idx) => {
                    const dependsOnOptions = [...builderFields]
                      .filter((f) => f.id !== field.id)
                      .sort((a, b) => a.order - b.order);
                    const dependsOnField = dependsOnOptions.find(
                      (f) => f.id === field.conditional?.dependsOnFieldId,
                    );
                    const equalsChoices =
                      dependsOnField && isChoiceFieldType(dependsOnField.type)
                        ? dependsOnField.options ?? []
                        : null;
                    const showConditional =
                      expandedConditional[field.id] || !!field.conditional?.dependsOnFieldId;

                    return (
                      <div
                        key={field.id}
                        className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              Question {idx + 1}
                              {isProfileReferenceFieldType(field.type)
                                ? ' · Profile · shown read-only'
                                : field.type === 'phone' || field.type === 'birthday'
                                  ? ' · Linked to profile'
                                  : ''}
                            </p>
                            <p className="text-sm font-semibold truncate">
                              {field.label.trim() || 'Untitled question'}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-xl h-8 w-8"
                              disabled={idx === 0}
                              onClick={() => moveFieldOrder(field.id, -1)}
                              aria-label="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-xl h-8 w-8"
                              disabled={idx === builderFields.length - 1}
                              onClick={() => moveFieldOrder(field.id, +1)}
                              aria-label="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-xl h-8 w-8 text-destructive"
                              onClick={() =>
                                setBuilderFields((prev) =>
                                  prev
                                    .filter((f) => f.id !== field.id)
                                    .map((f, i) => ({ ...f, order: i })),
                                )
                              }
                              aria-label="Remove question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => setField(field.id, { label: e.target.value })}
                              placeholder="What are you asking?"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Answer type</Label>
                            <Select
                              value={field.type}
                              onValueChange={(v) => {
                                const nextType = v as FormFieldDefinition['type'];
                                setField(field.id, {
                                  type: nextType,
                                  label:
                                    field.label === defaultLabelForFieldType(field.type, idx) ||
                                    !field.label.trim()
                                      ? defaultLabelForFieldType(nextType, idx)
                                      : field.label,
                                  options: isChoiceFieldType(nextType) ? field.options ?? [] : undefined,
                                  dateConfig: isDateFieldType(nextType) ? field.dateConfig : undefined,
                                  required:
                                    nextType === 'contactName' || nextType === 'contactEmail'
                                      ? true
                                      : field.required,
                                });
                              }}
                            >
                              <SelectTrigger className="h-10 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(FORM_FIELD_TYPE_LABELS) as FormFieldDefinition['type'][]).map(
                                  (type) => (
                                    <SelectItem key={type} value={type}>
                                      {FORM_FIELD_TYPE_LABELS[type]}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {isProfileReferenceFieldType(field.type) ? (
                          <p className="text-xs text-muted-foreground">
                            Shown read-only so people can see their profile {field.type} will be included.
                            For signed-in members it is saved on the response for your report (not editable).
                          </p>
                        ) : null}

                        {(field.type === 'phone' || field.type === 'birthday') && (
                          <p className="text-xs text-muted-foreground">
                            Signed-in members see their profile {field.type} pre-filled, and submitting updates their
                            profile. Guests type it in for this response only.
                          </p>
                        )}

                        {(field.type === 'contactName' || field.type === 'contactEmail') && (
                          <p className="text-xs text-muted-foreground">
                            Shown on the form as a normal question anyone can answer (separate from profile).
                          </p>
                        )}

                        <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
                          <Checkbox
                            checked={field.required}
                            onCheckedChange={(checked) =>
                              setField(field.id, { required: checked === true })
                            }
                          />
                          Required
                        </label>

                        {isChoiceFieldType(field.type) && (
                          <FieldOptionsEditor
                            options={field.options ?? []}
                            onChange={(options) => setField(field.id, { options })}
                          />
                        )}

                        {isDateFieldType(field.type) && (
                          <WeekdaySelector
                            value={field.dateConfig?.allowedWeekdays ?? []}
                            onChange={(allowedWeekdays) =>
                              setField(field.id, {
                                dateConfig: allowedWeekdays.length > 0 ? { allowedWeekdays } : undefined,
                              })
                            }
                          />
                        )}

                        <div className="space-y-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setExpandedConditional((prev) => ({
                                ...prev,
                                [field.id]: !showConditional,
                              }))
                            }
                          >
                            {showConditional ? 'Hide conditional rule' : 'Show only when…'}
                          </button>

                          {showConditional ? (
                            <div className="grid gap-2 md:grid-cols-2 rounded-xl border border-border/50 bg-background/60 p-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs">Depends on</Label>
                                <Select
                                  value={field.conditional?.dependsOnFieldId ?? NONE_SELECT_VALUE}
                                  onValueChange={(v) => {
                                    if (v === NONE_SELECT_VALUE) {
                                      setField(field.id, { conditional: undefined });
                                    } else {
                                      setField(field.id, {
                                        conditional: {
                                          dependsOnFieldId: v,
                                          equals: field.conditional?.equals ?? '',
                                        },
                                      });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-10 rounded-xl">
                                    <SelectValue placeholder="Another question…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={NONE_SELECT_VALUE}>Always show</SelectItem>
                                    {dependsOnOptions.map((opt) => (
                                      <SelectItem key={opt.id} value={opt.id}>
                                        {opt.label.trim() || 'Untitled'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">Equals</Label>
                                {equalsChoices && equalsChoices.length > 0 ? (
                                  <Select
                                    value={field.conditional?.equals || undefined}
                                    disabled={!field.conditional?.dependsOnFieldId}
                                    onValueChange={(equals) => {
                                      setField(field.id, {
                                        conditional: field.conditional
                                          ? { ...field.conditional, equals }
                                          : undefined,
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="h-10 rounded-xl">
                                      <SelectValue placeholder="Pick a value…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {equalsChoices.map((opt) => (
                                        <SelectItem key={opt} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={field.conditional?.equals ?? ''}
                                    disabled={!field.conditional?.dependsOnFieldId}
                                    onChange={(e) => {
                                      const equals = e.target.value;
                                      setField(field.id, {
                                        conditional: field.conditional
                                          ? { ...field.conditional, equals }
                                          : undefined,
                                      });
                                    }}
                                    placeholder="Exact answer to match"
                                  />
                                )}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 space-y-3">
              <p className="text-sm font-medium">Add another question</p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'text',
                    'textarea',
                    'select',
                    'checkbox',
                    'yesno',
                    'name',
                    'email',
                    'contactName',
                    'contactEmail',
                    'phone',
                    'birthday',
                    'number',
                    'date',
                    'dates',
                    'time',
                    'url',
                  ] as const
                ).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => addField(type)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {FORM_FIELD_TYPE_LABELS[type]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                {canSaveBuilder
                  ? formId
                    ? 'Ready to save your changes.'
                    : 'Add a title above, then create the form when you’re ready.'
                  : 'Enter a form title above to create this form.'}
              </p>
              <Button
                className="rounded-xl w-full sm:w-auto"
                onClick={() => void handleSaveBuilder()}
                disabled={!canSaveBuilder || savingBuilder}
              >
                <SaveIcon className="h-4 w-4 mr-2" />
                {savingBuilder ? 'Saving…' : formId ? 'Save changes' : 'Create form'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Preview only — answers here are not saved as a submission.
            </p>
            <div className="rounded-xl border border-border/60 bg-background p-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{previewForm.title}</h3>
                {previewForm.description ? (
                  <p className="text-sm text-muted-foreground">{previewForm.description}</p>
                ) : null}
                {previewForm.deadlineDate ? (
                  <p className="text-xs text-muted-foreground">Deadline: {previewForm.deadlineDate}</p>
                ) : null}
                {typeof previewForm.maxResponses === 'number' && previewForm.maxResponses > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Limit: {previewForm.responseCount ?? 0} / {previewForm.maxResponses} responses
                  </p>
                ) : null}
              </div>
              <FormRenderer
                form={previewForm}
                value={previewAnswers}
                onChange={setPreviewAnswers}
                profileLinkedHint={!!currentUser}
              />
            </div>
          </TabsContent>

        </Tabs>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !busyDelete && setConfirmDelete(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this form?</AlertDialogTitle>
            <AlertDialogDescription>
              “{builderTitle || formMeta?.title || 'This form'}” and its submissions will be removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyDelete}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busyDelete ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
