import * as SQLite from 'expo-sqlite';

import { monthlyEquivalent, yourShare, type NewSubscription, type Subscription, type SpendEvent } from '../domain/subscription';

const DB_NAME = 'subradar.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS subscriptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT NOT NULL,
          cycle TEXT NOT NULL,
          nextBillingDate TEXT NOT NULL,
          category TEXT,
          notes TEXT,
          splitCount INTEGER NOT NULL DEFAULT 1,
          createdAt TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS spend_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subscriptionName TEXT NOT NULL,
          monthlyDelta REAL NOT NULL,
          occurredAt TEXT NOT NULL
        );
      `);
      try {
        await db.execAsync('ALTER TABLE subscriptions ADD COLUMN splitCount INTEGER NOT NULL DEFAULT 1');
      } catch {
        // column already exists
      }
      await backfillSpendEventsIfEmpty(db);
      return db;
    });
  }
  return dbPromise;
}

/** One-time seed: if spend_events is empty but subscriptions already exist (e.g. from before this
 * table existed), record one synthetic "added" event per subscription so the trend chart isn't
 * empty for existing users. No-ops on every call after the first, since events accumulate from then on. */
async function backfillSpendEventsIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const eventCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM spend_events'
  );
  if ((eventCount?.count ?? 0) > 0) {
    return;
  }
  const subscriptions = await db.getAllAsync<Subscription>('SELECT * FROM subscriptions');
  for (const s of subscriptions) {
    await db.runAsync(
      'INSERT INTO spend_events (subscriptionName, monthlyDelta, occurredAt) VALUES (?, ?, ?)',
      s.name,
      monthlyEquivalent(yourShare(s), s.cycle),
      s.createdAt
    );
  }
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const db = await getDb();
  return db.getAllAsync<Subscription>('SELECT * FROM subscriptions ORDER BY nextBillingDate ASC');
}

export async function getSubscription(id: number): Promise<Subscription | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Subscription>(
    'SELECT * FROM subscriptions WHERE id = ?',
    id
  );
  return row ?? null;
}

export async function insertSubscription(input: NewSubscription): Promise<number> {
  const db = await getDb();
  const createdAt = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO subscriptions (name, amount, currency, cycle, nextBillingDate, category, notes, splitCount, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.name,
    input.amount,
    input.currency,
    input.cycle,
    input.nextBillingDate,
    input.category,
    input.notes,
    input.splitCount,
    createdAt
  );
  return result.lastInsertRowId;
}

export async function updateSubscription(id: number, input: NewSubscription): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE subscriptions
     SET name = ?, amount = ?, currency = ?, cycle = ?, nextBillingDate = ?, category = ?, notes = ?, splitCount = ?
     WHERE id = ?`,
    input.name,
    input.amount,
    input.currency,
    input.cycle,
    input.nextBillingDate,
    input.category,
    input.notes,
    input.splitCount,
    id
  );
}

export async function deleteSubscription(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM subscriptions WHERE id = ?', id);
}

export async function insertSpendEvent(subscriptionName: string, monthlyDelta: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO spend_events (subscriptionName, monthlyDelta, occurredAt) VALUES (?, ?, ?)',
    subscriptionName,
    monthlyDelta,
    new Date().toISOString()
  );
}

export async function listSpendEvents(): Promise<SpendEvent[]> {
  const db = await getDb();
  return db.getAllAsync<SpendEvent>('SELECT * FROM spend_events ORDER BY occurredAt ASC');
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    key
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value
  );
}
