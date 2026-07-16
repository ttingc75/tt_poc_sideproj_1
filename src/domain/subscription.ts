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
}

/** Groups subscriptions by category and sums their monthly-equivalent cost (your share), descending. */
export function spendByCategory(subscriptions: Subscription[]): CategorySpend[] {
  const totals = new Map<string, number>();
  for (const s of subscriptions) {
    const category = s.category?.trim() || UNCATEGORIZED;
    const monthly = monthlyEquivalent(yourShare(s), s.cycle);
    totals.set(category, (totals.get(category) ?? 0) + monthly);
  }
  return [...totals.entries()]
    .map(([category, monthlyTotal]) => ({ category, monthlyTotal }))
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
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

export const FREE_SUBSCRIPTION_LIMIT = 5;

export function canAddSubscription(currentCount: number, isPro: boolean): boolean {
  return isPro || currentCount < FREE_SUBSCRIPTION_LIMIT;
}
