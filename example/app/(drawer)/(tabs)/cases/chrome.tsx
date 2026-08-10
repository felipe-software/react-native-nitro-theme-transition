/**
 * Case: system chrome and the edge of the capture.
 *
 * Everything inside the app's root view is copied. Everything the OS draws on
 * top of it is not. That single line explains every "almost right" transition:
 * the status bar flips instantly while the app fades, and there is nothing the
 * library can do about it from inside the app's own window.
 */
import { useLayoutEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Code,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import { useTheme } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

const INSIDE = [
  'Native stack header (react-native-screens)',
  'Native bottom tab bar and its badges',
  'Drawer panel and backdrop',
  'SwiftUI / Jetpack Compose hosts',
  'Blur views, images, text inputs',
  ...(Platform.OS === 'ios'
    ? ['Presented modals and sheets, with their dimming']
    : ['Router modals (fragments in the same window)']),
];

const OUTSIDE = [
  'OS status bar (time, battery, signal)',
  'Android navigation bar',
  'System alerts, share sheets, autofill',
  'The keyboard itself',
  ...(Platform.OS === 'android' ? ['React Native <Modal> (its own Dialog window)'] : []),
];

export default function ChromeCase() {
  const theme = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);
  const [headerShown, setHeaderShown] = useState(true);

  // Toggling native chrome is a real theme-adjacent operation: it changes the
  // layout of the captured view between one transition and the next.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown });
  }, [headerShown, navigation]);

  return (
    <Screen>
      {/* Forced light on purpose: switch the theme and watch this NOT animate. */}
      <StatusBar style={theme.isDark ? 'light' : 'dark'} animated />

      <CaseIntro
        slug="chrome"
        expect="The header, tab bar and content all animate together. The status bar changes in a single frame, out of step with them."
      />

      <Row gap={10} wrap style={{ marginTop: 16 }}>
        <Card style={styles.column}>
          <Text style={styles.columnTitle}>Inside the capture</Text>
          {INSIDE.map(item => (
            <Text key={item} style={styles.itemGood}>
              ✓ {item}
            </Text>
          ))}
        </Card>

        <Card style={styles.column}>
          <Text style={styles.columnTitle}>Outside it</Text>
          {OUTSIDE.map(item => (
            <Text key={item} style={styles.itemBad}>
              ✗ {item}
            </Text>
          ))}
        </Card>
      </Row>

      <SectionTitle>Change the chrome, then switch</SectionTitle>
      <Card subtitle="The capture is laid out to the root's bounds at the moment it is taken.">
        <Button
          label={headerShown ? 'Hide the native header' : 'Show the native header'}
          icon="chevron-collapse-outline"
          variant="secondary"
          onPress={() => setHeaderShown(value => !value)}
        />
        <Button label="Switch now" icon="color-wand-outline" onPress={() => cycleTheme()} />
        <Hint>
          Safe-area insets here: top {Math.round(insets.top)}, bottom {Math.round(insets.bottom)}.
          The snapshot includes the area under the status bar, but not the bar itself.
        </Hint>
      </Card>

      <Callout tone="warn" title={Platform.OS === 'ios' ? 'iOS' : 'Android'}>
        {Platform.OS === 'ios'
          ? 'The copy is a snapshot of the scene’s windows, and it is hosted in a window of its own one level above them. So it covers everything the app draws, and sits below the status bar, alerts and the keyboard, which the OS keeps drawing live.'
          : 'The snapshot is a sibling of the React Native root inside android.R.id.content, at child index 1. The system bars, and any Dialog window, are outside that container entirely.'}
      </Callout>

      <SectionTitle>Softening it</SectionTitle>
      <Body>
        If a hard status-bar flip is distracting, the usual fix is to make it a non-event: keep the
        bar style constant across your palettes, or set it to `light` for both dark themes so only
        the light↔dark crossing changes it.
      </Body>

      <Code>{`// iOS                                  Android
UIView.snapshotView(afterScreenUpdates: false)
                                       RenderNode → HardwareRenderer
                                       → ImageReader → hardware Bitmap
window.addSubview(snapshot)            content.addView(snapshot, 1)`}</Code>

      <QuickSwitch />
      <NextCase slug="chrome" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    column: { flexBasis: '46%', flexGrow: 1, gap: 6, marginTop: 0 },
    columnTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
    itemBad: { color: theme.danger, fontSize: 12, lineHeight: 18 },
    itemGood: { color: theme.success, fontSize: 12, lineHeight: 18 },
  });
