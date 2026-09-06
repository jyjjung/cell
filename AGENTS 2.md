# AI editor guide - NDC Community Apps

**Status:** living project guide  
**Last reviewed:** 2026-09-06  
**Audience:** every AI coding agent and editor working in this repository  

This file is the single canonical policy document for the project. Read it
before changing code. It contains the complete shared rule set and the
implementation-grounded outline of how the website works so every AI editor
and agent follows the same guidance.

When this file conflicts with the implementation, verify the implementation
and update this file. Editor-specific rule files are compatibility artifacts,
not additional policy sources.

## 1. Project identity

- Product: **NDC Community Apps**; the primary cell-group experience is branded
  **em.**
- Repository: `jyjjung/cell`
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix UI,
  Framer Motion, Firebase, Firebase Admin, Vitest, and Playwright.
- Local development: `npm run dev` at `http://localhost:9002`.
- Canonical production host: `https://ndccommunity.vercel.app`.
- Firebase project: `cell-abca4`.
- Hosting: normally Vercel.
- The app is a private, authenticated church community portal. Treat member
  data, chat, profiles, schedules, forms, and uploaded media as sensitive.

## 2. Agent operating contract

1. Inspect existing patterns before adding a helper, component, listener, route,
   or dependency. Reuse shared primitives and providers.
2. Make the smallest complete change. Do not rewrite unrelated code or revert
   user changes.
3. Preserve existing UX and data compatibility unless the request explicitly
   changes behavior.
4. Keep types correct. Prefer proper types and guards over `as any`,
   `as unknown as`, broad catches, silent fallbacks, or duplicated logic.
5. Surface failures using the repository's existing error, toast, logging, or
   error-boundary patterns.
6. Use ASCII by default when editing.
7. Update directly related documentation, changelog entries, and this guide
   when architecture or user-facing behavior changes.
8. Use existing package scripts for the smallest validation that covers the
   change. At minimum, type-check or test the affected behavior when practical.
9. Never expose credentials, service-account JSON, private keys, or local
   environment values in source, logs, documentation, or commits.
10. Do not add paid vendors or services without explicit approval.
11. Keep direct dependencies and `package-lock.json` in sync. Prefer the latest
    release that is compatible with the existing app architecture; do not force
    a major upgrade when it would require an unreviewed framework migration.
    After dependency changes, run type-checking and the smallest relevant test
    or build command, and document intentional major-version compatibility
    pins in the dependency change.

## 3. Source-of-truth order

Use this order when deciding what is authoritative:

1. Executable code, tests, Firebase rules, and deployment configuration.
2. This `AGENTS.md` for all AI/editor behavior and project guidance.
3. `README.md`, `DESIGN.md`, and `docs/` for supplementary project context.

`DESIGN.md` contains useful visual intent but also older product assumptions.
Do not copy its legacy hard-coded admin password or old color system into new
work. Firebase Auth, current access helpers, semantic theme tokens, and shared
UI primitives are authoritative.

## 4. Apple Human Interface Guidelines implementation

The project is a web app, so apply the intent of Apple's Human Interface
Guidelines across browsers and operating systems. Do not ship Apple-only APIs,
SF Symbols as a font, or Apple-only fonts. Use system-safe CSS and HTML.
The authoritative external reference is the
[Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/).

### Human-centered principles

- **Purpose:** every screen has one primary job; remove or defer content that
  does not support it.
- **Agency:** minimize steps, keep flows escapable, support undo where
  feasible, and do not trap people in modals.
- **Responsibility:** explain permissions and data use at the moment they are
  needed; collect only what is required.
- **Familiarity:** use the same row, card, tab, status, loading, empty, error,
  and navigation patterns for the same kinds of content everywhere.
- **Flexibility:** support pointer, touch, keyboard, resizing, zoom, larger
  text, reduced motion, and increased contrast.
- **Simplicity:** simplicity is a clear hierarchy, not the removal of useful
  functionality. Fix information architecture before adding decoration.
- **Craft:** deliberate spacing, alignment, truncation, feedback, and loading
  states are part of correctness.
- **Delight:** use character and motion only when they reinforce the task.

### Orientation and information architecture

Every screen must answer these questions without scrolling or guessing:

| Question | Requirement |
| --- | --- |
| Where am I? | A clear page title (`NavPageHeader`, `PageHeader`, or equivalent). Drill-downs name the item, not only the parent feature. |
| What can I do? | One obvious primary action. Group secondary actions in the header or a menu. |
| Where next? | The next step is visible or one tap away. Back returns to the previous context with `router.back()` when appropriate. |

