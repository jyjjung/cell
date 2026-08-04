'use client';

import { useMemo } from 'react';
import type { FormDefinition, FormResponse, FormAnswerValue } from '@/types/forms';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet } from 'lucide-react';

function stringifyValue(v: FormAnswerValue | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type Props = {
  form: FormDefinition;
  response: FormResponse;
  /** Hide title/email when the parent already shows them. */
  compactHeader?: boolean;
};

/** Admin-only answers report with CSV / PDF export. */
export default function ReportPanel({ form, response, compactHeader = false }: Props) {
  const { toast } = useToast();
  const fields = useMemo(() => [...form.fields].sort((a, b) => a.order - b.order), [form.fields]);

  const csvFileName = useMemo(() => {
    const title = form.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'form';
    return `report_${title}_${response.id}.csv`;
  }, [form.title, response.id]);

  const pdfFileName = useMemo(() => {
    const title = form.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'form';
    return `report_${title}_${response.id}.pdf`;
  }, [form.title, response.id]);

  const downloadCsv = () => {
    const lines: string[] = ['field,value'];
    lines.push(`submitter_email,"${response.submitterEmail.replace(/"/g, '""')}"`);

    for (const field of fields) {
      const raw = stringifyValue(response.answers?.[field.id]);
      const safe = String(raw).replace(/"/g, '""');
      lines.push(`"${field.label.replace(/"/g, '""')}","${safe}"`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPrintPdf = () => {
    const title = `Form report: ${form.title}`;
    const rowsHtml = fields
      .map((field) => {
        const value = stringifyValue(response.answers?.[field.id]);
        return `<tr><td style="padding:8px;border:1px solid #ddd;font-size:13px;vertical-align:top;width:38%;">${escapeHtml(field.label)}</td><td style="padding:8px;border:1px solid #ddd;font-size:13px;word-break:break-word;">${escapeHtml(String(value)) || '—'}</td></tr>`;
      })
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div style="padding:16px;font-family:system-ui,sans-serif;">
      <h2 style="margin-top:0;">${escapeHtml(title)}</h2>
      <p style="color:#555;font-size:12px;margin-bottom:16px;"><b>Submitter email:</b> ${escapeHtml(response.submitterEmail)}</p>
      <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
        ${rowsHtml}
      </table>
      <p style="color:#888;font-size:11px;margin-top:16px;">Generated from Forms (admin).</p>
    </div>
    <script>
      window.onload = function () {
        setTimeout(function () { window.focus(); window.print(); }, 50);
      };
    </script>
  </body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      URL.revokeObjectURL(url);
      toast({
        variant: 'destructive',
        title: 'Popup blocked',
        description: 'Allow popups for this site, then try Download PDF again. Choose “Save as PDF” in the print dialog.',
      });
      return;
    }
    try {
      w.opener = null;
    } catch {
      // ignore
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast({
      title: 'Print dialog',
      description: `Choose “Save as PDF” and name it ${pdfFileName}.`,
    });
  };

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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={downloadCsv}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
          <Button className="rounded-xl" onClick={openPrintPdf}>
            <Download className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {fields.map((field) => {
          const value = stringifyValue(response.answers?.[field.id]);
          return (
            <div
              key={field.id}
              className="rounded-xl border border-border/60 bg-muted/15 px-3.5 py-3"
            >
              <p className="text-xs font-medium text-muted-foreground mb-1">{field.label}</p>
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
