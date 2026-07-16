export type BillingCycle = 'weekly' | 'monthly' | 'yearly';

export interface Subscription {
  id: number;
  name: string;
  amount: number;
  currency: string;
  cycle: BillingCycle;
  nextBillingDate: string; // ISO date, e.g. "2026-08-01"
  category: string | null;
  notes: string | null;
  /** How many people split this subscription's cost, including the user. 1 = not shared. */
  splitCount: number;
  createdAt: string;
}

export type NewSubscription = Omit<Subscription, 'id' | 'createdAt'>;

const CYCLE_DAYS: Record<BillingCycle, number> = {
  weekly: 7,
  monthly: 30.44, // average month length, used only for monthly-equivalent cost math
  yearly: 365.25,
};

/** Normalizes any billing cycle's amount into an equivalent monthly cost. */
export function monthlyEquivalent(amount: number, cycle: BillingCycle): number {
  const monthlyDays = CYCLE_DAYS.monthly;
  return (amount * monthlyDays) / CYCLE_DAYS[cycle];
}

/** Normalizes any billing cycle's amount into an equivalent yearly cost. */
export function yearlyEquivalent(amount: number, cycle: BillingCycle): number {
  return (amount * CYCLE_DAYS.yearly) / CYCLE_DAYS[cycle];
}

/** The user's portion of a shared subscription's cost. splitCount of 1 (or less) returns the full amount. */
export function yourShare(subscription: Pick<Subscription, 'amount' | 'splitCount'>): number {
  return subscription.amount / Math.max(1, subscription.splitCount);
}

export function totalMonthlySpend(subscriptions: Subscription[]): number {
  return subscriptions.reduce((sum, s) => sum + monthlyEquivalent(yourShare(s), s.cycle), 0);
}

export function totalYearlySpend(subscriptions: Subscription[]): number {
  return subscriptions.reduce((sum, s) => sum + yearlyEquivalent(yourShare(s), s.cycle), 0);
}

const UNCATEGORIZED = 'Uncategorized';

export interface CategorySpend {
  category: string;
  monthlyTotal: number;
  /** Share of total monthly spend across all categories, 0-100. 0 if there is no spend at all. */
  percentage: number;
  subscriptionCount: number;
}

/** Groups subscriptions by category and sums their monthly-equivalent cost (your share), descending. */
export function spendByCategory(subscriptions: Subscription[]): CategorySpend[] {
  const totals = new Map<string, { monthlyTotal: number; subscriptionCount: number }>();
  for (const s of subscriptions) {
    const category = s.category?.trim() || UNCATEGORIZED;
    const monthly = monthlyEquivalent(yourShare(s), s.cycle);
    const existing = totals.get(category) ?? { monthlyTotal: 0, subscriptionCount: 0 };
    totals.set(category, {
      monthlyTotal: existing.monthlyTotal + monthly,
      subscriptionCount: existing.subscriptionCount + 1,
    });
  }
  const grandTotal = [...totals.values()].reduce((sum, t) => sum + t.monthlyTotal, 0);
  return [...totals.entries()]
    .map(([category, { monthlyTotal, subscriptionCount }]) => ({
      category,
      monthlyTotal,
      percentage: grandTotal > 0 ? (monthlyTotal / grandTotal) * 100 : 0,
      subscriptionCount,
    }))
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}

export interface RankedSubscription {
  subscription: Subscription;
  monthlySpend: number;
}

/** The N subscriptions costing the most per month (your share), descending. */
export function topSpendingSubscriptions(
  subscriptions: Subscription[],
  limit: number
): RankedSubscription[] {
  return subscriptions
    .map((subscription) => ({
      subscription,
      monthlySpend: monthlyEquivalent(yourShare(subscription), subscription.cycle),
    }))
    .sort((a, b) => b.monthlySpend - a.monthlySpend)
    .slice(0, limit);
}

export interface SpendEvent {
  id: number;
  subscriptionName: string;
  /** Change in total monthly-equivalent spend caused by this event (positive for add/increase, negative for remove/decrease). */
  monthlyDelta: number;
  occurredAt: string; // ISO datetime
}

export interface MonthlySpendPoint {
  /** "YYYY-MM" */
  month: string;
  totalMonthlySpend: number;
}

/**
 * Replays spend events into a running monthly-spend total for each of the last `monthsBack`
 * months (including the current month). Each point is the cumulative total as of the end of
 * that month, so it reflects subscriptions added/edited/removed up to that point in time.
 */