- Inventory content, prioritize it, group related content, then cut or defer
  non-essential content.
- Use progressive disclosure. Overview pages summarize; detail pages expand.
- Avoid duplicate metrics and competing visual anchors.
- Use plain member-facing language. Do not expose internal abbreviations,
  codes, route names, or implementation terms.
- Order content as current status, primary action, supporting detail, then
  history/archive.
- Use list rows for structured text and keep overview rows to one primary line
  plus one supporting line where possible.
- Group large lists by progress, time, relevance, or meaningful pattern.
- Preserve scroll position, selection, and prior context when reasonable.

### Shared component rules

Always use shared primitives. Do not create one-off equivalents.

| Need | Required primitive | Never |
| --- | --- | --- |
| Button | `Button` | Raw `<button>` without the shared sizing/focus behavior |
| Icon-only control | `IconButton` with required `aria-label` | Unlabelled icon buttons |
| Hub navigation | `HubTab`, `HubTabIconButton`, `BottomHubBar` | Page-specific tab markup |
| Loading | `LoadingState`, `PageLoading`, `ListLoadingSkeleton` | Blank screens or ad-hoc spinners |
| Auth/layout gate | `LayoutGate` | `return null` while loading |
| Settings toggle | `SwitchRow` | Bare switch without a visible row label |
| Form field | `FormField` and `formFieldControlProps` | Placeholder-only inputs |
| React Hook Form | Shared `Form`, `FormLabel`, `FormControl` | Ad-hoc labels and error wiring |
| Selection row | `SelectionRow` | Tiny checkbox/switch rows |
| Empty content | `EmptyState` | Custom empty divs |
| Page structure | `PageShell`, `NavPageHeader`, `PageSection` | Ad-hoc page containers or nested rhythm wrappers |
| Destructive confirmation | `AlertDialog` with Cancel and destructive action | `window.confirm` or delete-only popovers |

### Page rhythm

- Every route uses one shared shell and vertical rhythm.
- `PageShell`/`page-container` has `gap-5` between direct children.
- The page header is a sibling of the body, not nested inside an extra
  `home-flow`, `stack-gap-*`, or similar wrapper.
- Use `page-flow` for multiple body sections and `PageSection` for grouped
  content.
- Page headers are title-first. Do not add a subtitle directly beneath
  `NavPageHeader` or `PageHeader`; put explanatory copy in the relevant
  section, dialog, empty state, or form.
- Controls remain inset even when content bleeds to the edge.
- Respect `env(safe-area-inset-top/right/bottom/left)`.
- Keep primary actions in thumb reach on phones.

### Touch, controls, and navigation

- The tappable region is at least 44x44 CSS pixels; this does not mean the
  visual glyph or chip must be 44 pixels.
- Standard toolbars, hub controls, composer actions, form submits, and row
  actions use the default 44x44 `Button`/`IconButton`.
- Dense chat actions and reaction chips use `IconButton size="compact"` or
  `Button size="chip"`. Never attach overflowing hit overlays to stacked chat
  rows.
- `.hit-min` is for a visibly 44px box. `.hit-expand` is only for controls
  with enough spacing around them; never use it on chat reactions or chips.
- Controls show pressed, disabled, and `:focus-visible` states. Hover alone is
  not feedback.
- Use one prominent filled action per view. Secondary actions are ghost or
  outline. Destructive actions are never the default or Return action.
- Put navigation in tabs/hub bars and contextual actions in the screen where
  they apply.
- Keep back behavior consistent across related drill-downs.
- Use `touch-action: manipulation` on interactive controls through shared
  primitives.

### Typography, color, and appearance

- Use the system-safe font stack and existing app font variables; never embed
  SF/NY as a requirement.
- Body text is at least 16px where practical. Inputs on touch screens are at
  least 16px to prevent iOS zoom.
- Use `rem` and `--app-font-size-scale` so text can grow.
- Avoid ultralight/thin weights.
- Use semantic tokens (`text-foreground`, `text-muted-foreground`,
  `text-primary`, `text-destructive`, `text-success`) consistently.
- The same color must have the same meaning throughout the app.
- Never communicate status with color alone; pair color with text, icon, or
  shape.
