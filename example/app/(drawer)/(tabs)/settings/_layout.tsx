import { Stack } from 'expo-router';

import { DrawerMenuButton, useStackOptions } from '@/components/nav';

export default function SettingsStackLayout() {
  const options = useStackOptions();

  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerLargeTitle: true,
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
    </Stack>
  );
}
