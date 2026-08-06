/**
 * Case: the drawer.
 *
 * A drawer is drawn by React Native inside the app's root view, so it is part of
 * the capture — unlike a modal, which is its own window. Switching with the
 * drawer open snapshots the drawer, the dimmed backdrop and the screen behind it
 * as one image.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import { Body, Button, Callout, Card, Code, Hint, Row, Screen, SectionTitle } from '@/components/ui';
import { themeStore, useSettings } from '@/theme/store';
import { cycleTheme } from '@/theme/transition';

export default function DrawerCase() {
  const navigation = useNavigation();
  const settings = useSettings();
  const [note, setNote] = useState('—');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  function openDrawer() {
    navigation.dispatch(DrawerActions.openDrawer());
  }

  /** Opens the drawer, waits for it to settle, then switches. */
  function openThenSwitch() {
    openDrawer();
    setNote('Drawer opening…');

    timers.current.push(
      setTimeout(() => {
        cycleTheme();
        setNote('Switched with the drawer open — the whole screen was one snapshot.');
      }, 500),
    );
  }

  /** Starts a long transition, then slides the drawer in while it is still running. */
  function switchThenOpen() {
    themeStore.setSettings({ durationMs: 1800 });
    cycleTheme();
    setNote('Long transition started…');

    timers.current.push(
      setTimeout(() => {
        openDrawer();
        setNote('Drawer opened mid-transition — it slides in UNDER the snapshot.');
      }, 250),
    );
  }

  return (
    <Screen>
      <CaseIntro
        slug="drawer"
        expect="With the drawer open, the reveal crosses the drawer and the backdrop together. Opening it mid-transition slides it in underneath the snapshot, so it appears as the copy peels away."
      />

      <SectionTitle>Try it</SectionTitle>
      <Row gap={10} wrap style={{ marginTop: 12 }}>
        <Button label="Open drawer" icon="menu-outline" style={{ flexGrow: 1 }} onPress={openDrawer} />
        <Button
          label="Open, then switch"
          icon="color-wand-outline"
          variant="secondary"
          style={{ flexGrow: 1 }}
          onPress={openThenSwitch}
        />
      </Row>

      <Button
        label="Switch (1800ms), then open the drawer"
        icon="layers-outline"
        variant="ghost"
        style={{ marginTop: 10 }}
        onPress={switchThenOpen}
      />

      <Hint>{note}</Hint>
      <Hint>Duration is currently {settings.durationMs}ms.</Hint>

      <Card
        title="Switch from inside the drawer"
        subtitle="The drawer content has its own swatches and a Next palette button."
        icon="menu-outline"
      >
        <Body>
          Open the drawer and use the controls at the bottom. The reveal starts from the swatch you
          touched, inside a panel that is itself being revealed.
        </Body>
      </Card>

      <Callout title="Two animators, no contention">
        The drawer is animated by Reanimated on the UI thread; the transition is animated by the OS
        compositor. Neither runs in JavaScript, so they cannot starve each other — which is exactly
        why the drawer keeps gliding while a 1800ms reveal plays over it.
      </Callout>

      <SectionTitle>What is captured</SectionTitle>
      <Code>{`app root view              ← captured
  ├─ drawer backdrop       ← captured
  ├─ drawer panel          ← captured
  └─ tabs / stack / screen ← captured

presented modal / sheet    ← captured on iOS (same window),
                             NOT on Android (its own Dialog)
OS status bar              ← NOT captured (drawn by the system)`}</Code>

      <QuickSwitch />
      <NextCase slug="drawer" />
    </Screen>
  );
}
