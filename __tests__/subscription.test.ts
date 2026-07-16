import {
  buildMonthlySpendTrend,
  canAddSubscription,
  daysUntil,
  FREE_SUBSCRIPTION_LIMIT,
  monthlyEquivalent,
  nextOccurrence,
  parseSubscriptionsCSV,
  sortByUpcoming,
  spendByCategory,
  toCSV,
  toISODateString,
  topSpendingSubscriptions,
  totalMonthlySpend,
  totalYearlySpend,
  validateSubscriptionDraft,
  yearlyEquivalent,
  yourShare,
  type SpendEvent,
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

  test('computes each category\'s share of total spend and how many subscriptions it has', () => {
    const subs = [
      makeSubscription({ id: 1, category: 'Entertainment', amount: 15, cycle: 'monthly' }),
      makeSubscription({ id: 2, category: 'Entertainment', amount: 15, cycle: 'monthly' }),
      makeSubscription({ id: 3, category: 'Productivity', amount: 10, cycle: 'monthly' }),
    ];
    const result = spendByCategory(subs);
    expect(result[0]).toMatchObject({ category: 'Entertainment', subscriptionCount: 2 });
    expect(result[0].percentage).toBeCloseTo(75, 0);
    expect(result[1]).toMatchObject({ category: 'Productivity', subscriptionCount: 1 });
    expect(result[1].percentage).toBeCloseTo(25, 0);
  });
});

describe('topSpendingSubscriptions', () => {
  test('ranks subscriptions by monthly-equivalent spend, descending', () => {
    // Monthly-equivalent: Cheap ≈ 5/mo, Mid = 20/mo, Expensive (120/yr) ≈ 10/mo.
    const subs = [
      makeSubscription({ id: 1, name: 'Cheap', amount: 5, cycle: 'monthly' }),
      makeSubscription({ id: 2, name: 'Expensive', amount: 120, cycle: 'yearly' }),
      makeSubscription({ id: 3, name: 'Mid', amount: 20, cycle: 'monthly' }),
    ];
    const result = topSpendingSubscriptions(subs, 2);
    expect(result).toHaveLength(2);
    expect(result[0].subscription.name).toBe('Mid');
    expect(result[1].subscription.name).toBe('Expensive');
  });

  test('uses the user share for split subscriptions', () => {
    const subs = [makeSubscription({ amount: 40, cycle: 'monthly', splitCount: 4 })];
    expect(topSpendingSubscriptions(subs, 1)[0].monthlySpend).toBeCloseTo(10, 5);
  });

  test('returns an empty array for no subscriptions', () => {
    expect(topSpendingSubscriptions([], 5)).toEqual([]);
  });
});

