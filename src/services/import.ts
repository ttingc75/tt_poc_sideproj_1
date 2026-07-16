import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { parseSubscriptionsCSV, type NewSubscription } from '../domain/subscription';

export type PickCSVResult =
  | { status: 'cancelled' }
  | { status: 'parsed'; valid: NewSubscription[]; errorCount: number };

/** Opens the system file picker for a CSV, reads it, and parses it. Does not write to the database. */
export async function pickAndParseSubscriptionsCSV(): Promise<PickCSVResult> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets[0]) {
    return { status: 'cancelled' };
  }

  const file = new File(result.assets[0].uri);
  const csvText = await file.text();
  const { valid, errorCount } = parseSubscriptionsCSV(csvText);
  return { status: 'parsed', valid, errorCount };
}
