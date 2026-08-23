import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NDC Community Apps',
    short_name: 'NDC Community',
    description: 'Church member apps — cell group, preschool volunteers, and more.',
    start_url: '/',
    display: 'standalone',
    background_color: '#161616',
    theme_color: '#161616',
    orientation: 'portrait-primary',
    icons: [
      // Raster icons — required by iOS Safari and Android for home screen
      // v6 cache-bust: installed PWAs only refresh icons when the URL changes
      {
        src: '/icon-192x192-v6.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512-v6.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512-v6.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      // SVG fallback for modern browsers
      {
        src: '/icon-v6.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
