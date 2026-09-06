import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/server-admin-request';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

type ExtractedEntry = {
  date: string;
  personName: string;
  title: string;
  passage: string;
};

type ScanDefaults = {
  title: string;
  passage: string;
};

function isExtractedEntry(value: unknown): value is ExtractedEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    typeof entry.personName === 'string' &&
    typeof entry.title === 'string' &&
    typeof entry.passage === 'string'
  );
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
  const namePreference = formData.get('namePreference') === 'korean' ? 'Korean' : 'English';
  const prompt = [
    'Extract QT roster assignments from this document or photo.',
    `Each calendar cell may contain the same person in two languages. Use only the ${namePreference} name line for personName and ignore the other language.`,
    'The people calendar and the QT title/passage may be separate sections. Extract title and passage from the separate QT section as shared defaults, not as person names.',
    'Return only rows that are explicitly present. Do not invent missing values.',
    'Convert dates to YYYY-MM-DD. If the year is not visible, infer it only when the document clearly identifies a single year; otherwise omit that row.',
    'Use an empty string for a missing personName, title, or passage.',
    'Return a JSON object only, shaped exactly as:',
    '{"entries":[{"date":"YYYY-MM-DD","personName":"...","title":"","passage":""}],"defaults":{"title":"...","passage":"..."}}',
    'Put a title or passage on an entry only when it is specific to that date. Otherwise put shared values in defaults.',
  ].join(' ');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const detail = await response.text();
    console.error('[qt-roster-scan] Gemini request failed', response.status, detail);
    return NextResponse.json({ error: 'The document could not be scanned.' }, { status: 502 });
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

  const result = parsed as { entries?: unknown; defaults?: Partial<ScanDefaults> };
  if (!Array.isArray(result.entries)) {
    return NextResponse.json({ error: 'The scan did not return a roster list.' }, { status: 422 });
  }

  const entries = result.entries.filter(isExtractedEntry).slice(0, 366);
  const defaults: ScanDefaults = {
    title: typeof result.defaults?.title === 'string' ? result.defaults.title : '',
    passage: typeof result.defaults?.passage === 'string' ? result.defaults.passage : '',
  };
  return NextResponse.json({ entries, defaults });
}
