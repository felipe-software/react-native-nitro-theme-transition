/**
 * Case: what happens when things go wrong.
 *
 * The contract is narrow and worth stating plainly: the callback runs exactly
 * once, whatever happens. No native module, a failed capture, a throwing
 * callback — the theme still changes. Only the animation is optional.
 */
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text } from 'react-native';
import {
  isThemeTransitionAvailable,
  withThemeTransition,
} from 'react-native-nitro-theme-transition';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Code,
  Hint,
  Screen,
  SectionTitle,
  StatusDot,
  useStyles,
} from '@/components/ui';
import { themeStore, useThemeName } from '@/theme/store';
import { nextThemeName, type Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

export default function AvailabilityCase() {
  const styles = useStyles(makeStyles);
  const themeName = useThemeName();
  const available = isThemeTransitionAvailable();
  const [log, setLog] = useState<string[]>([]);

  function append(line: string) {
    setLog(previous => [`${new Date().toLocaleTimeString()}  ${line}`, ...previous].slice(0, 12));
  }

  /** A callback that throws. The overlay must not be stranded on top of the app. */
  function throwingCallback() {
    try {
      withThemeTransition(
        () => {
          themeStore.setTheme(nextThemeName(themeName));
          throw new Error('boom — thrown after the theme was applied');
        },
        { durationMs: 700, settleFrames: 3 },
      );
    } catch (error) {
      append(`caught: ${(error as Error).message}`);
      append('overlay aborted, theme still changed');
    }
  }

  return (
    <Screen>
      <CaseIntro
        slug="availability"
        expect="Every button below changes the theme. Some of them animate it; none of them lose the change or leave a frozen copy on screen."
      />

      <Card>
        <StatusDot
          ok={available}
          label={available ? 'Native module resolved' : 'No native module — instant switching'}
        />
        <Hint>
          {Platform.OS === 'web'
            ? 'Web has no native side at all: the callback runs and the change is instant.'
            : 'A false reading here almost always means a JS bundle running against a native binary built before this package was added. Rebuild the dev client.'}
        </Hint>
      </Card>

      <SectionTitle>Failure paths</SectionTitle>
      <Card subtitle="Each one is safe. Watch the log below.">
        <Button
          label="Normal change"
          icon="checkmark-circle-outline"
          onPress={() => {
            cycleTheme();
            append('withThemeTransition → begin, apply, commit');
          }}
        />

        <Button
          label="Callback throws"
          icon="bug-outline"
          variant="danger"
          onPress={throwingCallback}
        />

        <Button
          label="Animation disabled by the app"
          icon="remove-circle-outline"
          variant="secondary"
          onPress={() => {
            cycleTheme({ instant: true });
            append('policy said no — applied directly, no capture');
          }}
        />

        <Button
          label="Zero duration"
          icon="flash-outline"
          variant="ghost"
          onPress={() => {
            cycleTheme({ durationMs: 1 });
            append('1ms — effectively instant, still a valid transition');
          }}
        />
      </Card>

      <SectionTitle>Log</SectionTitle>
      <ScrollView style={styles.log} contentContainerStyle={styles.logContent} nestedScrollEnabled>
        {log.length === 0 ? (
          <Text style={styles.logLine}>Nothing yet.</Text>
        ) : (
          log.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.logLine}>
              {line}
            </Text>
          ))
        )}
      </ScrollView>

      <Callout title="The guarantee">
        `applyTheme` is invoked exactly once — never skipped, never run twice. If it throws, the
        overlay is aborted first and the error is re-thrown to the caller.
      </Callout>

      <SectionTitle>How it is written</SectionTitle>
      <Code>{`const native = getNative();
if (!native) { applyTheme(); return; }        // no module → still applies

let captured = false;
try { captured = native.begin(); } catch { captured = false; }

try { applyTheme(); }
catch (error) {
  if (captured) native.abort();               // never strand the overlay
  throw error;
}

if (!captured) return;                        // capture failed → instant change
void native.commit(options).catch(() => native.abort());`}</Code>

      <Body style={{ marginTop: 14 }}>
        `isThemeTransitionAvailable()` is the check to gate UI on — for example, hiding an
        “animation style” picker on a build where the module is missing.
      </Body>

      <QuickSwitch />
      <NextCase slug="availability" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    log: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      marginTop: 12,
      maxHeight: 170,
    },
    logContent: { padding: 12 },
    logLine: { color: theme.muted, fontFamily: 'Menlo', fontSize: 11, lineHeight: 18 },
  });
