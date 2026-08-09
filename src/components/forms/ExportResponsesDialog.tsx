'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  buildCollectiveResponsesCsv,
  buildSingleResponseCsv,
  collectiveResponsesCsvFilename,
  downloadTextFile,
  openBlankPrintWindow,
  printCollectiveResponsesPdf,
  printSingleResponsePdf,
  singleResponseCsvFilename,
  sortedFields,
  type FormExportOptions,
} from '@/lib/forms/export-responses';
import { toMillisSafe } from '@/lib/firestore-timestamp';
import { Download, FileSpreadsheet } from 'lucide-react';

type ResponseScope = 'all' | 'picked';
type ExportFormat = 'csv' | 'pdf';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormDefinition;
  /** Loaded responses shown for picking. */
  responses: FormResponse[];
  /** When set, dialog is for one response (no “all users” scope). */
  fixedResponse?: FormResponse | null;
  /** Prefill picked responses (e.g. currently selected row). */
  initialPickedIds?: string[];
  /** Fetch every response (capped) when scope is “all”. */
  fetchAllForExport?: () => Promise<FormResponse[]>;
  exportCap?: number;
};

export default function ExportResponsesDialog({
  open,
  onOpenChange,
  form,
  responses,
  fixedResponse = null,
  initialPickedIds,
  fetchAllForExport,
  exportCap = 500,
}: Props) {
  const { toast } = useToast();
  const fields = useMemo(() => sortedFields(form), [form]);
  const isSingle = !!fixedResponse;

  const [fieldIds, setFieldIds] = useState<Set<string>>(() => new Set(fields.map((f) => f.id)));
  const [scope, setScope] = useState<ResponseScope>('all');
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set());
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFieldIds(new Set(fields.map((f) => f.id)));
    setFormat('csv');
    setBusy(false);
    if (isSingle && fixedResponse) {
      setScope('picked');
      setPickedIds(new Set([fixedResponse.id]));
    } else {
      setScope('all');
      const seed = initialPickedIds?.filter(Boolean) ?? [];
      setPickedIds(new Set(seed));
    }
  }, [open, fields, isSingle, fixedResponse, initialPickedIds]);

  const toggleField = (id: string, checked: boolean) => {
    setFieldIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePicked = (id: string, checked: boolean) => {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllFields = () => setFieldIds(new Set(fields.map((f) => f.id)));
  const clearFields = () => setFieldIds(new Set());
  const selectAllLoaded = () => setPickedIds(new Set(responses.map((r) => r.id)));
  const clearPicked = () => setPickedIds(new Set());

  const exportOptions = (): FormExportOptions => ({
    fieldIds: fields.filter((f) => fieldIds.has(f.id)).map((f) => f.id),
  });

  const responsePickerLabel = (response: FormResponse, index: number): string => {
    const submittedMs = toMillisSafe(response.updatedAt || response.createdAt);
    if (submittedMs > 0) {
      return `Response ${index + 1} · ${new Date(submittedMs).toLocaleString()}`;
    }
    return `Response ${index + 1}`;
  };

  const resolveResponses = async (): Promise<FormResponse[]> => {
    if (isSingle && fixedResponse) return [fixedResponse];
    if (scope === 'all') {
      if (fetchAllForExport) return fetchAllForExport();
      return responses;
    }
    const idSet = pickedIds;
    return responses.filter((r) => idSet.has(r.id));
  };

  const runExport = async () => {
    const options = exportOptions();
    if (options.fieldIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing selected',
        description: 'Pick at least one field to export.',
      });
      return;
    }
    if (!isSingle && scope === 'picked' && pickedIds.size === 0) {
      toast({
        variant: 'destructive',
        title: 'No responses selected',
        description: 'Choose at least one response, or download all responses.',
      });
      return;
    }

    // Open during the tap gesture — iOS Safari blocks window.open after awaits.
    const printWindow = format === 'pdf' ? openBlankPrintWindow() : null;

    setBusy(true);
    try {
      const list = await resolveResponses();
      if (list.length === 0) {
        try {
          printWindow?.close();
        } catch {
          // ignore
        }
        toast({
          variant: 'destructive',
          title: 'No responses',
          description: 'There is nothing to download for this selection.',
        });
        return;
      }

      if (format === 'csv') {
        if (list.length === 1) {
          downloadTextFile(
            buildSingleResponseCsv(form, list[0], options),
            singleResponseCsvFilename(form, list[0]),
          );
        } else {
          downloadTextFile(
            buildCollectiveResponsesCsv(form, list, options),
            collectiveResponsesCsvFilename(form),
          );
        }
        toast({
          title: 'CSV downloaded',
          description:
            list.length >= exportCap && scope === 'all'
              ? `Exported the first ${exportCap} responses.`
              : `${list.length} response${list.length === 1 ? '' : 's'} · ${options.fieldIds.length} field${options.fieldIds.length === 1 ? '' : 's'}.`,
        });
      } else {
        const ok =
          list.length === 1
            ? printSingleResponsePdf(form, list[0], options, printWindow)
            : printCollectiveResponsesPdf(form, list, options, printWindow);
        if (!ok) {
          try {
            printWindow?.close();
          } catch {
            // ignore
          }
          toast({
            variant: 'destructive',
            title: 'Could not open PDF',
            description: 'Try again, or download as CSV instead.',
          });
          return;
        }
        toast({
          title: 'Print dialog',
          description: 'Choose “Save as PDF” (or Print) to keep a copy.',
        });
      }
      onOpenChange(false);
    } catch (e: unknown) {
      try {
        printWindow?.close();
      } catch {
        // ignore
      }
      const message = e instanceof Error ? e.message : 'Export failed';
      toast({ variant: 'destructive', title: 'Export', description: message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col gap-0 p-0 sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>Download responses</DialogTitle>
          <DialogDescription>
            Choose which fields{isSingle ? '' : ' and responses'} to include, then export as CSV or PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-5 overflow-y-auto flex-1 min-h-0">
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Fields</p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={selectAllFields}>
                  All
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg text-xs" onClick={clearFields}>
                  None
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[min(180px,28vh)] rounded-xl border border-border/60">
              <div className="p-2 space-y-0.5">
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-2 py-3">This form has no fields.</p>
                ) : (
                  fields.map((field) => (
                    <label
                      key={field.id}
                      className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        className="mt-0.5"
                        checked={fieldIds.has(field.id)}
                        onCheckedChange={(v) => toggleField(field.id, v === true)}
                      />
                      <span className="min-w-0 leading-snug">{field.label}</span>
                    </label>
                  ))
                )}
              </div>
            </ScrollArea>
          </section>

          {!isSingle ? (
            <section className="space-y-2">
              <p className="text-sm font-medium">Responses</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={scope === 'all' ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => setScope('all')}
                >
                  All responses
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={scope === 'picked' ? 'default' : 'outline'}
                  className="rounded-xl"
                  onClick={() => setScope('picked')}
                >
                  Choose responses
                </Button>
              </div>
              {scope === 'all' ? (
                <p className="text-xs text-muted-foreground">
                  Downloads every response for this form (up to {exportCap}).
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {pickedIds.size} selected · from loaded list
                    </p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg text-xs"
                        onClick={selectAllLoaded}
                      >
                        All loaded
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg text-xs"
                        onClick={clearPicked}
                      >
                        None
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[min(160px,24vh)] rounded-xl border border-border/60">
                    <div className="p-2 space-y-0.5">
                      {responses.map((r, index) => (
                        <label
                          key={r.id}
                          className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/40"
                        >
                          <Checkbox
                            className="mt-0.5"
                            checked={pickedIds.has(r.id)}
                            onCheckedChange={(v) => togglePicked(r.id, v === true)}
                          />
                          <span className="min-w-0 truncate leading-snug">
                            {responsePickerLabel(r, index)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    Load more on the responses page first if you need submitters not shown here.
                  </p>
                </>
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <p className="text-sm font-medium">Format</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={format === 'csv' ? 'default' : 'outline'}
                className="rounded-xl"
                onClick={() => setFormat('csv')}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
                CSV
              </Button>
              <Button
                type="button"
                size="sm"
                variant={format === 'pdf' ? 'default' : 'outline'}
                className="rounded-xl"
                onClick={() => setFormat('pdf')}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                PDF
              </Button>
            </div>
          </section>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0">
          <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" disabled={busy} onClick={() => void runExport()}>
            {busy ? 'Preparing…' : format === 'csv' ? 'Download CSV' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
