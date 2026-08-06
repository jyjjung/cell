'use client';

import type { FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';
import { resolveExportFields, stringifyAnswerValue, type FormExportOptions } from '@/lib/forms/export-responses';
import { displaySubmitterLabel } from '@/lib/forms/submitter-display';
import { cn } from '@/lib/utils';

type Props = {
  form: FormDefinition;
  responses: FormResponse[];
  options?: FormExportOptions | null;
  showSubmitter?: boolean;
  startIndex?: number;
  getRowClassName?: (response: FormResponse) => string | undefined;
};

export default function ResponsesTable({
  form,
  responses,
  options,
  showSubmitter = true,
  startIndex = 0,
  getRowClassName,
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
    <div className="overflow-x-auto rounded-md border border-border/70 bg-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900 text-left text-slate-50">
            <th className="whitespace-nowrap border-r border-white/10 px-2.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
              #
            </th>
            {showSubmitter ? (
              <th className="whitespace-nowrap border-r border-white/10 px-2.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide">
                Submitter
              </th>
            ) : null}
            {fields.map((field) => (
              <th
                key={field.id}
                className="whitespace-nowrap border-r border-white/10 px-2.5 py-2.5 text-[10px] font-semibold uppercase tracking-wide last:border-r-0"
              >
                {field.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {responses.map((response, index) => (
            <tr
              key={response.id}
              className={cn(
                'border-b border-border/50 last:border-b-0 even:bg-muted/30',
                getRowClassName?.(response),
              )}
            >
              <td className="border-r border-border/40 px-2.5 py-2 align-top text-muted-foreground tabular-nums">
                {startIndex + index + 1}
              </td>
              {showSubmitter ? (
                <td className="max-w-[180px] border-r border-border/40 px-2.5 py-2 align-top font-medium break-words">
                  {displaySubmitterLabel(response, form)}
                </td>
              ) : null}
              {fields.map((field) => {
                const value = stringifyAnswerValue(response.answers?.[field.id]);
                return (
                  <td
                    key={field.id}
                    className="max-w-[220px] border-r border-border/40 px-2.5 py-2 align-top whitespace-pre-wrap break-words last:border-r-0"
                  >
                    {value || <span className="text-muted-foreground">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
