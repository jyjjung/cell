
import { type NextRequest, NextResponse } from 'next/server';
import { getLocalBiblePassage, formatPassageToHtml } from '@/lib/bible/xml-bible-parser';
import { parsePassageReferenceForNavigation } from '@/lib/bible-navigation';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const passageParam = searchParams.get('passage');
  const version = (searchParams.get('version') as 'korRV' | 'engESV') || 'korRV';

  if (!passageParam) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  try {
    // Parse the passage reference (e.g., "Genesis 1")
    const parsed = parsePassageReferenceForNavigation(passageParam);
    
    if (!parsed) {
      return NextResponse.json({ error: `Could not parse passage reference: ${passageParam}` }, { status: 400 });
    }

    // Try to get the passage for the requested version
    // If Korean is requested and not found, or if English is requested, try to fall back or handle appropriately
    let passage = await getLocalBiblePassage(parsed.book, parsed.chapter, version);
    
    // Fallback logic if needed (e.g. if one version is missing, try the other)
    if (!passage && version === 'engESV') {
      passage = await getLocalBiblePassage(parsed.book, parsed.chapter, 'korRV');
    } else if (!passage && version === 'korRV') {
      passage = await getLocalBiblePassage(parsed.book, parsed.chapter, 'engESV');
    }

    if (!passage) {
      return NextResponse.json({ error: `Passage not found: ${passageParam}` }, { status: 404 });
    }

    const passageHtml = formatPassageToHtml(passage);
    return NextResponse.json({ html: passageHtml, version: passage.version });

  } catch (error: any) {
    console.error('[API Route /api/esv] Error retrieving local passage:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
