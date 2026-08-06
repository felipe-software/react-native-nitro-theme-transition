/**
 * Case: switching again while a transition is still running.
 *
 * Nothing is cancelled. Each change gets its own snapshot, and every snapshot
 * reveals whatever is directly beneath it — which is exactly the state the app
 * was in one step later. So newer snapshots go BELOW older ones and the stack
 * stays consistent however fast the user taps.
 */
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

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
  Stat,
  useStyles,
} from '@/components/ui';
import { useChangeCount, useSettings } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

const MAX_OVERLAYS = 6;

export default function StackingCase() {
  const styles = useStyles(makeStyles);
  const settings = useSettings();
  const changes = useChangeCount();
  const [burst, setBurst] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) clearTimeout(timer);
    },
    [],
  );

  /** Fires `count` changes, each from a different point, `gap` ms apart. */
  function fireBurst(count: number, gap: number) {
    const { width, height } = Dimensions.get('window');
    setBurst(count);

    for (let index = 0; index < count; index += 1) {
      const timer = setTimeout(() => {
        cycleTheme({
          // Spread the origins diagonally so each circle is individually visible.
          origin: {
            x: (width / (count + 1)) * (index + 1),
            y: (height / (count + 1)) * (index + 1),
          },
          kind: 'circularRevealInverse',
        });
        if (index === count - 1) setBurst(0);
      }, index * gap);

      timers.current.push(timer);
    }
  }

  return (
    <Screen>
      <CaseIntro
        slug="stacking"
        expect="Multiple circles expand at once, none of them snapping or flickering. Past six overlays the oldest is dropped."
      />

      <Row gap={10} wrap style={{ marginTop: 16 }}>
        <Stat label="changes" value={String(changes)} />
        <Stat label="in flight" value={burst ? `${burst}` : '0'} />
        <Stat label="cap" value={String(MAX_OVERLAYS)} />
      </Row>

      <SectionTitle>Bursts</SectionTitle>
      <Row gap={10} wrap style={{ marginTop: 12 }}>
        <Button label="4 × 120ms" icon="layers-outline" style={styles.grow} onPress={() => fireBurst(4, 120)} />
        <Button label="6 × 80ms" icon="layers-outline" variant="secondary" style={styles.grow} onPress={() => fireBurst(6, 80)} />
        <Button label="10 × 50ms" icon="warning-outline" variant="ghost" style={styles.grow} onPress={() => fireBurst(10, 50)} />
      </Row>
      <Hint>
        Ten in half a second exceeds the cap on purpose: the oldest overlay is dropped, because by
        then it is furthest through its animation and least visible.
      </Hint>

      <SectionTitle>Or just tap fast</SectionTitle>
      <Card subtitle={`Each tap starts a ${settings.durationMs}ms animation of its own.`}>
        <Button label="Switch" icon="color-wand-outline" onPress={() => cycleTheme()} />
      </Card>

      <SectionTitle>The stack</SectionTitle>
      <View style={styles.diagram}>
        <Text style={styles.diagramText}>
          {`window / android.R.id.content
  ├─ snapshot A   ← oldest, TOP-most
  ├─ snapshot B
  ├─ snapshot C   ← newest, bottom-most
  └─ app root     ← live, already themed`}
        </Text>
      </View>

      <Body style={{ marginTop: 14 }}>
        Only the app root is captured, and the snapshots are siblings of it — never children. If a
        capture included the overlays still running above it, every new snapshot would bake in a
        frozen copy of an animation in progress.
      </Body>

      <Callout tone="warn" title="Memory">
        A snapshot is a full-screen GPU layer — roughly 10 MB at 1080×2400. A full stack of six is
        about 60 MB, transiently. Each one frees its bitmap, image and reader as soon as its
        animation ends rather than waiting for the collector.
      </Callout>

      <Code>{`// iOS                          Android
window                        android.R.id.content
  ├─ snapshot A (oldest)        ├─ [2] snapshot A
  ├─ snapshot B                 ├─ [1] snapshot B
  └─ rootViewController.view    └─ [0] React Native root`}</Code>

      <QuickSwitch />
      <NextCase slug="stacking" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    diagram: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      marginTop: 12,
      padding: 14,
    },
    diagramText: { color: theme.text, fontFamily: 'Menlo', fontSize: 11.5, lineHeight: 19 },
    grow: { flexBasis: '30%', flexGrow: 1 },
  });
