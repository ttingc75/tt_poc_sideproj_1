# SubRadar

A subscription and bill tracker built with Expo (React Native + TypeScript). Free tier tracks up to 5 subscriptions; a one-time in-app purchase unlocks unlimited tracking, CSV export, and stats.

## Stack

- Expo SDK 57, TypeScript, `expo-router`
- `expo-sqlite` for local storage (no backend — everything runs on-device)
- `zustand` for app state
- `expo-notifications` for local renewal reminders
- `react-native-iap` for the one-time pro unlock
- `jest` + `jest-expo` for tests

## Getting started

```bash
pnpm install
pnpm start        # then press i / a / w, or scan the QR code with Expo Go
```

This project uses **pnpm**, not npm — installs are noticeably more reliable on this
setup. If an install ever hangs with no output for more than a minute or two, retry
with `pnpm install --network-concurrency=1` (this environment's network drops
requests under high concurrency; a serialized install is slower but reliable).

### Available scripts

| Command | Purpose |
|---|---|
| `pnpm start` / `pnpm android` / `pnpm ios` / `pnpm web` | Run the app via Expo |
| `pnpm test` | Run the Jest unit test suite |
| `pnpm run typecheck` | `tsc --noEmit` |
| `pnpm run lint` | ESLint |

## Docker-based testing

Docker isn't used to run the app itself (that needs a simulator/emulator or a real
device) — it's used to get a reproducible, containerized environment for
typecheck/lint/test, matching what CI runs:

```bash
docker compose run --rm test
```

`.github/workflows/ci.yml` runs the same command on every PR and push to `main`.

## In-app purchase setup (required before a real purchase will work)

`src/services/iap.ts` references a placeholder product id, `subradar_pro_unlock`.
Before shipping:

1. Create a non-consumable in-app purchase product with that id (or update the
   constant) in App Store Connect and Google Play Console.
2. `react-native-iap` needs native modules, so it will **not** work in Expo Go —
   build a dev client (`eas build --profile development`) to test real purchases.
3. In the running app (dev builds only), Settings has a "[Dev only] Unlock pro for
   testing" toggle that bypasses the store entirely, so the rest of the app (limits,
   CSV export, stats) can be exercised without store configuration.

## Building for iOS / Android

This repo is developed on Windows/WSL, which cannot produce an iOS binary locally.
Use EAS Build for both platforms:

```bash
npx eas login
npx eas build:configure
npx eas build --platform android
npx eas build --platform ios   # requires an Apple Developer account ($99/yr)
```

## Project structure

```
app/                  expo-router screens (dashboard, add/edit, settings)
src/domain/           pure business logic (billing math, CSV formatting) — unit tested
src/db/                expo-sqlite schema + queries
src/store/             zustand store wiring the DB, notifications, and IAP together
src/services/          notifications, CSV export/share, in-app purchase
src/components/        shared UI pieces
__tests__/              Jest tests for src/domain
```
