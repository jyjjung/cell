# Client recovery checklist (all devices)

Manual smoke after SW / FCM / cache / chunk changes:

## iOS Safari (browser tab)
- [ ] Load app, sign in
- [ ] Background app 30s, return — no blank/stuck error
- [ ] Profile → Settings → push health shows permission / token state

## iOS installed PWA
- [ ] Add to Home Screen
- [ ] Enable notifications from Profile
- [ ] Send test push
- [ ] Repair push recovers after killing the PWA

## Android Chrome (tab + installed)
- [ ] Same as above for notifications
- [ ] After a deploy, hard-reload recovers from ChunkLoadError if shown

## Desktop (Chrome / Safari / Edge)
- [ ] Offline banner appears when network is cut
- [ ] Coming back online clears the banner
- [ ] Long-open tab after deploy recovers via Try again / hard reload

Automated coverage: `src/lib/fcm-heal.test.ts`, `firestore-idb-errors.test.ts`, `next-client-recovery.test.ts`, and Playwright smokes in `e2e/`.
