# em. portal

Private cell-group community portal built with Next.js, Firebase, and Tailwind CSS.

## Features

- Real-time chat, Bible reading, rosters & events
- Worship setlists, docs, prayer requests, admin tools
- PWA install support for phones

## Setup

1. Copy `.env.example` to `.env.local` and fill in Firebase Admin + secrets.
2. Install and run:

```bash
npm install
npm run dev
```

Dev server defaults to [http://localhost:9002](http://localhost:9002).

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Firestore rules tests (Firebase emulator) |

### Deploy notes

- Hosting is typically Vercel; set the same env vars in the project settings.
- Set `NEXT_PUBLIC_SITE_URL` to your production URL for sitemap / Open Graph.
- Set `NEXT_PUBLIC_SENTRY_DSN` (from Sentry → Project Settings → Client Keys) so crashes show up in Sentry.
- After changing `storage.rules`, deploy them with the Firebase CLI (`firebase deploy --only storage`).
- Session cookies (`/api/auth/session`) require working Firebase Admin credentials.

If you encounter `ChunkLoadError` in development, hard refresh (Ctrl+Shift+R / Cmd+Shift+R) — the PWA service worker may be caching old assets.
