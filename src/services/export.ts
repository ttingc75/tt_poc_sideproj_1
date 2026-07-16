import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { toCSV, type Subscription } from '../domain/subscription';

export async function exportSubscriptionsToCSV(subscriptions: Subscription[]): Promise<void> {
  const csv = toCSV(subscriptions);
  const file = new File(Paths.cache, `subradar-export-${Date.now()}.csv`);
  file.create();
  file.write(csv);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
  }
}
