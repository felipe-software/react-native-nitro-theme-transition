import { Stack } from 'expo-router';

import { DrawerMenuButton, useStackOptions } from '@/components/nav';

export default function GalleryStackLayout() {
  const options = useStackOptions();

  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Gallery',
          headerLargeTitle: true,
          headerLeft: () => <DrawerMenuButton />,
        }}
      />
    </Stack>
  );
}
