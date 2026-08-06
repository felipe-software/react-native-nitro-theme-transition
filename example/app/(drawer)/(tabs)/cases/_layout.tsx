import { Stack } from 'expo-router';

import { CASES } from '@/cases';
import { DrawerMenuButton, useStackOptions } from '@/components/nav';

export default function CasesStackLayout() {
  const options = useStackOptions();

  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Cases',
          headerLargeTitle: true,
          headerLeft: () => <DrawerMenuButton />,
        }}
      />

      {/* One native screen per case, titled from the registry. */}
      {CASES.map(entry => (
        <Stack.Screen key={entry.slug} name={entry.slug} options={{ title: entry.title }} />
      ))}
    </Stack>
  );
}
