# SubRadar — Product & Feature Spec

_Last updated: 2026-07-17_

## What it is

SubRadar is a subscription and recurring-bill tracker for iOS and Android. It's positioned around the "訂閱與帳單失控" (subscriptions/bills spiraling out of control) pain point: users lose track of what they're paying for, get surprised by renewals, and can't easily see what a shared subscription actually costs them.

The product bet is **local-first + privacy** as the differentiator against free competitors (Rocket Money, Bobby, bank-app built-in subscription detection): no account, no server, no data collection, full data portability via CSV.

## Target user

Anyone with 3+ recurring subscriptions/bills who wants a lightweight way to see them in one place — not a power-user finance app, not a budgeting suite. Two secondary angles baked into the design: people who **split** subscriptions with roommates/family, and people who care about **not handing their spending data to a company**.

## Feature list

### Subscription tracking (free + Pro)
- Add / edit / delete a subscription: name, amount, currency (3-letter code), billing cycle (weekly / monthly / yearly), next billing date (native date picker), category, notes
- Split a subscription's cost across N people (including the user) — every total, card, and export uses **your share**, not the full billed amount, with the full price shown as secondary context
- Dashboard: monthly + yearly total spend (your share, across all subscriptions), list sorted by soonest-due, entries due within 3 days flagged
- Local push reminder 2 days before each subscription's next billing date (no push server — scheduled entirely on-device via `expo-notifications`)

### Free tier
- Up to 5 subscriptions tracked at once (`FREE_SUBSCRIPTION_LIMIT` in `src/domain/subscription.ts`)
- Everything else (reminders, splitting, dashboard) is unrestricted even on free

### Pro (one-time in-app purchase, not a subscription)
- Unlimited subscriptions
- Spending analysis (`app/stats.tsx`), three views:
  - **Spending trend** — total monthly-equivalent spend over the last 6 months, built by replaying a local event log (see "Spend history" below), not just a snapshot of today's subscriptions
  - **Top 5 subscriptions** — ranked by monthly-equivalent cost (your share), so the biggest costs are obvious at a glance
  - **Spending by category** — bar chart with each category's monthly total, % of overall spend, and subscription count; "Uncategorized" bucket for anything without a category
- CSV export — via the OS share sheet, so it goes wherever the user sends it
- CSV import — **merges** into existing data (never replaces), skips and counts invalid rows, respects the free-tier cap if somehow triggered without Pro
- "Restore purchases" flow for reinstalls

### Spend history (powers the trend chart)
Every add / edit / delete / import writes a `monthlyDelta` event (`spend_events` table) recording how much the total monthly-equivalent spend changed and when. The trend chart replays these events into a running total per month — it's a real history, not a re-computation from today's subscription list, so it still reflects a subscription that was cancelled last month. Existing subscriptions from before this feature shipped are backfilled with one synthetic "added" event using their original `createdAt` date, so the trend isn't empty for existing users.

### Onboarding
- First-launch screen (`app/onboarding.tsx`) explaining: data stays on-device, how reminders work, and the free/Pro split. Shown once, tracked via a `hasOnboarded` flag in local settings; the dashboard route redirects here until it's completed.

## Explicit non-goals (for now)

- No backend, no accounts, no cross-device sync — this is a deliberate MVP scope decision, not a missing feature. If sync is ever added it would need to be opt-in and clearly separated from the "fully local" privacy pitch.
- No real-time currency conversion — multi-currency subscriptions are tracked but summed as raw numbers, not converted to one currency.
- No automatic price-increase detection — would require an external data source (defeats the offline-first design) or a much weaker "we noticed you edited the amount" heuristic; not implemented.
- No recurring/subscription-based monetization — Pro is a single one-time unlock by design.

## Known gaps before store submission

Tracked in `STORE_LISTING.md` and `PRIVACY.md`:
- Contact email placeholder not filled in
- Privacy policy not hosted at a public URL yet (stores require this, not a repo file)
- No screenshots captured (needs a running build on a simulator/device)
- No real IAP product configured in App Store Connect / Google Play Console yet — `subradar_pro_unlock` is a placeholder SKU
- Notification delivery has not been verified on a real device/simulator in this session (only reviewed at the code level)
