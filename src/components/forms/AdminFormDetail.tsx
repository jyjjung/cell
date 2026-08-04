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
import type { FormDefinition, FormFieldDefinition, FormAnswerValue, FormResponse } from '@/types/forms';
import {
  defaultLabelForFieldType,
  FORM_FIELD_TYPE_LABELS,
  isChoiceFieldType,
  serializeFieldForFirestore,
} from '@/lib/forms/field-types';
import { buildInitialAnswers, formatProfileName } from '@/lib/forms/prefill';
import { toMillisSafe } from '@/lib/firestore-timestamp';
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
import ReportPanel from '@/components/forms/ReportPanel';
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
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  Link2,
  Pencil,
  Plus,
  Save as SaveIcon,
  Share2,
  Trash2,
  X,
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
    required: type === 'name' || type === 'email',
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

  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [responsesCursor, setResponsesCursor] = useState<string | null>(null);
  const [loadingMoreResponses, setLoadingMoreResponses] = useState(false);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [editingAnswers, setEditingAnswers] = useState(false);
  const [guestLinkCopied, setGuestLinkCopied] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const editingResponse = useMemo(() => {
    if (!editingResponseId) return null;
    return responses.find((r) => r.id === editingResponseId) ?? null;
  }, [responses, editingResponseId]);

  const previewForm = useMemo((): FormDefinition => {
    return {
      id: formId ?? 'preview',
      title: builderTitle.trim() || 'Untitled form',
      description: builderDescription.trim() || undefined,
      fields: [...builderFields].sort((a, b) => a.order - b.order),
      status: builderStatus,
      deadlineDate: builderDeadlineDate || undefined,
      createdAt: formMeta?.createdAt as FormDefinition['createdAt'],
      publicToken: formMeta?.publicToken,
      allowedRoleIds: builderAllowedRoleIds,
      allowedUserIds: builderAllowedUserIds,
    };
  }, [
    formId,
    builderTitle,
    builderDescription,
    builderFields,
    builderStatus,
    builderDeadlineDate,
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

  const refreshResponses = async (id: string, options?: { append?: boolean; cursor?: string | null }) => {
    try {
      if (options?.append) setLoadingMoreResponses(true);
      const headers = await getClientAuthHeaders();
      const params = new URLSearchParams({ limit: '50' });
      if (options?.cursor) params.set('cursor', options.cursor);
      const res = await fetch(
        `/api/forms/admin/definitions/${encodeURIComponent(id)}/responses?${params.toString()}`,
        { headers },
      );
      if (!res.ok) throw new Error('Failed to load responses');
      const data = await res.json();
      const next = Array.isArray(data.responses) ? (data.responses as FormResponse[]) : [];
      setResponses((prev) => (options?.append ? [...prev, ...next] : next));
      setResponsesCursor(typeof data.nextCursor === 'string' ? data.nextCursor : null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load responses';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    } finally {
      setLoadingMoreResponses(false);
    }
  };

  useEffect(() => {
    if (!formId) {
      setResponses([]);
      setResponsesCursor(null);
      setEditingResponseId(null);
      setEditingAnswers(false);
      return;
    }
    void refreshResponses(formId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

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
  const needsAttentionCount = formMeta?.needsAttentionCount ?? 0;
  const responseCount = formMeta?.responseCount ?? responses.length;

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
              : 'Edit questions, preview the form, and review submissions.'
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
            <TabsTrigger value="submissions" disabled={!formId}>
              Responses
              {needsAttentionCount > 0 ? (
                <Badge variant="destructive" className="ml-1">
                  {needsAttentionCount}
                </Badge>
              ) : responseCount > 0 ? (
                <Badge variant="secondary" className="ml-1">
                  {responseCount}
                </Badge>
              ) : null}
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

            <div className="grid gap-3 md:grid-cols-2">
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
                  + Name
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => addField('email')}>
                  + Email
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
                              {field.type === 'name' ||
                              field.type === 'email' ||
                              field.type === 'phone' ||
                              field.type === 'birthday'
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
                                  required:
                                    nextType === 'name' || nextType === 'email' ? true : field.required,
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

                        {(field.type === 'name' ||
                          field.type === 'email' ||
                          field.type === 'phone' ||
                          field.type === 'birthday') && (
                          <p className="text-xs text-muted-foreground">
                            Signed-in members see their profile {field.type} pre-filled, and submitting updates their
                            profile. Guests type it in for this response only.
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
                    'phone',
                    'birthday',
                    'number',
                    'date',
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
              </div>
              <FormRenderer
                form={previewForm}
                value={previewAnswers}
                onChange={setPreviewAnswers}
                profileLinkedHint={!!currentUser}
              />
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-4">
            {!formId ? (
              <EmptyState title="Save the form first" description="Create the form, then review submissions here." />
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-section-title">Responses</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {responseCount} total
                      {needsAttentionCount > 0 ? ` · ${needsAttentionCount} need attention` : ''}
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-xl" onClick={() => void refreshResponses(formId)}>
                    Refresh
                  </Button>
                </div>

                {responses.length === 0 ? (
                  <EmptyState
                    title="No submissions yet"
                    description="Share the public link once the form is published."
                  />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        All responses
                      </p>
                      {responses.map((r) => {
                        const errs = r.lastValidationErrors ?? {};
                        const hasErrors = Object.keys(errs).length > 0;
                        const updatedMs = toMillisSafe(r.updatedAt);
                        const selected = editingResponseId === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setEditingResponseId(r.id);
                              setDraftAnswers(r.answers ?? {});
                              setEditingAnswers(false);
                              setGuestLinkCopied(false);
                            }}
                            className={`w-full text-left rounded-xl border px-3.5 py-3 transition-colors ${
                              selected
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

                      {responsesCursor ? (
                        <div className="flex justify-center pt-1">
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            disabled={loadingMoreResponses}
                            onClick={() =>
                              void refreshResponses(formId, { append: true, cursor: responsesCursor })
                            }
                          >
                            {loadingMoreResponses ? 'Loading…' : 'Load more'}
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background p-4 space-y-4 min-h-[240px]">
                      {!editingResponse || !formMeta ? (
                        <div className="flex h-full min-h-[200px] items-center justify-center">
                          <p className="text-sm text-muted-foreground text-center px-4">
                            Select a response to view its report.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Report
                              </p>
                              <h3 className="text-section-title truncate mt-0.5">
                                {editingResponse.submitterEmail}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Updated{' '}
                                {toMillisSafe(editingResponse.updatedAt)
                                  ? new Date(toMillisSafe(editingResponse.updatedAt)).toLocaleString()
                                  : '—'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={async () => {
                                  const path = `/forms/guest/${encodeURIComponent(formMeta.id)}/${encodeURIComponent(editingResponse.id)}`;
                                  const absolute = `${window.location.origin}${path}`;
                                  try {
                                    await navigator.clipboard.writeText(absolute);
                                    setGuestLinkCopied(true);
                                    window.setTimeout(() => setGuestLinkCopied(false), 2000);
                                    toast({
                                      title: 'Guest link copied',
                                      description: 'Share this so they can open or update their response.',
                                    });
                                  } catch {
                                    toast({
                                      variant: 'destructive',
                                      title: 'Copy failed',
                                      description: absolute,
                                    });
                                  }
                                }}
                              >
                                {guestLinkCopied ? (
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                ) : (
                                  <Share2 className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {guestLinkCopied ? 'Copied' : 'Share with guest'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                asChild
                              >
                                <Link
                                  href={`/forms/guest/${encodeURIComponent(formMeta.id)}/${encodeURIComponent(editingResponse.id)}`}
                                  target="_blank"
                                >
                                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                                  Open guest view
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => {
                                  setEditingResponseId(null);
                                  setEditingAnswers(false);
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          {!editingAnswers ? (
                            <ReportPanel
                              form={formMeta}
                              response={{ ...editingResponse, answers: editingResponse.answers ?? {} }}
                              compactHeader
                            />
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                Edit answers below, then save. CSV/PDF use the saved report view.
                              </p>
                              <FormRenderer
                                form={formMeta}
                                value={draftAnswers}
                                onChange={setDraftAnswers}
                                errorsByFieldId={editingResponse.lastValidationErrors ?? null}
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={() => {
                                    setDraftAnswers(editingResponse.answers ?? {});
                                    toast({ title: 'Reverted', description: 'Draft reset to saved answers.' });
                                  }}
                                >
                                  Revert
                                </Button>
                                <Button
                                  className="rounded-xl"
                                  disabled={saving}
                                  onClick={async () => {
                                    setSaving(true);
                                    try {
                                      const headers = await getClientAuthHeaders();
                                      const res = await fetch(
                                        `/api/forms/admin/definitions/${encodeURIComponent(formMeta.id)}/responses/${encodeURIComponent(editingResponse.id)}`,
                                        {
                                          method: 'PUT',
                                          headers: { ...headers, 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ answers: draftAnswers }),
                                        },
                                      );
                                      const data = await res.json().catch(() => ({}));
                                      if (!res.ok) throw new Error(data.error || 'Save failed');
                                      await refreshResponses(formMeta.id);
                                      setEditingAnswers(false);
                                      toast({ title: 'Saved' });
                                    } catch (e: unknown) {
                                      const message = e instanceof Error ? e.message : 'Save failed';
                                      toast({ variant: 'destructive', title: 'Forms', description: message });
                                    } finally {
                                      setSaving(false);
                                    }
                                  }}
                                >
                                  <SaveIcon className="h-4 w-4 mr-2" />
                                  Save answers
                                </Button>
                              </div>
                            </div>
                          )}

                          <div className="border-t border-border/60 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              onClick={() => {
                                setDraftAnswers(editingResponse.answers ?? {});
                                setEditingAnswers((v) => !v);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              {editingAnswers ? 'Back to report' : 'Edit answers'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
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
