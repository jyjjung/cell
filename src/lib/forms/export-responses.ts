import type { FormAnswerValue, FormDefinition, FormFieldDefinition, FormResponse } from '@/types/forms';

export type FormExportOptions = {
  /** Field ids to include, in form order (subset of form.fields). */
  fieldIds: string[];
  /** Include built-in submitter metadata column / line. Default false. */
  includeSubmitterName?: boolean;
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

function includeSubmitter(options?: FormExportOptions | null): boolean {
  return options?.includeSubmitterName === true;
}

export function buildSingleResponseCsv(
  form: FormDefinition,
  response: FormResponse,
  options?: FormExportOptions | null,
): string {
  const fields = resolveExportFields(form, options);
  const lines = ['field,value'];
  if (includeSubmitter(options)) {
    lines.push(`submitter_name,${escapeCsv(response.submitterName ?? '')}`);
  }
  for (const field of fields) {
    lines.push(
      `${escapeCsv(field.label)},${escapeCsv(stringifyAnswerValue(response.answers?.[field.id]))}`,
    );
  }
  return lines.join('\n');
}

/** One row per response; columns = optional submitter metadata + selected questions. */
export function buildCollectiveResponsesCsv(
  form: FormDefinition,
  responses: FormResponse[],
  options?: FormExportOptions | null,
): string {
  const fields = resolveExportFields(form, options);
  const headerCols = ['response_id'];
  if (includeSubmitter(options)) headerCols.push('submitter_name');
  headerCols.push(...fields.map((f) => f.label));
  const header = headerCols.map(escapeCsv).join(',');
  const rows = responses.map((response) => {
    const cells: string[] = [response.id];
    if (includeSubmitter(options)) cells.push(response.submitterName ?? '');
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
    <style>
      @page { size: landscape; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif;
        font-size: 11px;
        line-height: 1.45;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sheet { padding: 8px 4px 16px; }
      .sheet-header { margin-bottom: 14px; }
      .sheet-kicker {
        margin: 0 0 4px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b7280;
      }
      .sheet-title {
        margin: 0;
        font-size: 18px;
        font-weight: 650;
        letter-spacing: -0.02em;
        color: #0f172a;
      }
      .sheet-meta {
        margin: 6px 0 0;
        color: #6b7280;
        font-size: 11px;
      }
      .table-wrap {
        width: 100%;
        overflow: visible;
        border: 1px solid #d1d5db;
        border-radius: 6px;
      }
      table.data {
        width: 100%;
        border-collapse: collapse;
        table-layout: auto;
      }
      table.data th,
      table.data td {
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
        border-bottom: 1px solid #e5e7eb;
        border-right: 1px solid #eef0f3;
        word-break: break-word;
        max-width: 220px;
      }
      table.data th:last-child,
      table.data td:last-child { border-right: none; }
      table.data thead th {
        background: #0f172a;
        color: #f8fafc;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
        white-space: nowrap;
        border-bottom: none;
        border-right-color: rgba(255,255,255,0.12);
      }
      table.data tbody tr:nth-child(even) td { background: #f8fafc; }
      table.data tbody tr:last-child td { border-bottom: none; }
      table.data td.empty { color: #9ca3af; }
      .sheet-footer {
        margin-top: 12px;
        color: #9ca3af;
        font-size: 10px;
      }
      @media print {
        .sheet { padding: 0; }
        .table-wrap { border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
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

function writeHtmlToWindow(target: Window, html: string): boolean {
  try {
    target.document.open();
    target.document.write(html);
    target.document.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Open the print/PDF HTML without relying on a late `window.open` (blocked on iOS
 * after async work). Prefer a window opened during the click gesture; fall back to
 * a hidden iframe, then an HTML file download.
 */
export function openResponsesPrintWindow(html: string, preexisting?: Window | null): boolean {
  if (preexisting && !preexisting.closed) {
    if (writeHtmlToWindow(preexisting, html)) return true;
    try {
      preexisting.close();
    } catch {
      // ignore
    }
  }

  try {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Print export');
    iframe.setAttribute('aria-hidden', 'true');
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: '0',
      opacity: '0',
      pointerEvents: 'none',
    });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      window.setTimeout(() => {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
      }, 60_000);
      return true;
    }
    iframe.remove();
  } catch {
    // continue to download fallback
  }

  downloadTextFile(html, 'form-responses-print.html', 'text/html;charset=utf-8');
  return true;
}

/** Open a blank print window during a user gesture (before any await). */
export function openBlankPrintWindow(): Window | null {
  try {
    const w = window.open('about:blank', '_blank');
    if (!w) return null;
    try {
      w.opener = null;
    } catch {
      // ignore
    }
    try {
      w.document.write(
        '<!doctype html><title>Preparing PDF…</title><body style="font-family:system-ui,sans-serif;padding:24px;color:#374151">Preparing PDF…</body>',
      );
      w.document.close();
    } catch {
      // ignore — content will be replaced after export builds
    }
    return w;
  } catch {
    return null;
  }
}

function buildResponsesTableHtml(
  form: FormDefinition,
  responses: FormResponse[],
  options?: FormExportOptions | null,
): string {
  const fields = resolveExportFields(form, options);
  const showSubmitter = includeSubmitter(options);
  const generatedAt = new Date().toLocaleString();

  const headerCells = [
    '<th>#</th>',
    ...(showSubmitter ? ['<th>Submitter</th>'] : []),
    ...fields.map((f) => `<th>${escapeHtml(f.label)}</th>`),
  ].join('');

  const bodyRows =
    responses.length === 0
      ? `<tr><td class="empty" colspan="${1 + (showSubmitter ? 1 : 0) + fields.length}">No responses.</td></tr>`
      : responses
          .map((response, index) => {
            const name = response.submitterName ?? '';
            const cells = [
              `<td>${index + 1}</td>`,
              ...(showSubmitter
                ? [name ? `<td>${escapeHtml(name)}</td>` : `<td class="empty">—</td>`]
                : []),
              ...fields.map((field) => {
                const value = stringifyAnswerValue(response.answers?.[field.id]);
                return value ? `<td>${escapeHtml(value)}</td>` : `<td class="empty">—</td>`;
              }),
            ];
            return `<tr>${cells.join('')}</tr>`;
          })
          .join('');

  const countLabel = `${responses.length} response${responses.length === 1 ? '' : 's'}`;
  const fieldLabel = `${fields.length} column${fields.length === 1 ? '' : 's'}`;

  return `
    <header class="sheet-header">
      <p class="sheet-kicker">Forms export</p>
      <h1 class="sheet-title">${escapeHtml(form.title)}</h1>
      <p class="sheet-meta">${escapeHtml(countLabel)} · ${escapeHtml(fieldLabel)} · ${escapeHtml(generatedAt)}</p>
    </header>
    <div class="table-wrap">
      <table class="data">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
    <p class="sheet-footer">Generated from Forms (admin). Use your browser’s print dialog to save as PDF.</p>
  `;
}

export function printSingleResponsePdf(
  form: FormDefinition,
  response: FormResponse,
  options?: FormExportOptions | null,
  preexisting?: Window | null,
): boolean {
  const title = `${form.title} — response`;
  return openResponsesPrintWindow(
    buildPrintHtml(title, buildResponsesTableHtml(form, [response], options)),
    preexisting,
  );
}

export function printCollectiveResponsesPdf(
  form: FormDefinition,
  responses: FormResponse[],
  options?: FormExportOptions | null,
  preexisting?: Window | null,
): boolean {
  const title = `${form.title} — responses`;
  return openResponsesPrintWindow(
    buildPrintHtml(title, buildResponsesTableHtml(form, responses, options)),
    preexisting,
  );
}
