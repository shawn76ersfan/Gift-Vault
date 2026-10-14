import { Tabs } from 'expo-router/js-tabs';

import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { usePushRegistration } from '@/lib/usePushRegistration';

export default function TabsLayout() {
  usePushRegistration();

  return (
    <Tabs tabBar={(props) => <AnimatedTabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift' }}>
      <Tabs.Screen name="index" options={{ title: 'Vault' }} />
      <Tabs.Screen name="people" options={{ title: 'People' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
