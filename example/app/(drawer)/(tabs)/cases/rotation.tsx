/**
 * Case: rotation and resize.
 *
 * Honest status: this is one of the paths the package documents as NOT verified.
 * The snapshot is laid out to the root's bounds at capture time and does not
 * follow a configuration change, so rotating mid-transition can leave a copy
 * sized for the previous orientation.
 *
 * The screen exists so the behaviour can be observed deliberately rather than
 * discovered by a user.
 */
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

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

export default function RotationCase() {
  const styles = useStyles(makeStyles);
  const settings = useSettings();
  const [size, setSize] = useState(() => Dimensions.get('window'));
  const [rotations, setRotations] = useState(0);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setSize(window);
      setRotations(count => count + 1);
    });

    return () => subscription.remove();
  }, []);

  const landscape = size.width > size.height;

  return (
    <Screen>
      <CaseIntro
        slug="rotation"
        expect="Undefined, deliberately. Rotating during a transition is untested; the likely correct behaviour is for the library to abort the transition on a configuration change."
      />

      <Row gap={10} wrap style={{ marginTop: 16 }}>
        <Stat label="width" value={`${Math.round(size.width)}`} />
        <Stat label="height" value={`${Math.round(size.height)}`} />
        <Stat label="rotations" value={String(rotations)} />
      </Row>

      <View style={styles.orientation}>
        <Text style={styles.orientationText}>{landscape ? 'Landscape' : 'Portrait'}</Text>
      </View>

      <SectionTitle>Reproduce it</SectionTitle>
      <Card subtitle="Unlock rotation on the device first, then start a slow transition and turn the phone.">
        <Button
          label="Switch over 3000ms"
          icon="sync-outline"
          onPress={() => {
            themeStore.setSettings({ durationMs: 3000 });
            cycleTheme({ kind: 'circularRevealInverse' });
          }}
        />
        <Button
          label="Reset duration to 650ms"
          icon="refresh-outline"
          variant="ghost"
          onPress={() => themeStore.setSettings({ durationMs: 650 })}
        />
        <Hint>Current duration {settings.durationMs}ms.</Hint>
      </Card>

      <Callout tone="warn" title="Known unverified">
        Alongside rotation: the API &lt; 29 software-capture fallback, the API 24/25
        `Region.Op.DIFFERENCE` path for the inverse reveal, and multi-window / foldable /
        picture-in-picture on Android. None of them have been exercised on real hardware.
      </Callout>

      <SectionTitle>What a fix would look like</SectionTitle>
      <Body>
        Listen for the configuration change natively and call the same teardown path `abort()` uses:
        detach the view, then release the bitmap, the image and the reader. Aborting is better than
        re-laying-out, because a copy of the previous orientation is not a useful thing to reveal
        however it is scaled.
      </Body>

      <QuickSwitch />
      <NextCase slug="rotation" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    orientation: {
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      marginTop: 12,
      paddingVertical: 18,
    },
    orientationText: { color: theme.text, fontSize: 18, fontWeight: '700' },
  });
