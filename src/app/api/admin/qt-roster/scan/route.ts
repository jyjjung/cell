import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/server-admin-request';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const GEMINI_MODEL = 'gemini-3.6-flash';

type ExtractedEntry = {
  date: string;
  row1?: string;
  row2?: string;
  title?: string;
  passage?: string;
};

type ScanDefaults = {
  title: string;
  passage: string;
};

function normalizeEntry(value: unknown, year: string, month: string, defaults: ScanDefaults): ExtractedEntry | null {
  if (!value || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  const row1 = typeof entry.row1 === 'string' ? entry.row1.trim() : '';
  const row2 = typeof entry.row2 === 'string' ? entry.row2.trim() : '';
  if (!row1 && !row2) return null;
  const rawDate = typeof entry.date === 'string' ? entry.date.trim() : '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? rawDate
    : /^\d{1,2}-\d{1,2}$/.test(rawDate)
      ? `${year}-${rawDate.split('-').map((part) => part.padStart(2, '0')).join('-')}`
      : /^\d{1,2}$/.test(rawDate)
        ? `${year}-${month}-${rawDate.padStart(2, '0')}`
        : '';
  if (!date) return null;
  const normalized: ExtractedEntry = {
    date,
    ...(row1 ? { row1 } : {}),
    ...(row2 ? { row2 } : {}),
  };
  const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : defaults.title;
  const passage = typeof entry.passage === 'string' && entry.passage.trim() ? entry.passage.trim() : defaults.passage;
  if (title) normalized.title = title;
  if (passage) normalized.passage = passage;
  return normalized;
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI scanning is not configured.' }, { status: 503 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A PDF or image file is required.' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Only PDF, JPEG, PNG, and WebP files are supported.' }, { status: 415 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'The file must be 10 MB or smaller.' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer()).toString('base64');
  const scanYear = typeof formData.get('year') === 'string' && /^\d{4}$/.test(formData.get('year') as string)
    ? formData.get('year') as string
    : String(new Date().getFullYear());
  const scanMonth = typeof formData.get('month') === 'string' && /^\d{1,2}$/.test(formData.get('month') as string)
    ? String(Number(formData.get('month'))).padStart(2, '0')
    : String(new Date().getMonth() + 1).padStart(2, '0');
  const prompt = [
    'Extract QT roster assignments from this document or photo.',
    'Each calendar cell may contain two rows of people. Extract both rows separately as row1 and row2. Row 1 means the first person line in each cell; row 2 means the second person line.',
    'The people calendar and the QT title/passage may be separate sections. Extract title and passage from the separate QT section as shared defaults, not as person names.',
    'Return only rows that are explicitly present. Do not invent missing values.',
    `Convert dates to YYYY-MM-DD. This scan is for ${scanYear}-${scanMonth}; use that year and month when the document shows only a month/day calendar.`,
    'Use an empty string for a missing row1, row2, title, or passage.',
    'Return a JSON object only, shaped exactly as:',
    '{"entries":[{"date":"YYYY-MM-DD","row1":"...","row2":"...","title":"","passage":""}],"defaults":{"title":"...","passage":"..."}}',
    'Put a title or passage on an entry only when it is specific to that date. Otherwise put shared values in defaults.',
  ].join(' ');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: file.type, data: bytes } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null) as {
      error?: { message?: string };
    } | null;
    const providerMessage = detail?.error?.message || '';
    const isBillingError = /billing|prepay|credits depleted/i.test(providerMessage);
    console.error('[qt-roster-scan] Gemini request failed', response.status, detail);
    return NextResponse.json({
      error: isBillingError
        ? 'Gemini billing is unavailable. Add prepaid credits to the configured Google AI project.'
        : 'The document could not be scanned. Check the Gemini API configuration.',
    }, { status: 502 });
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) {
    return NextResponse.json({ error: 'The scan returned no roster rows.' }, { status: 422 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('[qt-roster-scan] Gemini returned invalid JSON');
    return NextResponse.json({ error: 'The scan returned unreadable data.' }, { status: 422 });
  }

  if (!parsed || typeof parsed !== 'object') {
    return NextResponse.json({ error: 'The scan did not return a roster list.' }, { status: 422 });
  }

  const result = Array.isArray(parsed)
    ? { entries: parsed, defaults: {} }
    : parsed as { entries?: unknown; defaults?: Partial<ScanDefaults> };
  if (!Array.isArray(result.entries)) {
    return NextResponse.json({ error: 'The scan did not return a roster list.' }, { status: 422 });
  }

  const defaults: ScanDefaults = {
    title: typeof result.defaults?.title === 'string' ? result.defaults.title : '',
    passage: typeof result.defaults?.passage === 'string' ? result.defaults.passage : '',
  };
  const entries = result.entries
    .map((entry) => normalizeEntry(entry, scanYear, scanMonth, defaults))
    .filter((entry): entry is ExtractedEntry => entry !== null)
    .slice(0, 366);
  return NextResponse.json({ entries, defaults });
}