- Maintain at least 4.5:1 contrast, and 7:1 for small text where possible.
- Support light and dark modes, defaulting to the operating system setting.
- Honor `prefers-contrast: more` and `prefers-reduced-transparency`.
- Translucent surfaces require an opaque fallback/scrim.

### Accessibility and input

- Core tasks must work with keyboard, pointer, and touch.
- Use logical tab order and visible `focus-visible` rings.
- Give every custom control an accessible name.
- Use visible labels, not placeholder-only forms.
- Add `aria-invalid` and `aria-describedby` to invalid fields.
- Provide `type`, `inputMode`, and `autoComplete` on inputs where relevant.
- Use rows at least 44px for switches, checkboxes, and picker options.
- Selected picker values show a checkmark or another non-color indicator.
- Status messages use `role="status"`/`aria-live="polite"` as appropriate.
- Support screen readers, zoom, large text, and non-color status cues.

### Loading, feedback, motion, and destructive work

- Paint the shell and a layout-matching skeleton immediately.
- Do not show an empty state while data is still loading.
- Defer spinners for brief work; use `useDeferredLoading`/shared loading
  components where available.
- Mark busy content with `aria-busy`; use determinate `Progress` when duration
  is known.
- Load the shell first and let independent sections load independently.
- Honor `prefers-reduced-motion`; use `motion-safe:` and avoid scale/hover
  zoom when reduced motion is requested.
- Hover-revealed actions remain available on coarse pointers.
- Use `AlertDialog` for irreversible work. The dialog explains the consequence,
  focuses Cancel, and presents a clearly destructive red action.
- Inline validation belongs next to its field; alerts are for important
  cross-screen information, not routine validation.

## 5. Performance and cost rules

Fast UX and low Firebase cost are hard requirements.

### First paint and bundles

- Never return a blank screen while auth or data loads.
- Use `LayoutGate`, skeletons, and route-level loading states.
- Code-split heavy pages and below-fold blocks with `next/dynamic`.
- Defer admin widgets, dialogs, secondary panels, metrics, and non-critical
  listeners until after primary content paints.
- Do not add staggered entrance animations to above-the-fold lists.
- Import only what the route needs.

### Firestore

- Prefer one shared provider/listener per dataset over per-row listeners.
- Gate realtime listeners by route and unsubscribe when leaving.
- Bound every query with `limit`; paginate or load on open.
- Prefer cache-first reads where stale data is acceptable.
- Avoid N+1 reads in list renders.
- Denormalize or index data needed by lists.
- Debounce/coalesce bursty writes such as typing, drafts, toggles, and presence.
- Batch related writes and skip no-op writes.
- Do not fan out one event to many user documents without a hard cap.

### Storage and media

- Compress and resize before upload.
- Use thumbnails in lists and download originals only when opened.
- Use unique object keys and long-lived cache-control for immutable media.
- Reuse document URLs; do not call `getDownloadURL` on every render.
- Delete unreferenced blobs when the owning document is deleted.
- Do not prefetch full images, PDFs, or chord sheets the user has not requested.

## 6. Website architecture - current outline

### Root composition

`src/app/layout.tsx` is the global composition root. It provides:

1. Metadata, manifest, viewport, and global CSS.
2. Theme provider with OS-default light/dark behavior.
3. Firebase auth context and session restoration.
4. Conditional shared Firestore providers through `AppDataProviders`.
5. Color palette and appearance bootstrap.
6. Setlist playlist state.
7. `AppLayout`, global toasts, dynamic overlays, PWA registration, and
   deferred metrics.

`AppLayout` selects guest, shell, authenticated, app-specific, sidebar, hub
tab, offline, chat viewport, and approval-gate behavior. Authenticated data
providers are not mounted for guests.

### Community apps and access

The app switcher recognizes five app identities:

| App | Entry | Purpose | Access |
| --- | --- | --- | --- |
| `accounts` | `/accounts` | Profile, appearance, app preferences, notifications | Any signed-in profile |
| `cell` | `/cell` | em. cell-group community | Approved member, role/access rules, or app admin |
| `ndcpc` | `/ndcpc` | Preschool volunteer hub | Approved NDCPC member or admin |
| `users` | `/users` | Member approval, roles, and access administration | `app.admin` |
| `updates` | `/feedback` | Changelog and member feedback | Any signed-in member |

`src/lib/app-access.ts` is the client-side access and route identity helper.
Server and Firestore rules are authoritative. Do not use client checks as a
security boundary.

