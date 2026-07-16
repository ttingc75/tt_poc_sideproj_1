import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { SubscriptionForm } from '../src/components/SubscriptionForm';
import type { NewSubscription } from '../src/domain/subscription';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const addSubscription = useSubscriptionStore((s) => s.addSubscription);

  async function handleSubmit(value: NewSubscription) {
    const result = await addSubscription(value);
    if (!result.ok) {
      Alert.alert(
        'Free limit reached',
        'You can track up to 5 subscriptions on the free plan. Upgrade to add more.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => router.push('/settings') },
        ]
      );
      return;
    }
    router.back();
  }

  return <SubscriptionForm submitLabel="Add subscription" onSubmit={handleSubmit} />;
}
