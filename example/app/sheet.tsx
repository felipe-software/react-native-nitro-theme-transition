/**
 * A detented form sheet.
 *
 * The interesting part is the gap: the app is visible above the sheet, so a
 * theme change started from in here animates in BOTH regions at once — the sheet
 * and the screen it is covering are the same snapshot.
 */
import { useRouter } from 'expo-router';

import { CycleButton, ThemeSwatches } from '@/components/ThemeControls';
import { Body, Button, Callout, Card, Divider, Hint, Screen, Title } from '@/components/ui';
import { useSettings, themeStore } from '@/theme/store';

export default function SheetScreen() {
  const router = useRouter();
  const settings = useSettings();

  return (
    <Screen>
      <Title>Form sheet</Title>
      <Body style={{ marginTop: 10 }}>
        Drag the sheet between its detents and switch from each one. The reveal should open under
        your finger every time, and expand across the app behind the sheet — the copy covers the
        whole window, not just this card.
      </Body>

      <Callout title="Why this screen exists">
        A sheet is its own surface: at the half detent it starts ~450dp down the window, so React
        Native reports a press here with a `pageY` that is short by exactly that. JavaScript cannot
        correct it — inside a sheet even `measureInWindow` reports in the sheet’s space — so the
        library adds the presentation’s own offset natively, re-read on every capture. That is what
        makes any detent work without the app knowing anything about detents.
      </Callout>

      <Card title="Switch" icon="color-palette-outline">
        <ThemeSwatches />
        <Divider />
        <CycleButton />
      </Card>

      <Callout title="Slow it down">
        A longer duration makes the two-region effect obvious.
      </Callout>

      <Button
        label={settings.durationMs >= 1500 ? 'Back to 650ms' : 'Use 1800ms'}
        icon="timer-outline"
        variant="secondary"
        style={{ marginTop: 12 }}
        onPress={() =>
          themeStore.setSettings({ durationMs: settings.durationMs >= 1500 ? 650 : 1800 })
        }
      />

      <Hint>Current duration: {settings.durationMs}ms</Hint>

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
