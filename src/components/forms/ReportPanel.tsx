'use client';

import { useMemo } from 'react';
import type { FormDefinition, FormResponse } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { stringifyAnswerValue } from '@/lib/forms/export-responses';
import { Download } from 'lucide-react';
import { isProfileReferenceFieldType } from '@/lib/forms/field-types';

type Props = {
  form: FormDefinition;
  response: FormResponse;
  compactHeader?: boolean;
  /** Opens field/format picker instead of immediate download. */
  onDownload?: () => void;
};

/** Admin-only single-response report with download entry point. */
export default function ReportPanel({ form, response, compactHeader = false, onDownload }: Props) {
  const fields = useMemo(() => [...form.fields].sort((a, b) => a.order - b.order), [form.fields]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {!compactHeader ? (
          <div>
            <h3 className="text-section-title">{form.title}</h3>
            <p className="text-sm text-muted-foreground">Submitter: {response.submitterEmail}</p>
          </div>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">Answers report</p>
        )}
        {onDownload ? (
          <Button className="rounded-xl" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1.5" />
            Download…
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        {fields.map((field) => {
          const value = stringifyAnswerValue(response.answers?.[field.id]);
          return (
            <div key={field.id} className="rounded-xl border border-border/60 bg-muted/15 px-3.5 py-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                {field.label}
                {isProfileReferenceFieldType(field.type) ? (
                  <span className="font-normal"> · from profile</span>
                ) : null}
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                {value || <span className="text-muted-foreground">—</span>}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
