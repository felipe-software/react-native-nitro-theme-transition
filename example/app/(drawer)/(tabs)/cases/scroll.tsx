/**
 * Case: the overlay is a still image.
 *
 * The app is NOT paused — the live app keeps running underneath and touches pass
 * straight through — but the covered region shows pixels from capture time. It is
 * only visible when something underneath moves: scroll momentum, a spinner, a
 * ticking clock. At 420ms it is imperceptible; at 2500ms it is obvious.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  Stat,
  useStyles,
} from '@/components/ui';
import { themeStore, useSettings } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

export default function ScrollCase() {
  const settings = useSettings();
  const styles = useStyles(makeStyles);
  const [ticks, setTicks] = useState(0);

  // A clock that keeps running under the snapshot. During a long transition the
  // copy shows a stale value while the live one below has moved on.
  useEffect(() => {
    const timer = setInterval(() => setTicks(value => value + 1), 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <Screen>
      <CaseIntro
        slug="scroll"
        expect="During a long transition the counter appears frozen inside the covered area and jumps forward the moment the snapshot finishes."
      />

      <Row gap={10} wrap style={{ marginTop: 16 }}>
        <Stat label="ticks (100ms)" value={String(ticks)} />
        <Stat label="duration" value={`${settings.durationMs}ms`} />
      </Row>

      <Card title="Watch the freeze" subtitle="2500ms is long enough to see it plainly." icon="snow-outline">
        <Button
          label="Switch slowly (2500ms)"
          icon="hourglass-outline"
          onPress={() => {
            themeStore.setSettings({ durationMs: 2500 });
            cycleTheme({ kind: 'circularReveal' });
          }}
        />
        <Button
          label="Switch at 420ms (production-ish)"
          icon="flash-outline"
          variant="secondary"
          onPress={() => {
            themeStore.setSettings({ durationMs: 420 });
            cycleTheme({ kind: 'circularReveal' });
          }}
        />
        <Hint>At 420ms the stale region is gone before the eye resolves it.</Hint>
      </Card>

      <SectionTitle>Now with momentum</SectionTitle>
      <Body>
        Fling this screen and hit the button on the way — the snapshot keeps the scroll position it
        was captured at while the real list carries on decelerating underneath.
      </Body>

      <Button
        label="Switch (2500ms) — fling first"
        icon="swap-vertical-outline"
        variant="ghost"
        style={{ marginTop: 12 }}
        onPress={() => {
          themeStore.setSettings({ durationMs: 2500 });
          cycleTheme({ kind: 'slide', direction: 'bottom' });
        }}
      />

      {FILLER.map(item => (
        <View key={item} style={styles.filler}>
          <Text style={styles.fillerTitle}>Row {item}</Text>
          <Text style={styles.fillerBody}>
            Filler so the screen has something to scroll. Every row is re-styled from the theme
            tokens on each change — a full re-render, hidden under the copy.
          </Text>
        </View>
      ))}

      <Callout title="Not a stall">
        The JS thread is free the whole time. Touches pass through the overlay, so a button under it
        still responds — the picture is simply older than the app.
      </Callout>

      <Button
        label="Reset duration to 650ms"
        icon="refresh-outline"
        variant="ghost"
        style={{ marginTop: 12 }}
        onPress={() => themeStore.setSettings({ durationMs: 650 })}
      />

      <QuickSwitch />
      <NextCase slug="scroll" />
    </Screen>
  );
}

const FILLER = Array.from({ length: 12 }, (_, index) => index + 1);

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    filler: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 10,
      padding: 14,
    },
    fillerBody: { color: theme.muted, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
    fillerTitle: { color: theme.text, fontSize: 14, fontWeight: '600' },
  });
