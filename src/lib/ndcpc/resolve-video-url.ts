import { isNaverBlogUrl } from '@/lib/ndcpc/naver-blog';
import { isSupportedVideoUrl } from '@/lib/ndcpc/video';

const RESOLVE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

function isResolvableVideoUrl(url: string) {
  return isSupportedVideoUrl(url) || isNaverBlogUrl(url);
}

function extractBridgeUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'link.naver.com' || !parsed.pathname.startsWith('/bridge')) {
      return null;
    }

    const target = parsed.searchParams.get('url');
    return target ? decodeURIComponent(target) : null;
  } catch {
    return null;
  }
}

export async function resolveVideoUrl(input: string) {
  let current = input;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const bridgeTarget = extractBridgeUrl(current);
    if (bridgeTarget) {
      current = bridgeTarget;
      if (isResolvableVideoUrl(current)) {
        return current;
      }
      continue;
    }

    if (isResolvableVideoUrl(current)) {
      return current;
    }

    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      headers: RESOLVE_HEADERS,
    });

    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        break;
      }

      current = new URL(location, current).toString();
      continue;
    }

    return response.url || current;
  }

  return current;
}
