/**
 * Case: settle frames.
 *
 * The snapshot is held for N display frames before it starts animating away, so
 * the new theme has actually painted underneath it. Too few and the reveal
 * uncovers the OLD colours for a frame or two — which reads as a flash, not as a
 * timing bug, and is the single most confusing symptom to debug.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Chip,
  Code,
  Divider,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import { themeStore, useSettings } from '@/theme/store';
import { nextThemeName, type Theme } from '@/theme/themes';
import { cycleTheme, runThemed } from '@/theme/transition';

const FRAME_OPTIONS = [0, 1, 2, 3, 4, 6, 10];

export default function SettleCase() {
  const settings = useSettings();
  const styles = useStyles(makeStyles);

  // A second source of truth, driven by plain React state, changed inside the
  // same callback. It is the slowest thing on the screen to repaint.
  const [accent, setAccent] = useState(0);
  const [lastNote, setLastNote] = useState('—');

  return (
    <Screen>
      <CaseIntro
        slug="settle"
        expect="At 3 frames the reveal uncovers a settled screen. At 0 the old palette is briefly visible again as the copy peels away."
      />

      <SectionTitle>Frames to hold</SectionTitle>
      <Row gap={8} wrap style={{ marginTop: 12 }}>
        {FRAME_OPTIONS.map(frames => (
          <Chip
            key={frames}
            active={frames === settings.settleFrames}
            label={`${frames}`}
            onPress={() => themeStore.setSettings({ settleFrames: frames })}
          />
        ))}
      </Row>
      <Hint>
        Library default is 2, which suits a synchronous applier such as Unistyles. This app needs 3:
        React only schedules a re-render when the callback returns.
      </Hint>

      <Card title="Try it" subtitle={`Currently holding ${settings.settleFrames} frame(s).`} icon="timer-outline">
        <Button
          label="Switch with these settings"
          icon="play-outline"
          onPress={() => {
            runThemed(() => {
              themeStore.setTheme(nextThemeName(themeStore.getState().themeName));
              setAccent(value => (value + 1) % ACCENTS.length);
            });
            setLastNote(`${settings.settleFrames} frames · ${settings.durationMs}ms`);
          }}
        />

        {/* Repainted by React state, not by the store — the last thing to settle. */}
        <View style={[styles.accent, { backgroundColor: ACCENTS[accent] }]}>
          <Text style={styles.accentText}>React-state panel · flips inside the same callback</Text>
        </View>

        <Hint>Last run: {lastNote}</Hint>
      </Card>

      <SectionTitle>The wrong shape</SectionTitle>
      <Body>
        No number of settle frames rescues an asynchronous applier. If the mutation happens after the
        callback returns, the capture has already been committed and the reveal is running against a
        screen that has not changed yet.
      </Body>

      <Card>
        <Button
          label="Apply the theme in a setTimeout (broken)"
          icon="bug-outline"
          variant="danger"
          onPress={() => {
            runThemed(() => {
              // WRONG on purpose: the callback returns before anything changes.
              setTimeout(
                () => themeStore.setTheme(nextThemeName(themeStore.getState().themeName)),
                0,
              );
            });
            setLastNote('async applier — the reveal shows the old theme, then it snaps');
          }}
        />
        <Hint>Watch the reveal complete over the old palette, then the theme snaps in afterwards.</Hint>
      </Card>

      <Divider />

      <Callout tone="warn" title="Debugging recipe">
        “The old colours flash back mid-animation” always means settle frames are too low for the
        consumer’s theme system. Raise the duration to ~3000ms first — every stage becomes obvious.
      </Callout>

      <Code>{`withThemeTransition(
  () => {
    store.setTheme(next);   // synchronous applier  → 2 frames
    setSomeReactState(v);   // React-driven applier → 3-4 frames
  },
  { settleFrames: 3 },
)`}</Code>

      <Button
        label="Reset to 3 frames"
        variant="ghost"
        icon="refresh-outline"
        onPress={() => {
          themeStore.setSettings({ settleFrames: 3 });
          cycleTheme();
        }}
        style={{ marginTop: 16 }}
      />

      <QuickSwitch />
      <NextCase slug="settle" />
    </Screen>
  );
}

const ACCENTS = ['#B4541E', '#3E7C4F', '#6C9CFF', '#9A6B2F'];

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    accent: {
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 6,
      padding: 14,
    },
    accentText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' },
  });
