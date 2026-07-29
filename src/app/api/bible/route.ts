import { type NextRequest, NextResponse } from 'next/server';
import { getLocalBiblePassage, formatPassageToHtml } from '@/lib/bible/xml-bible-parser';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { normalizeBibleVersion, toXmlVersion } from '@/lib/bible-versions';
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = rateLimit(`bible:${ip}`, 120, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const passageParam = searchParams.get('passage');
  const version = normalizeBibleVersion(searchParams.get('version'));

  if (!passageParam) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  try {
    const parsed = parsePassageReferenceForNavigation(passageParam);

    if (!parsed) {
      return NextResponse.json({ error: `Could not parse passage reference: ${passageParam}` }, { status: 400 });
    }

    const primaryXml = toXmlVersion(version);
    const fallbackXml = toXmlVersion(version === 'krv' ? 'esv' : 'krv');

    let passage = await getLocalBiblePassage(parsed.book, parsed.chapter, primaryXml);

    if (!passage) {
      passage = await getLocalBiblePassage(parsed.book, parsed.chapter, fallbackXml);
    }

    if (!passage) {
      return NextResponse.json({ error: `Passage not found: ${passageParam}` }, { status: 404 });
    }

    const passageHtml = formatPassageToHtml(passage);
    return NextResponse.json(
      { html: passageHtml, version },
      {
        headers: {
          // Local XML is static; long CDN/browser cache is safe. SW also NetworkFirst-caches this.
          'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Route /api/bible] Error retrieving local passage:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${message}` }, { status: 500 });
  }
}
