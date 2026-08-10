/**
 * Case: navigating while a snapshot is on screen.
 *
 * The overlay does not block touches and does not pause the app underneath, so
 * navigation keeps working normally. What you see is the new screen appearing
 * from beneath a copy of the old one — which is usually fine, and occasionally
 * surprising, so it is worth watching once deliberately.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Hint,
  Row,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { themeStore, useSettings } from '@/theme/store';
import { cycleTheme } from '@/theme/transition';

export default function NavigationCase() {
  const router = useRouter();
  const settings = useSettings();
  const [note, setNote] = useState('—');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  function longSwitch() {
    themeStore.setSettings({ durationMs: 1800 });
    cycleTheme();
  }

  function switchThenPush() {
    longSwitch();
    setNote('Pushing a screen 200ms into a 1800ms transition…');
    timers.current.push(setTimeout(() => router.push('/cases/lists'), 200));
  }

  function switchThenTab() {
    longSwitch();
    setNote('Switching tabs mid-transition…');
    timers.current.push(setTimeout(() => router.push('/gallery'), 200));
  }

  function switchThenModal() {
    longSwitch();
    setNote('Presenting a modal mid-transition…');
    timers.current.push(setTimeout(() => router.push('/modal'), 200));
  }

  return (
    <Screen>
      <CaseIntro
        slug="navigation"
        expect="Navigation is never blocked. The destination screen mounts underneath the snapshot and is uncovered by the reveal, already in the new theme."
      />

      <SectionTitle>Start a transition, then navigate</SectionTitle>
      <Card subtitle="Each of these raises the duration to 1800ms so there is time to see it.">
        <Button label="Switch → push a screen" icon="git-branch-outline" onPress={switchThenPush} />
        <Button
          label="Switch → change tab"
          icon="swap-horizontal-outline"
          variant="secondary"
          onPress={switchThenTab}
        />
        <Button
          label="Switch → present a modal"
          icon="albums-outline"
          variant="ghost"
          onPress={switchThenModal}
        />
        <Hint>{note}</Hint>
      </Card>

      <SectionTitle>The other order</SectionTitle>
      <Card subtitle="Navigate first, then switch a beat later — the snapshot contains the NEW screen.">
        <Row gap={10}>
          <Button
            label="Push, then switch"
            icon="arrow-forward-outline"
            style={{ flex: 1 }}
            onPress={() => {
              router.push('/cases/scroll');
              timers.current.push(setTimeout(() => cycleTheme(), 400));
            }}
          />
        </Row>
      </Card>

      <Callout title="Why it stays consistent">
        Every snapshot reveals whatever is directly beneath it — the app one step later. That is true
        for a theme change and equally true for a navigation: the copy is of the past, the live app
        is the present, and the reveal is the join between them.
      </Callout>

      <Body style={{ marginTop: 14 }}>
        The current duration is {settings.durationMs}ms. Drop it back on the Playground when you are
        done here.
      </Body>

      <Button
        label="Reset duration to 650ms"
        icon="refresh-outline"
        variant="ghost"
        style={{ marginTop: 12 }}
        onPress={() => themeStore.setSettings({ durationMs: 650 })}
      />

      <QuickSwitch />
      <NextCase slug="navigation" />
    </Screen>
  );
}
