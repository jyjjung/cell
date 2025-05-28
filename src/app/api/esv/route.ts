
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const passage = searchParams.get('passage');

  if (!passage) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.ESV_API_KEY;

  if (!apiKey) {
    console.error('ESV_API_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'API key not configured. Please contact the administrator.' }, { status: 500 });
  }

  const esvApiUrl = `https://api.esv.org/v3/passage/html/?q=${encodeURIComponent(passage)}`;

  try {
    const response = await fetch(esvApiUrl, {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`ESV API Error (${response.status}):`, errorData);
      return NextResponse.json({ error: `Failed to fetch passage from ESV API: ${errorData.detail || response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    // The HTML content is typically in data.passages[0]
    const passageHtml = data.passages && data.passages.length > 0 ? data.passages[0] : '<p>Passage not found or an unexpected API response.</p>';
    
    return NextResponse.json({ html: passageHtml });

  } catch (error: any) {
    console.error('Error calling ESV API:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
