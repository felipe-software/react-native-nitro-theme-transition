import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { DrawerMenuButton, useStackOptions } from '@/components/nav';
import { useTheme } from '@/theme/store';

export default function HomeStackLayout() {
  const theme = useTheme();
  const options = useStackOptions();

  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Playground',
          headerLargeTitle: true,
          headerLeft: () => <DrawerMenuButton />,
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable accessibilityLabel="Open the router modal" hitSlop={10}>
                <Ionicons name="albums-outline" size={21} color={theme.tint} />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}
