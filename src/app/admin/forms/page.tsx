"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRoles } from '@/hooks/use-roles';
import { useAllUsers } from '@/hooks/use-all-users';
import { getClientAuthHeaders } from '@/lib/client-auth-headers';
import type { FormDefinition, FormFieldDefinition, FormAnswerValue, FormResponse } from '@/types/forms';
import { PageHeader, EmptyState } from '@/components/ui/page-layout';
import { PageLoading } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type MultiSelectItem } from '@/components/ui/multi-select';
import FormRenderer from '@/components/forms/FormRenderer';
import ReportPanel from '@/components/forms/ReportPanel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Plus, Save as SaveIcon } from 'lucide-react';

function createFieldId(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultField(order: number): FormFieldDefinition {
  return {
    id: createFieldId(),
    label: `Field ${order + 1}`,
    type: 'text',
    order,
    required: false,
    options: undefined,
    conditional: undefined,
    visibility: undefined,
  };
}

function sanitizeFieldForApi(f: FormFieldDefinition): any {
  return {
    id: f.id,
    label: f.label,
    type: f.type,
    order: f.order,
    required: f.required,
    options: f.type === 'select' || f.type === 'checkbox' ? f.options ?? [] : undefined,
    conditional: f.conditional
      ? { dependsOnFieldId: f.conditional.dependsOnFieldId, equals: f.conditional.equals }
      : undefined,
    visibility: f.visibility
      ? {
          allowedRoleIds: f.visibility.allowedRoleIds ?? [],
          allowedUserIds: f.visibility.allowedUserIds ?? [],
        }
      : undefined,
  };
}

export default function AdminFormsPage() {
  const { isAdmin, loadingAuth } = useAuth();
  const { roles, loading: loadingRoles } = useRoles();
  const { allUsers, loading: loadingUsers } = useAllUsers();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  // Builder state (new/edit)
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderStatus, setBuilderStatus] = useState<'draft' | 'published'>('draft');
  const [builderDeadlineDate, setBuilderDeadlineDate] = useState('');
  const [builderAllowedRoleIds, setBuilderAllowedRoleIds] = useState<string[]>([]);
  const [builderAllowedUserIds, setBuilderAllowedUserIds] = useState<string[]>([]);
  const [builderFields, setBuilderFields] = useState<FormFieldDefinition[]>([]);

  // Responses state
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, FormAnswerValue>>({});
  const [saving, setSaving] = useState(false);

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

  const selectedForm = useMemo(
    () => (selectedFormId ? forms.find((f) => f.id === selectedFormId) ?? null : null),
    [forms, selectedFormId],
  );

  const editingResponse = useMemo(() => {
    if (!editingResponseId) return null;
    return responses.find((r) => r.id === editingResponseId) ?? null;
  }, [responses, editingResponseId]);

  useEffect(() => {
    if (loadingAuth) return;
    if (!isAdmin) return;

    const fetchForms = async () => {
      setLoading(true);
      try {
        const headers = await getClientAuthHeaders();
        const res = await fetch('/api/forms/admin/definitions', { headers });
        if (!res.ok) throw new Error('Failed to load forms');
        const data = await res.json();
        const loaded = Array.isArray(data.forms) ? (data.forms as FormDefinition[]) : [];
        setForms(loaded);
        const first = loaded[0]?.id ?? null;
        setSelectedFormId(first);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load forms';
        toast({ variant: 'destructive', title: 'Forms', description: message });
      } finally {
        setLoading(false);
      }
    };

    void fetchForms();
  }, [loadingAuth, isAdmin, toast]);

  // Load builder state when selected form changes.
  useEffect(() => {
    if (!selectedForm) return;
    setBuilderTitle(selectedForm.title ?? '');
    setBuilderDescription(selectedForm.description ?? '');
    setBuilderStatus(selectedForm.status === 'draft' ? 'draft' : 'published');
    setBuilderDeadlineDate(selectedForm.deadlineDate ?? '');
    setBuilderAllowedRoleIds(selectedForm.allowedRoleIds ?? []);
    setBuilderAllowedUserIds(selectedForm.allowedUserIds ?? []);
    setBuilderFields([...selectedForm.fields].sort((a, b) => a.order - b.order));
  }, [selectedForm]);

  const refreshResponses = async (formId: string) => {
    try {
      const headers = await getClientAuthHeaders();
      const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(formId)}/responses`, { headers });
      if (!res.ok) throw new Error('Failed to load responses');
      const data = await res.json();
      setResponses(Array.isArray(data.responses) ? data.responses : []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load responses';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    }
  };

  useEffect(() => {
    if (!selectedFormId) {
      setResponses([]);
      setEditingResponseId(null);
      return;
    }
    void refreshResponses(selectedFormId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFormId]);

  if (!loadingAuth && !isAdmin) {
    return (
      <div className="page-container">
        <PageHeader title="Admin • Forms" />
        <EmptyState title="Permission denied" description="Sign in as an admin to manage forms." />
      </div>
    );
  }

  if (loading || loadingRoles || loadingUsers) return <PageLoading />;

  const canSaveBuilder = builderTitle.trim().length > 0;

  const handleSaveBuilder = async () => {
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

      if (selectedFormId) {
        const res = await fetch(`/api/forms/admin/definitions/${encodeURIComponent(selectedFormId)}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update form');
        toast({ title: 'Form updated' });
      } else {
        const res = await fetch('/api/forms/admin/definitions', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create form');
        await res.json();
        toast({ title: 'Form created' });
      }

      // Refresh list and select current.
      const refreshed = await fetch('/api/forms/admin/definitions', { headers }).then((r) => r.json());
      const loaded = Array.isArray(refreshed.forms) ? (refreshed.forms as FormDefinition[]) : [];
      setForms(loaded);
      const nextSelected = selectedFormId ?? loaded[0]?.id ?? null;
      setSelectedFormId(nextSelected);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Save failed';
      toast({ variant: 'destructive', title: 'Forms', description: message });
    }
  };

  const setField = (fieldId: string, patch: Partial<FormFieldDefinition>) => {
    setBuilderFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  };

  const addField = () => {
    setBuilderFields((prev) => {
      const nextOrder = prev.length ? Math.max(...prev.map((f) => f.order)) + 1 : 0;
      return [...prev, defaultField(nextOrder)];
    });
  };

  const moveFieldOrder = (fieldId: string, delta: number) => {
    setBuilderFields((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((f) => f.id === fieldId);
      if (idx < 0) return prev;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= sorted.length) return prev;
      const a = sorted[idx];
      const b = sorted[nextIdx];
      const aOrder = a.order;
      a.order = b.order;
      b.order = aOrder;
      return [...sorted];
    });
  };

  return (
    <div className="page-container">
      <PageHeader title="Admin • Forms" description="Build forms, review submissions, and export reports." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card p-4 md:p-6 space-y-4">
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-section-title">{selectedFormId ? 'Edit form' : 'New form'}</h2>
                {selectedForm?.publicToken ? (
                  <p className="text-xs text-muted-foreground mt-1 break-all">
                    Public link: /forms/public/{selectedForm.publicToken}
                  </p>
                ) : null}
              </div>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setSelectedFormId(null);
                  setBuilderTitle('');
                  setBuilderDescription('');
                  setBuilderStatus('draft');
                  setBuilderDeadlineDate('');
                  setBuilderAllowedRoleIds([]);
                  setBuilderAllowedUserIds([]);
                  setBuilderFields([]);
                  setEditingResponseId(null);
                  setDraftAnswers({});
                }}
              >
                <Plus className="h-4 w-4" />
                New
              </Button>
            </div>

            {forms.length > 0 ? (
              <div className="space-y-2">
                <Label>Open existing form</Label>
                <Select
                  value={selectedFormId ?? '__new__'}
                  onValueChange={(v) => {
                    if (v === '__new__') {
                      setSelectedFormId(null);
                      setBuilderTitle('');
                      setBuilderDescription('');
                      setBuilderStatus('draft');
                      setBuilderDeadlineDate('');
                      setBuilderAllowedRoleIds([]);
                      setBuilderAllowedUserIds([]);
                      setBuilderFields([]);
                      return;
                    }
                    setSelectedFormId(v);
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">New form</SelectItem>
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={builderTitle} onChange={(e) => setBuilderTitle(e.target.value)} placeholder="Form title" />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={builderDescription} onChange={(e) => setBuilderDescription(e.target.value)} placeholder="Short description" />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={builderStatus} onValueChange={(v) => setBuilderStatus(v as 'draft' | 'published')}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline (optional)</Label>
                <Input
                  type="date"
                  value={builderDeadlineDate}
                  onChange={(e) => setBuilderDeadlineDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Who can open forms (signed-in users)</Label>
              <p className="text-xs text-muted-foreground">
                Leave roles and users empty to make the form available to everyone.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Allowed roles</Label>
                  <MultiSelect
                    options={roleOptions}
                    selected={builderAllowedRoleIds}
                    onChange={setBuilderAllowedRoleIds}
                    placeholder="Pick roles…"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Allowed users</Label>
                  <MultiSelect
                    options={userOptions}
                    selected={builderAllowedUserIds}
                    onChange={setBuilderAllowedUserIds}
                    placeholder="Pick users…"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <h3 className="text-section-title">Fields</h3>
              <Button variant="outline" className="rounded-xl" onClick={addField}>
                <Plus className="h-4 w-4" />
                Add field
              </Button>
            </div>

            {builderFields.length === 0 ? (
              <EmptyState title="No fields yet" description="Add fields to build your form." />
            ) : (
              <div className="space-y-3">
                {[...builderFields].sort((a, b) => a.order - b.order).map((field, idx) => {
                  const dependsOnOptions = [...builderFields]
                    .filter((f) => f.id !== field.id)
                    .sort((a, b) => a.order - b.order)
                    .map((f) => ({ value: f.id, label: f.label }));

                  const optionsValue = (field.options ?? []).join(', ');

                  return (
                    <div key={field.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                          <Label className="text-sm font-semibold truncate">{field.id.slice(0, 8)}</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" className="rounded-xl" disabled={idx === 0} onClick={() => moveFieldOrder(field.id, -1)}>
                            ↑
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            disabled={idx === builderFields.length - 1}
                            onClick={() => moveFieldOrder(field.id, +1)}
                          >
                            ↓
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input value={field.label} onChange={(e) => setField(field.id, { label: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(v) => {
                              const nextType = v as FormFieldDefinition['type'];
                              setField(field.id, {
                                type: nextType,
                                options: nextType === 'select' || nextType === 'checkbox' ? field.options ?? [] : undefined,
                              });
                            }}
                          >
                            <SelectTrigger className="h-10 rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="checkbox">Checkboxes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={field.required}
                          onCheckedChange={(checked) => setField(field.id, { required: checked === true })}
                        />
                        <Label className="text-sm">Required</Label>
                      </div>

                      {(field.type === 'select' || field.type === 'checkbox') && (
                        <div className="space-y-2">
                          <Label>Options (comma separated)</Label>
                          <Input
                            value={optionsValue}
                            onChange={(e) => setField(field.id, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                            placeholder="e.g. Yes, No"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Conditional (optional)</Label>
                        <div className="grid gap-2 md:grid-cols-2">
                          <Select
                            value={field.conditional?.dependsOnFieldId ?? ''}
                            onValueChange={(v) => {
                              if (!v) setField(field.id, { conditional: undefined });
                              else setField(field.id, { conditional: { dependsOnFieldId: v, equals: field.conditional?.equals ?? '' } });
                            }}
                          >
                            <SelectTrigger className="h-10 rounded-xl">
                              <SelectValue placeholder="Depends on field…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem>
                              {dependsOnOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            placeholder="Equals value"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setBuilderFields((prev) => prev.filter((f) => f.id !== field.id).map((f, i) => ({ ...f, order: i })))}
                        >
                          Remove field
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end">
              <Button className="rounded-xl" onClick={() => void handleSaveBuilder()} disabled={!canSaveBuilder}>
                <SaveIcon className="h-4 w-4 mr-2" />
                Save form
              </Button>
            </div>
          </section>
        </div>

        <div className="ui-card p-4 md:p-6 space-y-4">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-section-title">Submissions</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  View and edit answers. Export via the report panel.
                </p>
              </div>
              {selectedForm ? (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void refreshResponses(selectedForm.id)}
                >
                  Refresh
                </Button>
              ) : null}
            </div>

            {!selectedFormId ? (
              <EmptyState title="Select a form" description="Choose a form to review submissions." />
            ) : responses.length === 0 ? (
              <EmptyState title="No submissions yet" description="Guests will create responses when they submit." />
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap items-center">
                  <Select
                    value={selectedFormId ?? ''}
                    onValueChange={(v) => {
                      setSelectedFormId(v);
                      setEditingResponseId(null);
                      setDraftAnswers({});
                    }}
                  >
                    <SelectTrigger className="h-10 rounded-xl w-full sm:w-72">
                      <SelectValue placeholder="Select form…" />
                    </SelectTrigger>
                    <SelectContent>
                      {forms.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Table className="admin-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitter</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((r) => {
                      const errs = r.lastValidationErrors ?? {};
                      const hasErrors = Object.keys(errs).length > 0;
                      return (
                        <TableRow
                          key={r.id}
                          className={editingResponseId === r.id ? 'bg-accent/30' : undefined}
                        >
                          <TableCell className="max-w-sm whitespace-normal break-words">
                            {r.submitterEmail}{' '}
                            {hasErrors ? (
                              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Needs attention
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {r.updatedAt?.toMillis?.()
                              ? new Date(r.updatedAt.toMillis()).toLocaleString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => {
                                setEditingResponseId(r.id);
                                setDraftAnswers(r.answers ?? {});
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {editingResponse && selectedForm ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-section-title">Editing response</h3>
                        <p className="text-sm text-muted-foreground">ID: {editingResponse.id}</p>
                      </div>
                      <div className="flex gap-2">
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
                            if (!selectedForm) return;
                            setSaving(true);
                            try {
                              const headers = await getClientAuthHeaders();
                              const res = await fetch(
                                `/api/forms/admin/definitions/${encodeURIComponent(selectedForm.id)}/responses/${encodeURIComponent(editingResponse.id)}`,
                                {
                                  method: 'PUT',
                                  headers: { ...headers, 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ answers: draftAnswers }),
                                },
                              );
                              const data = await res.json().catch(() => ({}));
                              if (!res.ok) throw new Error(data.error || 'Save failed');
                              await refreshResponses(selectedForm.id);
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

                    <FormRenderer
                      form={selectedForm}
                      value={draftAnswers}
                      onChange={setDraftAnswers}
                      errorsByFieldId={editingResponse.lastValidationErrors ?? null}
                    />

                    <ReportPanel form={selectedForm} response={editingResponse} />
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

