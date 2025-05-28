
import { type NextRequest, NextResponse } from 'next/server';

// Bible ID for ESV on scripture.api.bible
const ESV_BIBLE_ID = '06125adad2d5898a-01';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const passage = searchParams.get('passage');

  if (!passage) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.BIBLE_API_KEY;

  if (!apiKey) {
    console.error('BIBLE_API_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'Bible API key not configured. Please contact the administrator.' }, { status: 500 });
  }

  // Construct the URL for scripture.api.bible
  // Documentation for passage query: https://scripture.api.bible/livedocs#/Passages/GetPassage
  // It's generally good with common references like "John 3.16" or "Gen 1"
  // Parameters for HTML content:
  // - content-type=html
  // - include-notes=false
  // - include-titles=true
  // - include-chapter-numbers=true
  // - include-verse-numbers=true
  // - include-verse-spans=false (to avoid extra <span> tags around verses if not needed)
  const apiUrl = `https://api.scripture.api.bible/v1/bibles/${ESV_BIBLE_ID}/passages/${encodeURIComponent(passage)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=true&include-verse-numbers=true&include-verse-spans=false`;

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
        // scripture.api.bible errors are usually in a simple message format or an object with `statusCode` and `message`
        if (errorData && errorData.message) {
          errorMessage = `Bible API Error: ${errorData.message} (Status: ${errorData.statusCode || apiResponse.status})`;
        } else if (errorData && typeof errorData === 'string') {
          errorMessage = `Bible API Error: ${errorData}`;
        }
      } catch (e) {
        // Ignore if error response is not JSON or string
      }
      console.error('Bible API Error:', errorMessage, '(URL:', apiUrl, ')');
      return NextResponse.json({ error: errorMessage }, { status: apiResponse.status });
    }

    const responseData = await apiResponse.json();
    
    if (responseData.data && responseData.data.content) {
      return NextResponse.json({ html: responseData.data.content });
    } else {
      console.error('Bible API Error: Passage content not found in response data.', responseData);
      return NextResponse.json({ error: 'Passage content not found in Bible API response.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error calling Bible API:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
