import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { exportSubscriptionsToCSV } from '../src/services/export';
import { purchasePro, restorePurchases } from '../src/services/iap';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

export default function SettingsScreen() {
  const isPro = useSubscriptionStore((s) => s.isPro);
  const setPro = useSubscriptionStore((s) => s.setPro);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);

  async function handleUpgrade() {
    try {
      await purchasePro();
    } catch (error) {
      Alert.alert('Purchase unavailable', 'In-app purchase is not available in this build yet.');
      console.warn(error);
    }
  }

  async function handleRestore() {
    try {
      const restored = await restorePurchases();
      if (restored) {
        await setPro(true);
        Alert.alert('Restored', 'Pro unlock restored.');
      } else {
        Alert.alert('Nothing to restore', 'No previous purchase was found.');
      }
    } catch (error) {
      Alert.alert('Restore unavailable', 'In-app purchase is not available in this build yet.');
      console.warn(error);
    }
  }

  async function handleExport() {
    if (!isPro) {
      Alert.alert('Pro feature', 'CSV export is part of the paid unlock.');
      return;
    }
    await exportSubscriptionsToCSV(subscriptions);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.status}>{isPro ? 'Pro unlocked' : 'Free plan'}</Text>
        <Text style={styles.statusDetail}>
          {isPro
            ? 'Unlimited subscriptions, CSV export, and stats are unlocked.'
            : 'Up to 5 subscriptions. Upgrade for unlimited tracking, CSV export, and stats.'}
        </Text>
      </View>

      {!isPro && (
        <Pressable style={styles.primaryButton} onPress={handleUpgrade}>
          <Text style={styles.primaryButtonText}>Unlock Pro</Text>
        </Pressable>
      )}

      <Pressable style={styles.secondaryButton} onPress={handleRestore}>
        <Text style={styles.secondaryButtonText}>Restore purchases</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={handleExport}>
        <Text style={styles.secondaryButtonText}>Export CSV</Text>
      </Pressable>

      {__DEV__ && (
        <Pressable
          style={styles.devButton}
          onPress={() => setPro(!isPro)}
        >
          <Text style={styles.devButtonText}>
            [Dev only] {isPro ? 'Lock' : 'Unlock'} pro for testing
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  status: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  statusDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  devButton: {
    marginTop: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  devButtonText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
});