export function buildMonthlySpendTrend(
  events: SpendEvent[],
  monthsBack: number,
  now: Date = new Date()
): MonthlySpendPoint[] {
  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const points: MonthlySpendPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const endOfMonth = new Date(
      bucketDate.getFullYear(),
      bucketDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const total = sorted
      .filter((event) => new Date(event.occurredAt).getTime() <= endOfMonth.getTime())
      .reduce((sum, event) => sum + event.monthlyDelta, 0);
    const month = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, '0')}`;
    points.push({ month, totalMonthlySpend: Math.max(0, total) });
  }

  return points;
}

/** Formats a Date using its local calendar day (not UTC), matching the "YYYY-MM-DD" storage format. */
export function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whole days between today and an ISO date string; negative if the date is in the past. */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Advances an ISO date by one billing cycle, preserving the day-of-month where possible. */
export function nextOccurrence(isoDate: string, cycle: BillingCycle): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (cycle === 'weekly') {
    date.setUTCDate(date.getUTCDate() + 7);
  } else if (cycle === 'monthly') {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  }
  return date.toISOString().slice(0, 10);
}

export function sortByUpcoming(subscriptions: Subscription[]): Subscription[] {
  return [...subscriptions].sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
}

const CSV_HEADERS = [
  'name',
  'amount',
  'currency',
  'cycle',
  'nextBillingDate',
  'category',
  'notes',
  'splitCount',
  'yourShare',
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCSV(subscriptions: Subscription[]): string {
  const rows = subscriptions.map((s) =>
    CSV_HEADERS.map((key) => {
      const raw = key === 'yourShare' ? yourShare(s) : s[key];
      return escapeCsvField(raw === null || raw === undefined ? '' : String(raw));
    }).join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

export const BILLING_CYCLES: BillingCycle[] = ['weekly', 'monthly', 'yearly'];
/** 3-letter currency code, e.g. "USD" — checked for shape only, not against a real ISO 4217 list. */
export const CURRENCY_CODE_RE = /^[A-Za-z]{3}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface SubscriptionDraftFields {
  name: string;
  amount: number;
  currency: string;
  cycle: string;
  nextBillingDate: string;
  splitCount: number;
}

/**
 * Validates the fields shared by manual entry (SubscriptionForm) and CSV import
 * (parseSubscriptionsCSV), so the two stay in sync as a single source of truth.
 * Returns the first error message, or null if the draft is valid.
 */
export function validateSubscriptionDraft(draft: SubscriptionDraftFields): string | null {
  if (!draft.name.trim()) {
    return 'Name is required.';
  }
  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    return 'Amount must be a positive number.';
  }
  if (!CURRENCY_CODE_RE.test(draft.currency)) {
    return 'Currency must be a 3-letter code, e.g. USD.';
  }
  if (!BILLING_CYCLES.includes(draft.cycle as BillingCycle)) {
    return 'Billing cycle must be weekly, monthly, or yearly.';
  }
  if (!ISO_DATE_RE.test(draft.nextBillingDate)) {
    return 'Next billing date must be in YYYY-MM-DD format.';
  }
  if (!Number.isFinite(draft.splitCount) || draft.splitCount < 1) {
    return 'Split with must be 1 or more.';
  }
  return null;
}

/** Splits a single CSV line into fields, honoring double-quoted fields with escaped `""`. Does not support fields with embedded newlines. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export interface ParsedSubscriptionsCSV {
  valid: NewSubscription[];
  errorCount: number;
}

/** Parses a CSV in the shape produced by {@link toCSV}. Rows missing required fields or failing validation are dropped and counted in errorCount. */
export function parseSubscriptionsCSV(csvText: string): ParsedSubscriptionsCSV {
  const lines = csvText.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return { valid: [], errorCount: 0 };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const valid: NewSubscription[] = [];
  let errorCount = 0;

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? '';
    });

    const name = row.name?.trim() ?? '';
    const amount = Number(row.amount);
    const currency = (row.currency?.trim() || 'USD').toUpperCase();
    const cycle = (row.cycle?.trim() ?? '') as BillingCycle;
    const nextBillingDate = row.nextBillingDate?.trim() ?? '';
    const splitCount = row.splitCount?.trim() ? Math.round(Number(row.splitCount)) : 1;

    if (validateSubscriptionDraft({ name, amount, currency, cycle, nextBillingDate, splitCount })) {
      errorCount++;
      continue;
    }

    valid.push({
      name,
      amount,
      currency,
      cycle,
      nextBillingDate,
      category: row.category?.trim() || null,
      notes: row.notes?.trim() || null,
      splitCount,
    });
  }

  return { valid, errorCount };
}

export const FREE_SUBSCRIPTION_LIMIT = 5;

export function canAddSubscription(currentCount: number, isPro: boolean): boolean {
  return isPro || currentCount < FREE_SUBSCRIPTION_LIMIT;
}
