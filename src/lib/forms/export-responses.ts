import type { FormAnswerValue, FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';

export type FormExportOptions = {
  /** Field ids to include, in form order (subset of form.fields). */
  fieldIds: string[];
  /** Include submitter email column / line. Default true. */
  includeSubmitterEmail?: boolean;
};

export function stringifyAnswerValue(v: FormAnswerValue | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.join(', ');
  return '';
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeFilePart(title: string): string {
  return title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40) || 'form';
}

export function sortedFields(form: FormDefinition): FormFieldDefinition[] {
  return [...form.fields].sort((a, b) => a.order - b.order);
}

export function resolveExportFields(
  form: FormDefinition,
  options?: FormExportOptions | null,
): FormFieldDefinition[] {
  const all = sortedFields(form);
  if (!options?.fieldIds) return all;
  const allowed = new Set(options.fieldIds);
  return all.filter((f) => allowed.has(f.id));
}

function includeEmail(options?: FormExportOptions | null): boolean {
  return options?.includeSubmitterEmail !== false;
}

export function buildSingleResponseCsv(
  form: FormDefinition,
  response: FormResponse,
  options?: FormExportOptions | null,
): string {
  const fields = resolveExportFields(form, options);
  const lines = ['field,value'];
  if (includeEmail(options)) {
    lines.push(`submitter_email,${escapeCsv(response.submitterEmail)}`);
  }
  for (const field of fields) {
    lines.push(
      `${escapeCsv(field.label)},${escapeCsv(stringifyAnswerValue(response.answers?.[field.id]))}`,
    );
  }
  return lines.join('\n');
}

/** One row per response; columns = optional email + selected questions. */
export function buildCollectiveResponsesCsv(
  form: FormDefinition,
  responses: FormResponse[],
  options?: FormExportOptions | null,
): string {
  const fields = resolveExportFields(form, options);
  const headerCols = ['response_id'];
  if (includeEmail(options)) headerCols.push('submitter_email');
  headerCols.push(...fields.map((f) => f.label));
  const header = headerCols.map(escapeCsv).join(',');
  const rows = responses.map((response) => {
    const cells: string[] = [response.id];
    if (includeEmail(options)) cells.push(response.submitterEmail);
    for (const f of fields) {
      cells.push(stringifyAnswerValue(response.answers?.[f.id]));
    }
    return cells.map((c) => escapeCsv(String(c))).join(',');
  });
  return [header, ...rows].join('\n');
}

export function singleResponseCsvFilename(form: FormDefinition, response: FormResponse): string {
  return `report_${safeFilePart(form.title)}_${response.id}.csv`;
}

export function collectiveResponsesCsvFilename(form: FormDefinition): string {
  return `responses_${safeFilePart(form.title)}.csv`;
}

export function downloadTextFile(contents: string, filename: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPrintHtml(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body>
    <div style="padding:16px;font-family:system-ui,sans-serif;">
      ${bodyHtml}
    </div>
    <script>
      window.onload = function () {
        setTimeout(function () { window.focus(); window.print(); }, 50);
      };
    </script>
  </body>
</html>`;
}

export function openResponsesPrintWindow(html: string): Window | null {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    URL.revokeObjectURL(url);
    return null;
  }
  try {
    w.opener = null;
  } catch {
    // ignore
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return w;
}

export function printSingleResponsePdf(
  form: FormDefinition,
  response: FormResponse,
  options?: FormExportOptions | null,
): boolean {
  const fields = resolveExportFields(form, options);
  const title = `Form report: ${form.title}`;
  const rows = fields
    .map((field) => {
      const value = stringifyAnswerValue(response.answers?.[field.id]);
      return `<tr><td style="padding:8px;border:1px solid #ddd;font-size:13px;vertical-align:top;width:38%;">${escapeHtml(field.label)}</td><td style="padding:8px;border:1px solid #ddd;font-size:13px;word-break:break-word;">${escapeHtml(value) || '—'}</td></tr>`;
    })
    .join('');
  const emailLine = includeEmail(options)
    ? `<p style="color:#555;font-size:12px;margin-bottom:16px;"><b>Submitter:</b> ${escapeHtml(response.submitterEmail)}</p>`
    : '';
  const body = `
    <h2 style="margin-top:0;">${escapeHtml(title)}</h2>
    ${emailLine}
    <table style="border-collapse:collapse;width:100%;table-layout:fixed;">${rows || '<tr><td style="padding:8px;color:#888;">No fields selected.</td></tr>'}</table>
    <p style="color:#888;font-size:11px;margin-top:16px;">Generated from Forms (admin).</p>
  `;
  return !!openResponsesPrintWindow(buildPrintHtml(title, body));
}

export function printCollectiveResponsesPdf(
  form: FormDefinition,
  responses: FormResponse[],
  options?: FormExportOptions | null,
): boolean {
  const fields = resolveExportFields(form, options);
  const title = `All responses: ${form.title}`;
  const sections = responses
    .map((response, index) => {
      const rows = fields
        .map((field) => {
          const value = stringifyAnswerValue(response.answers?.[field.id]);
          return `<tr><td style="padding:6px;border:1px solid #ddd;font-size:12px;width:38%;">${escapeHtml(field.label)}</td><td style="padding:6px;border:1px solid #ddd;font-size:12px;word-break:break-word;">${escapeHtml(value) || '—'}</td></tr>`;
        })
        .join('');
      const heading = includeEmail(options)
        ? escapeHtml(response.submitterEmail || 'Unknown')
        : `Response ${index + 1}`;
      return `
        <section style="margin-bottom:28px;page-break-inside:avoid;">
          <h3 style="margin:0 0 8px;">${index + 1}. ${heading}</h3>
          <table style="border-collapse:collapse;width:100%;table-layout:fixed;">${rows || '<tr><td style="padding:6px;color:#888;">No fields selected.</td></tr>'}</table>
        </section>
      `;
    })
    .join('');
  const body = `
    <h2 style="margin-top:0;">${escapeHtml(title)}</h2>
    <p style="color:#555;font-size:12px;margin-bottom:20px;">${responses.length} response${responses.length === 1 ? '' : 's'}</p>
    ${sections || '<p>No responses.</p>'}
    <p style="color:#888;font-size:11px;margin-top:16px;">Generated from Forms (admin).</p>
  `;
  return !!openResponsesPrintWindow(buildPrintHtml(title, body));
}
