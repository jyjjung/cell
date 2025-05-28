
import { type NextRequest, NextResponse } from 'next/server';

const DEFAULT_BIBLE_ID = 'de4e12af7f28f599-01'; // KJV

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const passage = searchParams.get('passage');

  if (!passage) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.BIBLE_API_KEY;

  if (!apiKey) {
    console.error('BIBLE_API_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'API key not configured. Please contact the administrator.' }, { status: 500 });
  }

  // The API docs suggest passageId can be like "John 3:16" or "Gen 1-3"
  const apiUrl = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/passages/${encodeURIComponent(passage)}?content-type=html&include-notes=false&include-titles=true&include-chapter-numbers=true&include-verse-numbers=true&include-verse-spans=false`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      let errorMessage = `Failed to fetch passage from Bible API. Status: ${response.status}`;
      if (errorData && errorData.message) {
        errorMessage = errorData.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
      console.error(`Bible API Error (${response.status}):`, errorData);
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    const responseData = await response.json();
    
    if (responseData.data && responseData.data.content) {
      return NextResponse.json({ html: responseData.data.content });
    } else {
      console.error('Bible API Error: Passage content not found in response data.', responseData);
      return NextResponse.json({ error: 'Passage content not found in API response.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error calling Bible API:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
