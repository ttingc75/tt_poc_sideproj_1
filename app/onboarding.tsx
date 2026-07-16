import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FREE_SUBSCRIPTION_LIMIT } from '../src/domain/subscription';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const completeOnboarding = useSubscriptionStore((s) => s.completeOnboarding);

  async function handleGetStarted() {
    await completeOnboarding();
    router.replace('/');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SubRadar</Text>
      <Text style={styles.subtitle}>Track every subscription and never get surprised by a renewal again.</Text>

      <View style={styles.pointRow}>
        <Text style={styles.pointIcon}>🔒</Text>
        <View style={styles.pointText}>
          <Text style={styles.pointTitle}>Everything stays on your phone</Text>
          <Text style={styles.pointBody}>
            No account, no server. Your subscription data is never uploaded anywhere.
          </Text>
        </View>
      </View>

      <View style={styles.pointRow}>
        <Text style={styles.pointIcon}>🔔</Text>
        <View style={styles.pointText}>
          <Text style={styles.pointTitle}>Renewal reminders</Text>
          <Text style={styles.pointBody}>
            Get a local notification a couple of days before each subscription renews.
          </Text>
        </View>
      </View>

      <View style={styles.pointRow}>
        <Text style={styles.pointIcon}>✨</Text>
        <View style={styles.pointText}>
          <Text style={styles.pointTitle}>Free to start</Text>
          <Text style={styles.pointBody}>
            Track up to {FREE_SUBSCRIPTION_LIMIT} subscriptions for free. Upgrade any time for
            unlimited tracking, CSV import/export, and spending stats.
          </Text>
        </View>
      </View>

      <Pressable style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 72,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 32,
  },
  pointRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  pointIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  pointText: {
    flex: 1,
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  pointBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
