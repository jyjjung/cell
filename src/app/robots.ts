import type { MetadataRoute } from 'next';

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
}

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/privacy', '/terms', '/login', '/signup', '/forgot-password'],
      disallow: ['/api/', '/admin/', '/chat/', '/docs/', '/profile/', '/pending-approval'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
