export type VideoProvider = 'youtube' | 'naver';

export type VideoEmbedOptions = {
  startSeconds?: number;
  endSeconds?: number;
  enableJsApi?: boolean;
  origin?: string;
};

export function getYouTubeVideoId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function getNaverVideoId(url: string) {
  const match = url.match(/(?:m\.)?tv(?:cast)?\.naver\.com\/(?:v|embed)\/(\d+)/i);
  return match?.[1] ?? null;
}

export function isNaverMeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'naver.me' || parsed.hostname === 'm.naver.me';
  } catch {
    return false;
  }
}

export function isNaverBlogInputUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('blog.naver.com');
  } catch {
    return false;
  }
}

export function getNaverLegacyEmbedUrl(url: string) {
  if (!url.includes('serviceapi.nmv.naver.com')) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const vid = parsed.searchParams.get('vid');
    const outKey = parsed.searchParams.get('outKey');

    if (vid && outKey) {
      const embedUrl = new URL('https://serviceapi.nmv.naver.com/flash/convertIframeTag.nhn');
      embedUrl.searchParams.set('vid', vid);
      embedUrl.searchParams.set('outKey', outKey);
      return embedUrl.toString();
    }
  } catch {
    return null;
  }

  return url;
}

export function getVideoProvider(url: string): VideoProvider | null {
  if (getYouTubeVideoId(url)) {
    return 'youtube';
  }

  if (getNaverVideoId(url) || getNaverLegacyEmbedUrl(url)) {
    return 'naver';
  }

  return null;
}

export function isSupportedVideoUrl(url: string) {
  return getVideoProvider(url) !== null;
}

export function isAllowedVideoInputUrl(url: string) {
  return isSupportedVideoUrl(url) || isNaverMeUrl(url) || isNaverBlogInputUrl(url);
}

export function getVideoEmbedUrl(url: string, options?: VideoEmbedOptions) {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    const hasClip =
      options?.startSeconds !== undefined || options?.endSeconds !== undefined;
    // nocookie avoids signed-in YouTube history overriding chapter start times.
    const embedHost = hasClip
      ? 'https://www.youtube-nocookie.com'
      : 'https://www.youtube.com';
    const embedUrl = new URL(`${embedHost}/embed/${youtubeId}`);

    if (options?.startSeconds !== undefined) {
      embedUrl.searchParams.set('start', String(Math.floor(options.startSeconds)));
    }

    if (options?.endSeconds !== undefined) {
      embedUrl.searchParams.set('end', String(Math.floor(options.endSeconds)));
    }

    if (options?.enableJsApi) {
      embedUrl.searchParams.set('enablejsapi', '1');
      if (options.origin) {
        embedUrl.searchParams.set('origin', options.origin);
      }
    }

    return embedUrl.toString();
  }

  const naverId = getNaverVideoId(url);
  if (naverId) {
    return `https://tv.naver.com/embed/${naverId}`;
  }

  return getNaverLegacyEmbedUrl(url);
}
