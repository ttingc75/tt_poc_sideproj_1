import * as SQLite from 'expo-sqlite';

import type { NewSubscription, Subscription } from '../domain/subscription';

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
      `);
      try {
        await db.execAsync('ALTER TABLE subscriptions ADD COLUMN splitCount INTEGER NOT NULL DEFAULT 1');
      } catch {
        // column already exists
      }
      return db;
    });
  }
  return dbPromise;
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
