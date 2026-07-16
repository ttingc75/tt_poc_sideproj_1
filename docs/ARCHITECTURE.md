# SubRadar — Technical Architecture

_Last updated: 2026-07-17_

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK 57 (React Native 0.86, React 19) + TypeScript | Single codebase for iOS + Android, fast local iteration, EAS Build for CI/store builds without owning native tooling |
| Routing | `expo-router` | File-based routing, current Expo default |
| Storage | `expo-sqlite` | Needs sortable/aggregatable queries (upcoming renewals, monthly totals) — plain AsyncStorage JSON blobs don't scale to that |
| State | `zustand` | One small global store is enough for this app's scope; Redux would be pure ceremony here |
| Notifications | `expo-notifications` (local only) | No backend, so no push server — everything is scheduled on-device |
| Payments | `react-native-iap` | One-time non-consumable purchase; needs a dev client, doesn't work in Expo Go |
| Package manager | `pnpm` | See "Environment notes" below — npm was unreliable in this dev environment |
| Tests | `jest` + `jest-expo` (pinned to Jest 29, not 30 — see below) | Only `src/domain` is unit tested; UI/store/db are not (see "Testing strategy") |

## Layering and data flow

```
app/*.tsx  (expo-router screens)
   │  reads/calls
   ▼
src/store/subscriptionStore.ts  (zustand — the only thing screens talk to for data)
   │  calls
   ├──▶ src/db/database.ts        (expo-sqlite queries)
   ├──▶ src/services/notifications.ts
   └──▶ (services/export.ts, import.ts, iap.ts are called directly from screens for
         one-shot actions like "export now" — they don't go through the store because
         they don't need to touch persisted subscription state themselves)

src/domain/subscription.ts  (pure functions + types, zero imports from the project)
   ▲
   │  everything above imports FROM here; nothing here imports back
```

**The rule that matters**: `src/domain/subscription.ts` has no dependency on React Native, Expo, the database, or the store. It only exports plain TypeScript types and pure functions (billing-cycle math, CSV format/parse, validation, date math). This is what makes the domain logic unit-testable in plain Jest without mocking `expo-sqlite` or any native module — the entire `__tests__/subscription.test.ts` suite runs against pure functions, no RN runtime needed.

Concretely, this means:
- `Subscription` / `NewSubscription` are defined once, in domain, and every other layer imports the type rather than redefining it.
- Validation rules (`validateSubscriptionDraft`) live in domain and are called from both `SubscriptionForm.tsx` (manual entry) and `parseSubscriptionsCSV` (import) — one source of truth instead of two validators that could drift.
- Free-tier limit (`FREE_SUBSCRIPTION_LIMIT`) and billing-cycle list (`BILLING_CYCLES`) are domain constants; UI code reads them instead of hardcoding numbers/strings (a hardcoded `/5` in the dashboard was found and fixed during a coupling review — see git history around 2026-07-17).

### Where the layering is intentionally loose

- `subscriptionStore.ts` imports the concrete `src/db/database.ts` module directly — there's no repository interface/abstraction in front of it. For a single-backend MVP with no plan to swap storage engines, adding that indirection would be premature abstraction, not decoupling.
- Persistence and notification side effects are interleaved inside the store's CRUD actions (`addSubscription` both writes to SQLite and schedules a reminder). Splitting these into separate orchestration would only pay off if something other than the UI needed to drive subscription CRUD without notification side effects, which nothing currently does.

## Testing strategy

- **Unit tested**: everything in `src/domain/subscription.ts` (billing math, CSV format/parse, validation, date handling). 42 tests as of 2026-07-17.
- **Not unit tested**: `src/db`, `src/store`, `src/services`, `src/components`, `app/*`. These are exercised manually (Expo Go / dev client) rather than with RN Testing Library, which is an installed-but-unused dependency (`@testing-library/react-native`) reserved for later if UI regressions become a real problem.
- **CI**: `Dockerfile.test` + `docker-compose.yml` run `tsc --noEmit`, `eslint`, and `jest` in a container matching what GitHub Actions runs (`.github/workflows/ci.yml`). Docker isn't used to run the app itself — RN apps need a simulator/emulator/device, not a container.
- **Known Docker gotcha**: `docker compose run` reuses a previously built image if one already exists locally, even if source changed — it does **not** rebuild automatically. Both CI and local docs now always pass `--build` after this silently produced stale test results once during development.

## Environment notes (why some choices look unusual)

This project is developed on Windows with WSL2 (Ubuntu 20.04), which produced a few non-obvious constraints baked into the current setup:

- **Must use `pnpm`, not `npm`.** In this specific dev environment, `npm install` would silently hang forever once it hit the file-write/reify phase, with no error at default log level — traced to the network dropping requests under high concurrency. `pnpm install --network-concurrency=1` (serialized requests) is the reliable fallback if any future install hangs.
- **Must invoke Node/pnpm via `wsl.exe -e bash -lc '...'` using the native Linux path**, not the Windows UNC path (`//wsl.localhost/...`) — the leading `//` makes npm's URL parser throw `ERR_INVALID_URL`.
- **No iOS builds possible locally.** Windows/WSL can't produce an iOS binary; `eas build --platform ios` (cloud) plus an Apple Developer account are required before an iOS build exists at all.

## File map

```
app/                       expo-router screens
  _layout.tsx                root layout: loads store, requests notification
                              permission, initializes IAP, defines the Stack
  onboarding.tsx              first-launch explainer, sets hasOnboarded
  index.tsx                   dashboard (redirects to onboarding if needed)
  add-subscription.tsx        wraps SubscriptionForm for create
  subscription/[id].tsx       wraps SubscriptionForm for edit + delete
  settings.tsx                Pro status, upgrade/restore, export/import, stats link
  stats.tsx                   Pro-gated analysis screen (trend, top spenders, category chart)

src/domain/subscription.ts  pure types + business logic (see above) — the only
                              layer with unit tests
src/db/database.ts           expo-sqlite: schema (subscriptions, settings, spend_events
                              tables), CRUD, lightweight ALTER-TABLE migrations, and a
                              one-time spend_events backfill for pre-existing subscriptions
src/store/subscriptionStore.ts  zustand store: the single thing UI code talks to.
                              Every add/edit/delete/import writes a spend_events row
                              (monthlyDelta) alongside the subscriptions table write.
src/services/
  notifications.ts            schedule/cancel local reminders
  export.ts                   CSV → file → OS share sheet
  import.ts                   OS file picker → read → parseSubscriptionsCSV
  iap.ts                      react-native-iap wiring, dev-mode bypass in Settings
src/components/               presentational pieces (form, card, charts, header) —
                              no direct db/store access; everything comes in via props
  CategoryBarChart.tsx         spend-by-category bars with % and subscription count
  SpendTrendChart.tsx          6-month bar chart built from buildMonthlySpendTrend
  TopSpendingList.tsx          ranked list from topSpendingSubscriptions
__tests__/subscription.test.ts  the entire automated test suite
```

Note: `CategoryBarChart`, `SpendTrendChart`, and the analysis section of `spendByCategory`/`topSpendingSubscriptions`/`buildMonthlySpendTrend` are deliberately built with plain `View`/`StyleSheet` bars rather than a charting library, consistent with the app's minimal-dependencies stance — none of these visualizations need more than proportional rectangles.
