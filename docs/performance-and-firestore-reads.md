# Performance & Firestore read reduction

Suggestions to cut Firestore reads and improve load speed (LCP ~5s today) **without** removing features or making the app feel worse.

## Reduce Firestore reads

1. **Keep directory TTL caches warm and consistent**  
   Users, events, community progress already use `collection-cache`. Always write and read the same key version (`users_directory_v3`, `events_directory_v1`, etc.) and clear them on sign-out so a new account never inherits another user’s stale list.

2. **Prefer single-doc / limited queries over full collection scans**  
   Cold load currently `getDocs`s users + events + community progress. Longer term: maintain small summary docs (e.g. `communityProgress/summary`, upcoming-events window) updated by Cloud Functions so clients fetch one doc instead of hundreds.

3. **Chat already has the right pattern — reuse it**  
   Live window of 30 messages + device cache for history. Apply the same “cache first, live window second” approach to photos (image-only indexes), docs list, and worship media metadata.

4. **Debounce write amplification**  
   Bible checklist → community progress sync is already debounced. Avoid fan-out writes on every keystroke in docs; batch or debounce `updatedAt` listeners that other clients subscribe to.

5. **Don’t listen everywhere**  
   Mount schedule / prayer / worship providers only on those routes (or when the hub tab is visible). Badge counts can use lightweight summary fields on the user profile instead of full collection listeners.

6. **Push delivery without extra badge reads when possible**  
   Cache last known badge on the user doc and increment/decrement, so every FCM send doesn’t re-query unread notifications + chats.

7. **Announcement / reminder fan-out**  
   Prefer writing one global announcement doc + topic/condition push (or chunked multicast) over N personal notification docs when the audience is “everyone”.

## Make the site load faster (LCP)

1. **Stop blocking first paint on auth + dynamic import**  
   Home dashboard is `dynamic(..., { ssr: false })` behind a full-screen spinner. Ship a static shell (brand, greeting placeholder, skeleton cards) from the server, then hydrate data.

2. **Seed critical data from local cache before network**  
   Bible plan + checklist now hydrate from localStorage. Extend the same pattern to dashboard progress %, today’s QT, and upcoming duties so LCP content isn’t empty.

3. **Defer non-critical JS**  
   Framer Motion on list pages, command palette, worship viewer, and playlist bar can load after first contentful paint. Prefer CSS transitions for simple fades.

4. **Soften / delay GlobalPageLoader**  
   Full-viewport blur overlays compete with LCP. Show route skeletons after ~150–200ms instead of covering the viewport immediately.

5. **Image strategy**  
   Chat photos should hit the Workbox `CacheFirst` Firebase Storage buckets (already configured). Prime visible thumbnails; paginate grids; avoid mounting hundreds of animated thumbnails at once.

6. **Fonts & CSS**  
   Preload the primary UI font; avoid large unused icon imports; keep `globals.css` critical path small.

7. **Measure after each change**  
   Track LCP / INP in production (Web Vitals) on `/` and `/chat/[id]` specifically — those drive most of the 5s perception.

## What not to sacrifice

- Keep realtime for chat messages and unread badges.  
- Keep offline-friendly device cache for chats and media.  
- Prefer skeletons with last-known data over blank spinners.  
- Don’t “optimize” by hiding features behind extra clicks.
