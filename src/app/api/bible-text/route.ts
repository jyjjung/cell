
import { type NextRequest, NextResponse } from 'next/server';

// Bible ID for ESV on scripture.api.bible
const ESV_BIBLE_ID = '06125adad2d5898a-01';

// Regex to capture "Book Chapter" from a passage string.
// Handles "Genesis 1", "1 Samuel 2", "Song of Solomon 3:15-20", "John 3:16"
// It will capture the book name (group 1) and the chapter number (group 2).
const BOOK_CHAPTER_REGEX = /^([1-3]?\s?[A-Za-z\s]+?)\s*(\d+)([:.\s(].*)?$/;

// Mapping from common full book names to scripture.api.bible book IDs
// Based on ESV bible ID: 06125adad2d5898a-01
const BOOK_NAME_TO_API_ID_MAP: Record<string, string> = {
  'Genesis': 'GEN',
  'Exodus': 'EXO',
  'Leviticus': 'LEV',
  'Numbers': 'NUM',
  'Deuteronomy': 'DEU',
  'Joshua': 'JOS',
  'Judges': 'JDG',
  'Ruth': 'RUT',
  '1 Samuel': '1SA',
  '2 Samuel': '2SA',
  '1 Kings': '1KI',
  '2 Kings': '2KI',
  '1 Chronicles': '1CH',
  '2 Chronicles': '2CH',
  'Ezra': 'EZR',
  'Nehemiah': 'NEH',
  'Esther': 'EST',
  'Job': 'JOB',
  'Psalms': 'PSA',
  'Proverbs': 'PRO',
  'Ecclesiastes': 'ECC',
  'Song of Solomon': 'SNG',
  'Isaiah': 'ISA',
  'Jeremiah': 'JER',
  'Lamentations': 'LAM',
  'Ezekiel': 'EZK',
  'Daniel': 'DAN',
  'Hosea': 'HOS',
  'Joel': 'JOL',
  'Amos': 'AMO',
  'Obadiah': 'OBA',
  'Jonah': 'JON',
  'Micah': 'MIC',
  'Nahum': 'NAM',
  'Habakkuk': 'HAB',
  'Zephaniah': 'ZEP',
  'Haggai': 'HAG',
  'Zechariah': 'ZEC',
  'Malachi': 'MAL',
  'Matthew': 'MAT',
  'Mark': 'MRK',
  'Luke': 'LUK',
  'John': 'JHN',
  'Acts': 'ACT',
  'Romans': 'ROM',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  'Galatians': 'GAL',
  'Ephesians': 'EPH',
  'Philippians': 'PHP',
  'Colossians': 'COL',
  '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH',
  '1 Timothy': '1TI',
  '2 Timothy': '2TI',
  'Titus': 'TIT',
  'Philemon': 'PHM',
  'Hebrews': 'HEB',
  'James': 'JAS',
  '1 Peter': '1PE',
  '2 Peter': '2PE',
  '1 John': '1JN',
  '2 John': '2JN',
  '3 John': '3JN',
  'Jude': 'JUD',
  'Revelation': 'REV'
};


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let originalPassage = searchParams.get('passage');

  if (!originalPassage) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  console.log(`[API Route /api/bible-text] Received original passage request: "${originalPassage}"`);

  let passageIdForApi = originalPassage; // Default to original if parsing fails
  const match = originalPassage.match(BOOK_CHAPTER_REGEX);

  if (match && match[1] && match[2]) {
    const fullBookName = match[1].trim();
    const chapterNumber = match[2];
    const apiBookId = BOOK_NAME_TO_API_ID_MAP[fullBookName];

    if (apiBookId) {
      passageIdForApi = `${apiBookId}.${chapterNumber}`;
      console.log(`[API Route /api/bible-text] Transformed to API passage ID: "${passageIdForApi}" (for whole chapter)`);
    } else {
      console.warn(`[API Route /api/bible-text] Could not map book name "${fullBookName}" to an API book ID. Using original: "${originalPassage}"`);
      // Fallback to using the original passage, though it might still fail if not in API's expected format.
      // For more robust handling, one might return a 400 error here.
      // Or, try to use a simplified "BookName Chapter" if the API is sometimes flexible with that.
      // For now, the logic is to request the specific reference as-is from the user if mapping fails.
      passageIdForApi = originalPassage; // Re-set to original if mapping failed, or even just the simplified version from regex
    }
  } else {
    console.warn(`[API Route /api/bible-text] Could not parse book/chapter from "${originalPassage}". Using as is for API call.`);
  }

  const apiKey = process.env.BIBLE_API_KEY;

  if (!apiKey) {
    console.error('[API Route /api/bible-text] BIBLE_API_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'Bible API key not configured. Please contact the administrator.' }, { status: 500 });
  } else {
    const displayKey = apiKey.length > 8 ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'key_too_short_to_display_parts';
    console.log(`[API Route /api/bible-text] Attempting to use BIBLE_API_KEY starting/ending with: ${displayKey}`);
  }

  const apiUrl = `https://api.scripture.api.bible/v1/bibles/${ESV_BIBLE_ID}/passages/${encodeURIComponent(passageIdForApi)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=true&include-verse-numbers=true&include-verse-spans=false`;
  console.log(`[API Route /api/bible-text] Calling API URL: ${apiUrl}`);

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
        } else if (errorData && errorData.error && typeof errorData.error.message === 'string') {
            errorMessage = `Bible API Error: ${errorData.error.message} (Status: ${errorData.error.code || apiResponse.status})`;
        } else if (errorData && errorData.error && typeof errorData.error === 'string') {
             errorMessage = `Bible API Error: ${errorData.error} (Status: ${apiResponse.status})`;
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