Cell home and chat have `/cell` routes. Many Cell feature routes remain at
root paths for compatibility; `next.config.js` rewrites `/cell/<feature>` to
the legacy root feature route. Preserve this when adding or moving routes.

First entry is Account for multi-app users unless a valid last-app preference
exists; later entries resume the last app using local storage/cookie preference.
Do not reintroduce a server redirect that waits for Firebase and causes an
offline blank screen.

### Authentication and approval

- Firebase client auth is initialized in `src/lib/firebase.ts` with persistent
  browser auth and Firestore persistent multi-tab cache.
- IndexedDB failures trigger one recovery attempt, then memory-cache fallback;
  avoid infinite reload loops.
- `__session` is the HttpOnly SSR session hint cookie.
- `ndc_last_app` is a non-secret last-app preference cookie.
- `src/lib/firebase-admin.ts` initializes the named Admin singleton for API
  routes. Prefer split `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and
  `FIREBASE_PRIVATE_KEY`; JSON service-account env is the fallback.
- Unapproved members are routed to `/pending-approval`, except for allowed
  profile/account flows. Admins bypass approval.
- Never hard-code passwords or treat a UI gate as authorization.

### Shared data providers

When a Firebase session exists, `AppDataProviders` mounts:

`UsersProvider` -> `NotificationsProvider` -> `InboxProvider` ->
`EventsProvider` -> `BiblePlanProvider` -> `ChatsProvider` ->
`ScheduleDataProvider` -> `PrayerRequestsProvider`.

Add data to an existing provider or a new shared provider only when ownership
and route-gating are clear. Do not add independent listeners in every row or
page.

### Navigation and layout

- Shared layout primitives live under `src/components/layout`,
  `src/components/shell`, and `src/components/ui`.
- `Sidebar`, `Header`, `AuthenticatedAppChrome`, `BottomHubBar`, and hub tab
  components provide the consistent authenticated navigation.
- Reading routes expose reading/leaderboard hub tabs.
- Schedule routes expose events, QT, cleaning, and roster hub tabs.
- Individual chat routes use a full-height shell and mobile visual viewport
  handling for keyboards.
- `PageShell`, `NavPageHeader`, and `PageSection` define route rhythm.
- `LayoutGate` renders skeleton loading instead of null.
- `OfflineBanner`, PWA install prompts, notification setup, and chunk recovery
  are cross-cutting behaviors; preserve them when changing the shell.

### Route inventory

#### Shell and account routes

- `/` - entry/landing and last-app resume.
- `/login`, `/signup`, `/forgot-password` - authentication.
- `/pending-approval` - approval quarantine.
- `/accounts`, `/accounts?tab=profile|appearance|apps|notifications` - account
  settings.
- `/profile` - profile compatibility route.
- `/feedback` - Updates/changelog and feedback.
- `/notifications` - notification/inbox view.
- `/privacy`, `/terms` - legal pages.

#### Cell / em. member routes

- `/cell` - em. home dashboard.
- `/bible-checklist` - reading plan, progress, checklist, reader.
- `/leaderboard` - community reading progress.
- `/chat`, `/chat/[chatId]`, `/chat/photos`, `/chat/links` - chats, media, links,
  threads, reactions, polls, and attachments.
- `/cell/chat`, `/cell/chat/[chatId]` - prefixed chat equivalents.
- `/events` - event and occurrence schedule.
- `/qt` - QT-related schedule.
- `/cleaning-roster` - cleaning duties.
- `/rosters`, `/rosters/[id]` - configurable rosters.
- `/worship` - worship portal, rosters, setlists, and chord/media viewers.
- `/media` - shared links/media.
- `/docs`, `/docs/[docId]` - collaborative documents, comments, and chat share.
- `/forms` - member forms and responses.
- `/forms/public/[publicToken]` - public form entry.
- `/forms/public/[publicToken]/responses` and
  `/forms/guest/[formId]/[responseId]` - response flows.
- `/prayer-requests` - prayer requests.
- `/announcements` - announcements and reactions.
- `/members/[id]` - member profile/detail.

#### NDCPC routes

- `/ndcpc` - preschool dashboard.
- `/ndcpc/chat`, `/ndcpc/chat/[chatId]` - shared chat system scoped to NDCPC.
- `/ndcpc/photos` - NDCPC photo gallery.
- `/ndcpc/worship` - worship hub.
- `/ndcpc/announcements` - announcements.
- `/ndcpc/prayer` - prayer topics.
- `/ndcpc/resources` - resources and chapters.
- `/ndcpc/roster` - volunteer roster.
- `/ndcpc/schedule`, `/ndcpc/schedules` - schedules and duties.
- `/ndcpc/setlist` - setlists.
- `/ndcpc/admin` - NDCPC administration.

#### Admin and user-management routes

- `/admin` - admin dashboard.
- `/admin/events` - event management.
- `/admin/bible-plan` - Bible plan administration.
- `/admin/cleaning-roster`, `/admin/qt-roster` - roster administration.
- `/admin/custom-rosters` - roster definitions and permissions.
- `/admin/groups` - group/chat administration.
- `/admin/info-widgets` - home information widgets.
- `/admin/notifications` - announcements/notifications.
- `/admin/users` - user operations.
- `/admin/forms`, `/admin/forms/new`, `/admin/forms/[formId]`,
  `/admin/forms/[formId]/responses` - form authoring and reporting.
- `/users` - Users app management surface.

#### API route families

API routes cover auth sessions, Bible passages, admin users/roles/rosters,
chat deletion and push, documents/comments/sharing, forms, feedback,
prayer notifications, profile birthdays, signup/invites, cron reminders,
NDCPC video metadata, and profile/chat synchronization.

API handlers must authenticate server-side with Firebase Admin or the existing
API auth helpers, validate inputs with existing schemas/utilities, and return
explicit errors. Cron endpoints use the existing cron authentication pattern.

### Domain capabilities

- **Chat:** realtime conversations, group creation, membership, threads,
  reactions, polls, links, photos, attachments, message deletion, cached media,
  unread badges, and push notifications.
- **Bible:** local Bible XML data, reading plans, daily checklists, progress,
  heatmap/leaderboard, passage API/cache, multiple text versions, and reader
  overlays. Preserve checklist migration compatibility.
- **Schedule:** events, occurrences, QT, cleaning, configurable rosters,
  visibility/edit permissions, duties, reminders, and hub navigation.
- **Worship:** rosters, setlists, songs, chord charts/sheets, YouTube references,
  playlist/viewer modes, and role-gated management.
- **Documents:** editor, directory, comments, sharing, chat-share summaries,
  membership synchronization, and deleted-content handling.
- **Forms:** definitions, fields, validation, lifecycle, public/guest/member
  submission, responses, capacity/reminders, exports, and admin reports.
- **NDCPC:** namespaced schedules, roster assignments, resources, photos,
  announcements, prayer topics, worship, role chats, and manager-only team chat.
- **Accounts and appearance:** profile identity, language, themes, notification
  preferences, FCM registration/healing, avatars, and existing cosmetic unlocks.

### Firebase data and authorization

The main Firestore areas include users, roles, config, Bible checklists and
progress, events/schedules/rosters, chats/messages, documents/comments, forms
and responses, notifications, prayer requests, and namespaced `ndcpc*`
collections. Confirm exact collection names in code and `firestore.rules`
before adding data.

Important authorization concepts:

- `isApproved` controls membership eligibility.
- `capabilityKeys` contains capabilities such as `app.admin`,
  `worship.manage`, `ndcpc.admin`, and `member.youth`.
- `roleIds` controls Cell roles and roster permissions.
- `ndcpcRoleIds`, `access.cell`, and `access.ndcpc` control app assignment.
- NDCPC admin compatibility includes `ndcpcRole: 'admin'`.
- Access is enforced by Firestore rules, Storage rules, server handlers, and
  route/UI checks as appropriate.

Storage paths currently include avatars, chat media, worship chord sheets, and
NDCPC photos. Keep uploads scoped, size/type validated, and cached according
to the existing rules and helpers.

### PWA, caching, and deployment

- PWA/service worker behavior is configured in `next.config.js`; local
  development skips PWA.
- Firebase/GCS media and DiceBear avatars use cache-first runtime caching.
- Bible API routes use network-first caching with a timeout.
- Images use AVIF/WebP where supported and approved remote patterns.
- CSP and security headers are defined in `next.config.js`; update them when
  adding a legitimate external origin.
- `/full-plan` permanently redirects to `/bible-checklist`.
- Firebase rules live in `firestore.rules` and `storage.rules`.

If either rules file changes, deploy the changed rules before finishing:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
npx -y firebase-tools@latest deploy --only storage
```

