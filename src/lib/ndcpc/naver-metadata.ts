import { createHmac } from 'node:crypto';

import { getNaverVideoId } from '@/lib/ndcpc/video';

const NAVER_API_KEY = 'nbxvs5nwNG9QKEWK0ADjYA4JZoujF4gHcIwvoCxFTPAeamq5eemvt5IWAYXxrbYM';

function signNaverApiRequest(path: string) {
  const apiEndpoint = `https://apis.naver.com/now_web2/now_web_api/v1${path}`;
  const msgpad = Date.now();
  const md = createHmac('sha1', NAVER_API_KEY)
    .update(`${apiEndpoint.slice(0, 255)}${msgpad}`)
    .digest('base64');

  const signedUrl = new URL(apiEndpoint);
  signedUrl.searchParams.set('msgpad', String(msgpad));
  signedUrl.searchParams.set('md', md);

  return signedUrl.toString();
}

export async function fetchNaverVideoTitle(url: string) {
  const videoId = getNaverVideoId(url);
  if (!videoId) {
    return null;
  }

  const response = await fetch(signNaverApiRequest(`/clips/${videoId}/play-info`));
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (data.statusCode !== 'SUCCESS') {
    return null;
  }

  return (data.result?.clip?.title as string | undefined) ?? null;
}
