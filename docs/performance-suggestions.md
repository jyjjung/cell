# Performance & Firestore read reduction

Suggestions from the July 28 2026 platform pass. None of these sacrifice features; they target redundant listeners, cold starts, and LCP (~5s).

## Reduce Firestore reads

1. **Prefer single-doc / scoped queries over collection sweeps**
   - Community progress cold load still does `getDocs(communityProgress)`. Prefer per-user `getDoc` when opening a member profile, and keep the full collection fetch for leaderboard only.
   - Birthday reminders now use one global notification (done) instead of N per-user writes.

2. **Stale-while-revalidate everywhere directories already exist**
   - Users, events, rosters, notifications already use local collection cache. Extend the same pattern to chat metadata and worship setlists list pages so revisits skip network.

3. **Collapse duplicate listeners**
   - Dashboard, schedule hub, and worship can each subscribe to cleaning/QT/worship independently. Prefer shared providers (`ScheduleDataProvider`, `WorshipDataProvider`) and never mount a second `onSnapshot` for the same collection on one screen.

4. **Chat message windowing**
   - Keep the live window at ~30 messages (already). Photos/links tabs should page older history only when opened (done for Photos) instead of hydrating full chat history on enter.

5. **Server-side fan-out for community alerts**
   - Prefer `isGlobal: true` + one push multicast for community-wide reminders (birthdays, memory verses) rather than one notification doc per user.

6. **Avoid metadata-only snapshot churn**
   - Use `includeMetadataChanges` only where cache vs server distinction matters (docs). Default listeners should ignore pending writes noise.

## Faster loads / better LCP (~5s → target <2.5s)

1. **Above-the-fold shell first**
   - Render dashboard chrome (greeting, shortcuts) from auth profile alone; defer calendar/roster widgets behind `requestIdleCallback` or dynamic import.

2. **Code-split heavy routes**
   - Dynamic-import worship viewers, bible plan admin, and chart/PDF tools so the main layout JS stays small.

3. **Preconnect + cache static assets**
   - Ensure Firebase Storage / fonts are preconnected; keep CacheFirst SW strategy for storage images (already present).

4. **Shrink bible plan payload on first paint**
   - Cache plan locally (done). Longer-term: store a compact “today + next 7 days” projection doc for the dashboard, keep full plan for the checklist page.

5. **Auth-gated listeners after login**
   - Re-subscribe config/plan listeners when `currentUser` appears (done for bible plan) so new-device sign-in does not require a refresh.

6. **Image LCP**
   - Dashboard and chat avatars: use correctly sized `RemoteImage`/`sizes`, avoid decoding large originals in the first viewport.

7. **Measure**
   - Add a lightweight web-vitals reporter (LCP/INP/CLS) to feedback or admin so regressions are visible after deploys.
