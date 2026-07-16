import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { SubscriptionForm } from '../../src/components/SubscriptionForm';
import type { NewSubscription } from '../../src/domain/subscription';
import { useSubscriptionStore } from '../../src/store/subscriptionStore';

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const subscriptionId = Number(id);

  const subscription = useSubscriptionStore((s) =>
    s.subscriptions.find((sub) => sub.id === subscriptionId)
  );
  const editSubscription = useSubscriptionStore((s) => s.editSubscription);
  const removeSubscription = useSubscriptionStore((s) => s.removeSubscription);

  if (!subscription) {
    return (
      <View style={styles.notFound}>
        <Text>Subscription not found.</Text>
      </View>
    );
  }

  async function handleSubmit(value: NewSubscription) {
    await editSubscription(subscriptionId, value);
    router.back();
  }

  function handleDelete() {
    Alert.alert('Delete subscription', `Remove ${subscription!.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeSubscription(subscriptionId);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <SubscriptionForm
        submitLabel="Save changes"
        initialValue={subscription}
        onSubmit={handleSubmit}
      />
      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete subscription</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '600',
  },
});
