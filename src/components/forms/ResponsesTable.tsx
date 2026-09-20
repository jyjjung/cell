'use client';

import type { FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { resolveExportFields, stringifyAnswerValue, type FormExportOptions } from '@/lib/forms/export-responses';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

type Props = {
  form: FormDefinition;
  responses: FormResponse[];
  options?: FormExportOptions | null;
  showSubmitter?: boolean;
  startIndex?: number;
  responsive?: boolean;
  getRowClassName?: (response: FormResponse) => string | undefined;
  onDelete?: (response: FormResponse) => void;
};

export default function ResponsesTable({
  form,
  responses,
  options,
  showSubmitter = false,
  startIndex = 0,
  responsive = false,
  getRowClassName,
  onDelete,
}: Props) {
  const fields: FormFieldDefinition[] = resolveExportFields(form, options);

  if (responses.length === 0) {
    return (
      <div className="rounded-md border border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
        No responses.
      </div>
    );
  }

  return (
    <div className={cn('admin-table-wrap', responsive && 'page-responsive-table')}>
      <Table className={cn('admin-table', onDelete ? 'min-w-[700px]' : 'min-w-[640px]')}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            {showSubmitter ? <TableHead>Submitter</TableHead> : null}
            {fields.map((field) => (
              <TableHead key={field.id}>{field.label}</TableHead>
            ))}
            {onDelete ? <TableHead className="w-14">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {responses.map((response, index) => (
            <TableRow key={response.id} className={getRowClassName?.(response)}>
              <TableCell className="tabular-nums text-muted-foreground">{startIndex + index + 1}</TableCell>
              {showSubmitter ? <TableCell className="max-w-[180px] font-medium whitespace-normal break-words">—</TableCell> : null}
              {fields.map((field) => {
                const value = stringifyAnswerValue(response.answers?.[field.id]);
                return (
                  <TableCell
                    key={field.id}
                    className="max-w-[220px] whitespace-pre-wrap break-words align-top"
                  >
                    {value || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                );
              })}
              {onDelete ? (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label="Delete response"
                    onClick={() => onDelete(response)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
