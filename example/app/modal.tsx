/**
 * A router modal — a native presentation on the ROOT stack.
 *
 * On iOS this is a presented `UIViewController`, on Android a fragment; either
 * way it lives inside the app's own window, so the capture includes it and the
 * transition plays over the modal exactly like it does over a tab screen.
 */
import { useRouter } from 'expo-router';

import { CycleButton, ThemeSwatches, ThemeSwitch } from '@/components/ThemeControls';
import { Body, Button, Callout, Card, Divider, Screen, SectionTitle, Title } from '@/components/ui';

export default function RouterModal() {
  const router = useRouter();

  return (
    <Screen>
      <Title>Router modal</Title>
      <Body style={{ marginTop: 10 }}>
        Switch from here. The whole modal is inside the snapshot, so the reveal covers it, the
        screen behind it, the tab bar and the status area of the app alike.
      </Body>

      <Card title="Switch" icon="color-palette-outline">
        <ThemeSwatches />
        <Divider />
        <ThemeSwitch />
        <Divider />
        <CycleButton />
      </Card>

      <Callout tone="good" title="Compare">
        Do the same thing inside a React Native `Modal` on the Modals case screen — there, the
        colours snap, because that window is not part of the capture.
      </Callout>

      <SectionTitle>Presentation</SectionTitle>
      <Body>
        Declared once on the root stack, which is why it presents above the tabs and the drawer
        rather than inside them.
      </Body>

      <Button
        label="Close"
        icon="close-outline"
        variant="ghost"
        style={{ marginTop: 20 }}
        onPress={() => router.back()}
      />
    </Screen>
  );
}