describe('buildMonthlySpendTrend', () => {
  function makeEvent(overrides: Partial<SpendEvent> = {}): SpendEvent {
    return { id: 1, subscriptionName: 'Netflix', monthlyDelta: 10, occurredAt: '2026-05-01T00:00:00.000Z', ...overrides };
  }

  const now = new Date('2026-07-16T12:00:00');

  test('produces one point per requested month, oldest first', () => {
    const points = buildMonthlySpendTrend([], 3, now);
    expect(points.map((p) => p.month)).toEqual(['2026-05', '2026-06', '2026-07']);
  });

  test('accumulates deltas that occurred on or before the end of each month', () => {
    const events = [
      makeEvent({ id: 1, monthlyDelta: 10, occurredAt: '2026-05-10T00:00:00.000Z' }),
      makeEvent({ id: 2, monthlyDelta: 5, occurredAt: '2026-06-20T00:00:00.000Z' }),
    ];
    const points = buildMonthlySpendTrend(events, 3, now);
    expect(points.find((p) => p.month === '2026-05')?.totalMonthlySpend).toBe(10);
    expect(points.find((p) => p.month === '2026-06')?.totalMonthlySpend).toBe(15);
    expect(points.find((p) => p.month === '2026-07')?.totalMonthlySpend).toBe(15);
  });

  test('reflects a removal as a negative delta reducing the running total', () => {
    const events = [
      makeEvent({ id: 1, monthlyDelta: 10, occurredAt: '2026-05-01T00:00:00.000Z' }),
      makeEvent({ id: 2, monthlyDelta: -10, occurredAt: '2026-06-01T00:00:00.000Z' }),
    ];
    const points = buildMonthlySpendTrend(events, 3, now);
    expect(points.find((p) => p.month === '2026-07')?.totalMonthlySpend).toBe(0);
  });

  test('never returns a negative total even if events would sum below zero', () => {
    const events = [makeEvent({ monthlyDelta: -10, occurredAt: '2026-05-01T00:00:00.000Z' })];
    const points = buildMonthlySpendTrend(events, 1, now);
    expect(points[0].totalMonthlySpend).toBe(0);
  });

  test('ignores events that occur after the requested window', () => {
    const events = [makeEvent({ monthlyDelta: 10, occurredAt: '2026-08-01T00:00:00.000Z' })];
    const points = buildMonthlySpendTrend(events, 1, now);
    expect(points[0].totalMonthlySpend).toBe(0);
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

describe('toISODateString', () => {
  test('formats using local calendar fields, not UTC', () => {
    // Regression guard: a naive toISOString().slice(0,10) call would shift this
    // to the previous day in any timezone ahead of UTC.
    expect(toISODateString(new Date(2026, 6, 16))).toBe('2026-07-16');
  });

  test('pads single-digit months and days', () => {
    expect(toISODateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('validateSubscriptionDraft', () => {
  const validDraft = {
    name: 'Netflix',
    amount: 15,
    currency: 'USD',
    cycle: 'monthly',
    nextBillingDate: '2026-08-01',
    splitCount: 1,
  };

  test('returns null for a valid draft', () => {
    expect(validateSubscriptionDraft(validDraft)).toBeNull();
  });

  test('rejects a blank name', () => {
    expect(validateSubscriptionDraft({ ...validDraft, name: '  ' })).toMatch(/name/i);
  });

  test('rejects a non-positive amount', () => {
    expect(validateSubscriptionDraft({ ...validDraft, amount: 0 })).toMatch(/amount/i);
  });

  test('rejects a malformed currency code', () => {
    expect(validateSubscriptionDraft({ ...validDraft, currency: 'US' })).toMatch(/currency/i);
  });

  test('rejects a cycle outside weekly/monthly/yearly', () => {
    expect(validateSubscriptionDraft({ ...validDraft, cycle: 'daily' })).toMatch(/cycle/i);
  });

  test('rejects a non-ISO date', () => {
    expect(validateSubscriptionDraft({ ...validDraft, nextBillingDate: '08/01/2026' })).toMatch(
      /date/i
    );
  });

  test('rejects a split count below 1', () => {
    expect(validateSubscriptionDraft({ ...validDraft, splitCount: 0 })).toMatch(/split/i);
  });
});

describe('parseSubscriptionsCSV', () => {
  test('round-trips output from toCSV', () => {
    const original = [
      makeSubscription({ id: 1, name: 'Netflix', category: 'Entertainment' }),
      makeSubscription({ id: 2, name: 'Spotify', amount: 20, splitCount: 2, notes: null }),
    ];
    const { valid, errorCount } = parseSubscriptionsCSV(toCSV(original));
    expect(errorCount).toBe(0);
    expect(valid).toHaveLength(2);
    expect(valid[0]).toMatchObject({ name: 'Netflix', category: 'Entertainment' });
    expect(valid[1]).toMatchObject({ name: 'Spotify', amount: 20, splitCount: 2 });
  });

  test('parses a quoted field containing a comma', () => {
    const csv =
      'name,amount,currency,cycle,nextBillingDate,category,notes,splitCount,yourShare\n' +
      'Family Plan,20,USD,monthly,2026-08-01,,"shared, split with roommate",2,10';
    const { valid, errorCount } = parseSubscriptionsCSV(csv);
    expect(errorCount).toBe(0);
    expect(valid[0].notes).toBe('shared, split with roommate');
  });

  test('drops rows missing required fields and counts them as errors', () => {
    const csv =
      'name,amount,currency,cycle,nextBillingDate,category,notes,splitCount,yourShare\n' +
      ',10,USD,monthly,2026-08-01,,,1,10\n' +
      'Bad Amount,not-a-number,USD,monthly,2026-08-01,,,1,10\n' +
      'Bad Cycle,10,USD,daily,2026-08-01,,,1,10\n' +
      'Bad Date,10,USD,monthly,08/01/2026,,,1,10\n' +
      'Bad Currency,10,USDT,monthly,2026-08-01,,,1,10';
    const { valid, errorCount } = parseSubscriptionsCSV(csv);
    expect(valid).toHaveLength(0);
    expect(errorCount).toBe(5);
  });

  test('defaults splitCount to 1 when the column is missing', () => {
    const csv =
      'name,amount,currency,cycle,nextBillingDate\nNetflix,15,USD,monthly,2026-08-01';
    const { valid } = parseSubscriptionsCSV(csv);
    expect(valid[0].splitCount).toBe(1);
  });

  test('returns nothing for an empty or header-only CSV', () => {
    expect(parseSubscriptionsCSV('')).toEqual({ valid: [], errorCount: 0 });
    expect(parseSubscriptionsCSV('name,amount,currency,cycle,nextBillingDate')).toEqual({
      valid: [],
      errorCount: 0,
    });
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
