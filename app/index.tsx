import { Link, Redirect, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { SubscriptionCard } from '../src/components/SubscriptionCard';
import { SummaryHeader } from '../src/components/SummaryHeader';
import { totalMonthlySpend, totalYearlySpend } from '../src/domain/subscription';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

export default function Dashboard() {
  const router = useRouter();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const isLoaded = useSubscriptionStore((s) => s.isLoaded);
  const isPro = useSubscriptionStore((s) => s.isPro);
  const hasOnboarded = useSubscriptionStore((s) => s.hasOnboarded);

  const monthlyTotal = totalMonthlySpend(subscriptions);
  const yearlyTotal = totalYearlySpend(subscriptions);

  if (isLoaded && !hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Your subscriptions</Text>
        <Link href="/settings" asChild>
          <Pressable>
            <Text style={styles.settingsLink}>Settings</Text>
          </Pressable>
        </Link>
      </View>

      <SummaryHeader monthlyTotal={monthlyTotal} yearlyTotal={yearlyTotal} />

      {isLoaded && subscriptions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No subscriptions yet. Add your first one below.</Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <SubscriptionCard
              subscription={item}
              onPress={() => router.push(`/subscription/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable style={styles.addButton} onPress={() => router.push('/add-subscription')}>
        <Text style={styles.addButtonText}>
          + Add subscription{!isPro ? ` (${subscriptions.length}/5 free)` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  settingsLink: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
  },
  list: {
    paddingBottom: 96,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
