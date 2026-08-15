export type NaverBlogVideoInfo = {
  title: string;
  embedUrl: string;
  sourceUrl: string;
};

const BLOG_FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

export function isNaverBlogUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('blog.naver.com');
  } catch {
    return false;
  }
}

export function getNaverBlogPostViewUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('blog.naver.com')) {
      return null;
    }

    if (parsed.pathname.includes('PostView.naver')) {
      const blogId = parsed.searchParams.get('blogId');
      const logNo = parsed.searchParams.get('logNo');
      if (blogId && logNo) {
        return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog`;
      }
    }

    const pathMatch = parsed.pathname.match(/^\/([^/]+)\/(\d+)\/?$/);
    if (pathMatch) {
      return `https://blog.naver.com/PostView.naver?blogId=${pathMatch[1]}&logNo=${pathMatch[2]}&redirect=Dlog`;
    }

    if (parsed.pathname.includes('NBlogTop.naver')) {
      const blogId = parsed.searchParams.get('blogId');
      const qs = parsed.searchParams.get('Qs');
      if (blogId && qs) {
        const logMatch = qs.match(/\/(\d+)/);
        if (logMatch) {
          return `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logMatch[1]}&redirect=Dlog`;
        }
      }
    }
  } catch {
    return null;
  }

  return null;
}

function buildNaverLegacyEmbedUrl(vid: string, outKey: string) {
  const embedUrl = new URL('https://serviceapi.nmv.naver.com/flash/convertIframeTag.nhn');
  embedUrl.searchParams.set('vid', vid);
  embedUrl.searchParams.set('outKey', outKey);
  return embedUrl.toString();
}

function extractTitle(html: string) {
  const match = html.match(/<meta property="og:title" content="([^"]+)"/i);
  return match?.[1]?.replace(/&amp;/g, '&').trim() ?? null;
}

function extractVideoCredentials(html: string) {
  const videoTagMatch = html.match(
    /<(?:pzp-pc-layout|pzp-mobile-layout)[^>]*class="[^"]*_naverVideo[^"]*"[^>]*>/i
  );

  if (videoTagMatch) {
    const tag = videoTagMatch[0];
    const vid = tag.match(/\svid="([^"]+)"/i)?.[1];
    const outKey =
      tag.match(/\skey="([^"]+)"/i)?.[1] ?? tag.match(/\soutKey="([^"]+)"/i)?.[1];

    if (vid && outKey) {
      return { vid, outKey };
    }
  }

  const postVideoMatch = html.match(/aPostVideoInfo\[\d+]\s*=\s*\[\s*\{[^}]*"vid"\s*:\s*"([^"]+)"/i);
  const vid = postVideoMatch?.[1];
  if (!vid) {
    return null;
  }

  const keyMatch = html.match(new RegExp(`vid="${vid}"[^>]*\\skey="([^"]+)"`, 'i'));
  const outKey = keyMatch?.[1];
  if (!outKey) {
    return null;
  }

  return { vid, outKey };
}

export async function fetchNaverBlogVideoInfo(url: string): Promise<NaverBlogVideoInfo | null> {
  const postViewUrl = getNaverBlogPostViewUrl(url);
  if (!postViewUrl) {
    return null;
  }

  const response = await fetch(postViewUrl, { headers: BLOG_FETCH_HEADERS });
  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const credentials = extractVideoCredentials(html);
  if (!credentials) {
    return null;
  }

  const title = extractTitle(html);
  if (!title) {
    return null;
  }

  return {
    title,
    embedUrl: buildNaverLegacyEmbedUrl(credentials.vid, credentials.outKey),
    sourceUrl: postViewUrl,
  };
}
