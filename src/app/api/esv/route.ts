
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
    return NextResponse.json({ error: 'ESV API key not configured. Please contact the administrator.' }, { status: 500 });
  }

  const apiUrl = `https://api.esv.org/v3/passage/html/?q=${encodeURIComponent(passage)}`;

  try {
    const esvResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (!esvResponse.ok) {
      // Try to parse error from ESV API if possible, otherwise use status text
      let errorMessage = `Failed to fetch passage from ESV API. Status: ${esvResponse.status} ${esvResponse.statusText}`;
      try {
        const errorData = await esvResponse.json();
        if (errorData && errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch (e) {
        // Ignore if error response is not JSON
      }
      console.error('ESV API Error:', errorMessage, '(Status: ', esvResponse.status, ')');
      return NextResponse.json({ error: errorMessage }, { status: esvResponse.status });
    }

    const responseData = await esvResponse.json();
    
    if (responseData.passages && responseData.passages.length > 0) {
      // The ESV API returns HTML content directly in the passages array
      return NextResponse.json({ html: responseData.passages[0] });
    } else {
      console.error('ESV API Error: Passage content not found in response data.', responseData);
      return NextResponse.json({ error: 'Passage content not found in ESV API response.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error calling ESV API:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
