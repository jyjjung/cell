import type { MetadataRoute } from 'next';

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:9002';
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/features`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${base}/login`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/signup`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
