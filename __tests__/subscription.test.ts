import {
  canAddSubscription,
  daysUntil,
  FREE_SUBSCRIPTION_LIMIT,
  monthlyEquivalent,
  nextOccurrence,
  sortByUpcoming,
  spendByCategory,
  toCSV,
  totalMonthlySpend,
  totalYearlySpend,
  yearlyEquivalent,
  yourShare,
  type Subscription,
} from '../src/domain/subscription';

function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 1,
    name: 'Netflix',
    amount: 15,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-08-01',
    category: null,
    notes: null,
    splitCount: 1,
    createdAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('cycle cost conversion', () => {
  test('monthlyEquivalent passes monthly amounts through unchanged', () => {
    expect(monthlyEquivalent(10, 'monthly')).toBeCloseTo(10, 5);
  });

  test('monthlyEquivalent converts a yearly amount down to a monthly figure', () => {
    expect(monthlyEquivalent(120, 'yearly')).toBeCloseTo(10, 1);
  });

  test('monthlyEquivalent converts a weekly amount up to a monthly figure', () => {
    expect(monthlyEquivalent(5, 'weekly')).toBeCloseTo(21.74, 1);
  });

  test('yearlyEquivalent converts a monthly amount up to a yearly figure', () => {
    expect(yearlyEquivalent(10, 'monthly')).toBeCloseTo(120, 0);
  });
});

describe('totals', () => {
  test('sums mixed billing cycles into a single monthly total', () => {
    const subs = [
      makeSubscription({ id: 1, amount: 10, cycle: 'monthly' }),
      makeSubscription({ id: 2, amount: 120, cycle: 'yearly' }),
    ];
    expect(totalMonthlySpend(subs)).toBeCloseTo(20, 0);
  });

  test('sums mixed billing cycles into a single yearly total', () => {
    const subs = [
      makeSubscription({ id: 1, amount: 10, cycle: 'monthly' }),
      makeSubscription({ id: 2, amount: 120, cycle: 'yearly' }),
    ];
    expect(totalYearlySpend(subs)).toBeCloseTo(240, 0);
  });

  test('empty list totals to zero', () => {
    expect(totalMonthlySpend([])).toBe(0);
    expect(totalYearlySpend([])).toBe(0);
  });

  test('only counts the user share of split subscriptions', () => {
    const subs = [makeSubscription({ amount: 20, cycle: 'monthly', splitCount: 4 })];
    expect(totalMonthlySpend(subs)).toBeCloseTo(5, 5);
  });
});

describe('spendByCategory', () => {
  test('groups and sums monthly-equivalent spend per category, descending', () => {
    const subs = [
      makeSubscription({ id: 1, category: 'Entertainment', amount: 10, cycle: 'monthly' }),
      makeSubscription({ id: 2, category: 'Entertainment', amount: 5, cycle: 'monthly' }),
      makeSubscription({ id: 3, category: 'Productivity', amount: 120, cycle: 'yearly' }),
    ];
    const result = spendByCategory(subs);
    expect(result[0]).toMatchObject({ category: 'Entertainment', monthlyTotal: 15 });
    expect(result[1].category).toBe('Productivity');
    expect(result[1].monthlyTotal).toBeCloseTo(10, 0);
  });

  test('groups null or blank categories under Uncategorized', () => {
    const subs = [
      makeSubscription({ id: 1, category: null }),
      makeSubscription({ id: 2, category: '  ' }),
    ];
    const result = spendByCategory(subs);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('Uncategorized');
  });

  test('accounts for split subscriptions using the user share', () => {
    const subs = [makeSubscription({ category: 'Streaming', amount: 20, splitCount: 4 })];
    expect(spendByCategory(subs)[0].monthlyTotal).toBeCloseTo(5, 5);
  });

  test('returns an empty array for no subscriptions', () => {
    expect(spendByCategory([])).toEqual([]);
  });
});

describe('yourShare', () => {
  test('returns the full amount when not split', () => {
    expect(yourShare({ amount: 15, splitCount: 1 })).toBe(15);
  });

  test('divides the amount evenly across the split count', () => {
    expect(yourShare({ amount: 20, splitCount: 4 })).toBe(5);
  });

  test('treats a split count below 1 as 1', () => {
    expect(yourShare({ amount: 15, splitCount: 0 })).toBe(15);
  });
});

describe('daysUntil', () => {
  const now = new Date('2026-07-16T12:00:00');

  test('returns a positive count for a future date', () => {
    expect(daysUntil('2026-07-20', now)).toBe(4);
  });

  test('returns zero for today', () => {
    expect(daysUntil('2026-07-16', now)).toBe(0);
  });

  test('returns a negative count for a past date', () => {
    expect(daysUntil('2026-07-10', now)).toBe(-6);
  });
});

describe('nextOccurrence', () => {
  test('advances a weekly cycle by 7 days', () => {
    expect(nextOccurrence('2026-07-01', 'weekly')).toBe('2026-07-08');
  });

  test('advances a monthly cycle by 1 month', () => {
    expect(nextOccurrence('2026-07-01', 'monthly')).toBe('2026-08-01');
  });

  test('advances a yearly cycle by 1 year', () => {
    expect(nextOccurrence('2026-07-01', 'yearly')).toBe('2027-07-01');
  });
});

describe('sortByUpcoming', () => {
  test('orders subscriptions by nearest billing date first', () => {
    const subs = [
      makeSubscription({ id: 1, nextBillingDate: '2026-09-01' }),
      makeSubscription({ id: 2, nextBillingDate: '2026-07-20' }),
      makeSubscription({ id: 3, nextBillingDate: '2026-08-01' }),
    ];
    expect(sortByUpcoming(subs).map((s) => s.id)).toEqual([2, 3, 1]);
  });

  test('does not mutate the input array', () => {
    const subs = [makeSubscription({ id: 1 }), makeSubscription({ id: 2 })];
    const original = [...subs];
    sortByUpcoming(subs);
    expect(subs).toEqual(original);
  });
});

describe('toCSV', () => {
  test('produces a header row plus one row per subscription', () => {
    const csv = toCSV([makeSubscription()]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'name,amount,currency,cycle,nextBillingDate,category,notes,splitCount,yourShare'
    );
    expect(lines[1]).toBe('Netflix,15,USD,monthly,2026-08-01,,,1,15');
  });

  test('quotes fields containing commas', () => {
    const csv = toCSV([makeSubscription({ notes: 'shared, split with roommate' })]);
    expect(csv).toContain('"shared, split with roommate"');
  });

  test('includes the computed per-person share for split subscriptions', () => {
    const csv = toCSV([makeSubscription({ amount: 20, splitCount: 4 })]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe('Netflix,20,USD,monthly,2026-08-01,,,4,5');
  });
});

describe('canAddSubscription', () => {
  test('blocks free users at the limit', () => {
    expect(canAddSubscription(FREE_SUBSCRIPTION_LIMIT, false)).toBe(false);
    expect(canAddSubscription(FREE_SUBSCRIPTION_LIMIT - 1, false)).toBe(true);
  });

  test('never blocks pro users', () => {
    expect(canAddSubscription(999, true)).toBe(true);
  });
});