Use only the command relevant to the changed file. If deployment fails because
of authentication, report that plainly; never claim the rules were deployed.

## 7. Product and visual standards

Use the existing semantic theme system rather than hard-coded page colors.
The visual direction is calm, readable, premium, and content-first:

- readable system-safe sans-serif typography;
- clear hierarchy and generous but consistent 4px-based spacing;
- semantic light/dark surfaces with contrast;
- restrained borders, depth, and translucency with solid fallbacks;
- clear primary/secondary/destructive action hierarchy;
- motion that is brief, purposeful, and reduced-motion safe;
- no cosmetic expansion without a product request.

### Cosmetic freeze

Do not add new appearance themes, halo tiers, avatar cosmetic systems, or
similar decorative systems. Existing cosmetics may be fixed, but product
priority is reliability, push/reminders, ACL correctness, and the home spine.

## 8. Changelog and project-current rules

For every user-facing feature, fix, or UI change, update the top entry in
`src/data/changelogs.ts` before pushing:

- benefit-first member language;
- usually 3-5 short bullets;
- categories `Added`, `Changed`, `Fixed`, `Improved`, or `Security`;
- exact calendar date;
- 2-4 word product subtitle;
- SemVer: major for breaking changes, minor for features, patch for fixes.

Do not write engineering details, implementation names, URL paths, listener
descriptions, cache internals, or a commit diary in member-facing notes.

