
import { type NextRequest, NextResponse } from 'next/server';

// Bible ID for ESV on scripture.api.bible
const ESV_BIBLE_ID = '06125adad2d5898a-01';

// Regex to capture "Book Chapter" from a passage string.
// Handles "Genesis 1", "1 Samuel 2", "Song of Solomon 3:15-20", "John 3:16"
// It will capture the book name (group 1) and the chapter number (group 2).
const BOOK_CHAPTER_REGEX = /^([1-3]?\s?[A-Za-z\s]+?)\s*(\d+)([:.\s(].*)?$/;


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let originalPassage = searchParams.get('passage');

  if (!originalPassage) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  console.log(`[API Route /api/bible-text] Received original passage request: "${originalPassage}"`);

  let simplifiedPassage = originalPassage;
  const match = originalPassage.match(BOOK_CHAPTER_REGEX);

  if (match && match[1] && match[2]) {
    const bookName = match[1].trim();
    const chapterNumber = match[2];
    simplifiedPassage = `${bookName} ${chapterNumber}`;
    console.log(`[API Route /api/bible-text] Simplified to request whole chapter: "${simplifiedPassage}"`);
  } else {
    // If regex doesn't match, it might be a simple book name or something unexpected.
    // We'll try to use it as is, but scripture.api.bible might reject it if it's not a valid reference.
    console.warn(`[API Route /api/bible-text] Could not simplify passage "${originalPassage}" to Book Chapter format. Using as is.`);
  }

  const apiKey = process.env.BIBLE_API_KEY;

  if (!apiKey) {
    console.error('[API Route /api/bible-text] BIBLE_API_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'Bible API key not configured. Please contact the administrator.' }, { status: 500 });
  } else {
     // Avoid logging the full key for security, just parts of it.
    const displayKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'key_too_short_to_display_parts';
    console.log(`[API Route /api/bible-text] Attempting to use BIBLE_API_KEY starting/ending with: ${displayKey}`);
  }

  const apiUrl = `https://api.scripture.api.bible/v1/bibles/${ESV_BIBLE_ID}/passages/${encodeURIComponent(simplifiedPassage)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=true&include-verse-numbers=true&include-verse-spans=false`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'api-key': apiKey,
      },
    });

    if (!apiResponse.ok) {
      let errorMessage = `Failed to fetch passage from Bible API. Status: ${apiResponse.status} ${apiResponse.statusText}`;
      try {
        const errorData = await apiResponse.json();
        if (errorData && errorData.message) {
          errorMessage = `Bible API Error: ${errorData.message} (Status: ${errorData.statusCode || apiResponse.status})`;
        } else if (errorData && typeof errorData === 'string') {
          errorMessage = `Bible API Error: ${errorData}`;
        }
      } catch (e) {
        // Ignore if error response is not JSON or string
      }
      console.error('[API Route /api/bible-text] Bible API Error:', errorMessage, '(URL:', apiUrl, ')');
      return NextResponse.json({ error: errorMessage }, { status: apiResponse.status });
    }

    const responseData = await apiResponse.json();
    
    if (responseData.data && responseData.data.content) {
      return NextResponse.json({ html: responseData.data.content });
    } else {
      console.error('[API Route /api/bible-text] Bible API Error: Passage content not found in response data.', responseData);
      return NextResponse.json({ error: 'Passage content not found in Bible API response.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API Route /api/bible-text] Error calling Bible API:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
