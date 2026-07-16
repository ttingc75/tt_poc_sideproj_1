import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initIAP } from '../src/services/iap';
import { requestNotificationPermission } from '../src/services/notifications';
import { useSubscriptionStore } from '../src/store/subscriptionStore';

export default function RootLayout() {
  const load = useSubscriptionStore((s) => s.load);
  const setPro = useSubscriptionStore((s) => s.setPro);

  useEffect(() => {
    load();
    requestNotificationPermission();
    initIAP(() => setPro(true));
  }, [load, setPro]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerTitleAlign: 'center' }}>
        <Stack.Screen name="index" options={{ title: 'SubRadar' }} />
        <Stack.Screen
          name="add-subscription"
          options={{ title: 'Add Subscription', presentation: 'modal' }}
        />
        <Stack.Screen name="subscription/[id]" options={{ title: 'Subscription' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="stats" options={{ title: 'Spending Stats' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
