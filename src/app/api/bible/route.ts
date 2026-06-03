import { type NextRequest, NextResponse } from 'next/server';
import { getLocalBiblePassage, formatPassageToHtml } from '@/lib/bible/xml-bible-parser';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';
import { normalizeBibleVersion, toXmlVersion } from '@/lib/bible-versions';

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ html: passageHtml, version });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Route /api/bible] Error retrieving local passage:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${message}` }, { status: 500 });
  }
}
