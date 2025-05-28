
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const passage = searchParams.get('passage');

  if (!passage) {
    return NextResponse.json({ error: 'Passage parameter is required' }, { status: 400 });
  }

  const apiKey = process.env.ESV_API_KEY;

  if (!apiKey) {
    console.error('[API Route /api/esv] ESV_API_KEY is not defined in environment variables.');
    return NextResponse.json({ error: 'ESV API key not configured. Please contact the administrator.' }, { status: 500 });
  }
  
  // console.log(`[API Route /api/esv] Calling ESV API for passage: "${passage}"`);

  const apiUrl = `https://api.esv.org/v3/passage/html/?q=${encodeURIComponent(passage)}&include-footnotes=false&include-headings=true&include-short-copyright=false&include-copyright=false&include-audio-link=false`;

  try {
    const apiResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (!apiResponse.ok) {
      let errorMessage = `Failed to fetch passage from ESV API. Status: ${apiResponse.status} ${apiResponse.statusText}`;
      try {
        const errorData = await apiResponse.json();
        if (errorData && errorData.detail) {
          errorMessage = `ESV API Error: ${errorData.detail}`;
        } else if (errorData && errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
          errorMessage = `ESV API Error: ${errorData.details.join(', ')}`;
        }
      } catch (e) {
        // Ignore if error response is not JSON
      }
      console.error('[API Route /api/esv] ESV API Error:', errorMessage, '(URL:', apiUrl, ')');
      return NextResponse.json({ error: errorMessage }, { status: apiResponse.status });
    }

    const responseData = await apiResponse.json();
    
    if (responseData.passages && responseData.passages.length > 0) {
      let passageHtml = responseData.passages[0];
      
      // Regex replacements as a fallback, though include-audio-link=false should prevent these.
      const listenLinkRegex = /<a[^>]*>\s*\(\s*Listen\s*\)\s*<\/a>/gi;
      passageHtml = passageHtml.replace(listenLinkRegex, '');
      
      const plainListenTextRegex = /\s*\(\s*Listen\s*\)/gi;
      passageHtml = passageHtml.replace(plainListenTextRegex, '');

      return NextResponse.json({ html: passageHtml });
    } else {
      console.error('[API Route /api/esv] ESV API Error: Passage content not found in response data.', responseData);
      return NextResponse.json({ error: 'Passage content not found in ESV API response.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[API Route /api/esv] Error calling ESV API:', error);
    return NextResponse.json({ error: `An unexpected error occurred: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