Keep these shared identity facts current whenever auth, admin, deployment, or
portal paths change:

- canonical host and legacy redirects;
- Firebase project;
- app IDs and entry routes;
- approval/access/capability fields;
- NDCPC collection names and chat scope;
- role/chat permission behavior;
- migration status and command order;
- dependency pins when dependency work is performed.

Current migration scripts, in order, are:

1. `scripts/migrate-ndcpc-users-to-em.cjs`
2. `scripts/migrate-ndcpc-firestore-to-em.cjs`
3. `scripts/migrate-ndcpc-storage-to-em.cjs`
4. `scripts/migrate-ndcpc-schedules-to-account-names.cjs`
5. `scripts/migrate-ndcpc-team-chat-to-em.cjs`

Run migrations dry-run first and use the documented project confirmation for
writes.

## 9. Validation and operational commands

### Dependency maintenance

- Use npm for dependency changes and commit both `package.json` and
  `package-lock.json` together.
- Review major upgrades individually before accepting them. In particular,
  Tailwind, TypeScript, ESLint, validation libraries, date pickers, media
  tooling, and gesture/zoom libraries can require source changes.
- Keep the installed framework/toolchain compatible with the repository's
  existing configuration. The current app uses Tailwind 3 configuration and
  compatible Zod/React Hook Form resolver versions; do not silently migrate
  to Tailwind 4 or Zod 4 as part of a routine update.
- Verify dependency updates with:

```bash
npm install
npm run typecheck
npm test
npm run build
```

- Global npm upgrades are constrained by the active Node runtime. Upgrade Node
  first when the latest npm release requires a newer Node patch version.

Use the smallest relevant existing command:

```bash
npm run lint
npm run typecheck
npm test
npm run test:rules
npm run test:e2e
npm run build
```

- Unit tests live mainly beside `src/lib` modules.
- Firestore rule tests are under `tests/firestore`.
- Playwright smoke and form tests are under `e2e`.
- Use focused Vitest/Playwright selectors when available; escalate only when
  the change crosses shared shell, provider, routing, or build boundaries.
- For Firebase rules, validate emulator tests and deploy changed rules.
- Before push, update the changelog for any visible change.

## 10. Updating this guide

Update `AGENTS.md` in the same change when any of the following changes:

- a route, app identity, navigation surface, or rewrite;
- auth/session/approval/access/capability behavior;
- a shared provider or major data flow;
- a Firestore/Storage collection, rule, migration, or API family;
- the design system primitives or HIG interpretation;
- caching, PWA, deployment, security headers, or external origins;
- testing/build commands;
- a product capability or user-facing workflow.

Do not add or maintain a second policy in `.cursor/rules/*.mdc`. Those files
remain only so Cursor can discover project guidance, while this document is
the consolidated source for all editors and agents. If editor-specific
integration requires a pointer file, keep it minimal and point back here.

This file is intentionally maintained as an implementation-grounded contract
rather than a copy of Apple's external documentation. When a new platform or
component pattern is adopted, document the project-specific rule here and
link to the authoritative HIG topic instead of copying external material
wholesale.
