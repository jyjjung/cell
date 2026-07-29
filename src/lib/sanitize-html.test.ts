import { describe, expect, it } from 'vitest';
import { escapeHtml, sanitizeRichHtml } from '@/lib/sanitize-html';
import { clientIpFromRequest, rateLimit } from '@/lib/rate-limit';

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
    );
  });
});

describe('sanitizeRichHtml', () => {
  it('strips script tags and event handlers', () => {
    const dirty = `<p onclick="alert(1)">Hi</p><script>alert(2)</script>`;
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('<p');
    expect(clean).toContain('Hi');
  });
});

describe('rateLimit', () => {
  it('allows requests under the limit and blocks over', () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(false);
  });
});

describe('clientIpFromRequest', () => {
  it('reads the first x-forwarded-for hop', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(clientIpFromRequest(request)).toBe('1.2.3.4');
  });
});
