/**
 * Case: where the reveal starts.
 *
 * The library takes a plain `{ x, y }` in dp. Everything interesting is in how
 * an app gets that coordinate from a press to the place the theme is applied —
 * see `src/theme/transition.ts`.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import { Body, Button, Callout, Card, Code, Hint, Row, Screen, SectionTitle, useStyles } from '@/components/ui';
import type { Theme } from '@/theme/themes';
import { cycleTheme, parkOrigin, parkOriginFromEvent, peekOrigin } from '@/theme/transition';

export default function OriginCase() {
  const styles = useStyles(makeStyles);
  const [local, setLocal] = useState<{ x: number; y: number } | null>(null);
  const [page, setPage] = useState<{ x: number; y: number } | null>(null);
  const [note, setNote] = useState('Tap the pad.');
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (staleTimer.current) clearTimeout(staleTimer.current);
    },
    [],
  );

  function onPadTouch(event: GestureResponderEvent) {
    const { locationX, locationY, pageX, pageY } = event.nativeEvent;

    setLocal({ x: Math.round(locationX), y: Math.round(locationY) });
    setPage({ x: Math.round(pageX), y: Math.round(pageY) });
    parkOriginFromEvent(event);
    setNote('Parked. The circle grows from that point.');
  }

  /** Parks a point, then waits past the TTL before changing the theme. */
  function staleOrigin() {
    parkOrigin({ x: 20, y: 20 });
    setNote('Parked a point in the top-left, then waited 400ms…');

    staleTimer.current = setTimeout(() => {
      cycleTheme();
      setNote('…the point had expired, so the reveal fell back to the screen centre.');
    }, 400);
  }

  return (
    <Screen>
      <CaseIntro
        slug="origin"
        expect="The circle grows from the exact pixel you touched. A point older than 250ms is discarded and the reveal starts from the centre instead."
      />

      <SectionTitle>Tap anywhere in the pad</SectionTitle>
      <View
        style={styles.pad}
        onTouchStart={onPadTouch}
        onTouchEnd={() => cycleTheme({ kind: 'circularRevealInverse' })}
      >
        {local && <View style={[styles.crosshair, { left: local.x - 11, top: local.y - 11 }]} />}
        <Text style={styles.padHint}>{note}</Text>
      </View>

      <Row gap={10} wrap style={{ marginTop: 12 }}>
        <Card style={styles.readout}>
          <Hint>locationX / locationY — within the pad</Hint>
          <Text style={styles.mono}>{local ? `${local.x}, ${local.y}` : '—'}</Text>
        </Card>
        <Card style={styles.readout}>
          <Hint>pageX / pageY — within the surface</Hint>
          <Text style={styles.mono}>{page ? `${page.x}, ${page.y}` : '—'}</Text>
        </Card>
      </Row>

      <Callout title="pageX/pageY is what to pass">
        `locationX` is relative to the view you touched, so it would put the circle in the wrong
        place. `pageX` is relative to the SURFACE the touch happened in — a screen, a modal, a sheet
        — and that is exactly what the library expects. It knows where each presented surface sits in
        the window and translates the point itself, at capture time, so a sheet works at any detent.
      </Callout>

      <Code>{`const { pageX, pageY } = event.nativeEvent;
parkOrigin({ x: pageX, y: pageY });`}</Code>

      <Hint>
        Converting in JavaScript does not work and is not needed: inside a sheet even
        `measureInWindow` reports positions in that sheet’s surface.
      </Hint>

      <SectionTitle>The 250ms TTL</SectionTitle>
      <Body>
        A theme change travels UI → store → styling runtime. By the time it lands, the press is long
        gone, so the coordinate is parked in a module variable and consumed once. Without an expiry,
        a change triggered by something else entirely — a deep link, the system appearance, a timer —
        would inherit a touch the user never made.
      </Body>

      <Row gap={10} style={{ marginTop: 14 }}>
        <Button
          label="Fresh"
          icon="flash-outline"
          style={{ flex: 1 }}
          onPress={() => {
            parkOrigin({ x: 20, y: 20 });
            cycleTheme();
            setNote('Parked and consumed in the same tick — reveals from the top-left.');
          }}
        />
        <Button label="Stale (400ms)" icon="hourglass-outline" variant="secondary" style={{ flex: 1 }} onPress={staleOrigin} />
      </Row>

      {/* Sampled at render time — the store is a module variable, not React state. */}
      <Hint>
        At this render: {peekOrigin() ? 'a point was parked and not yet consumed' : 'nothing parked'}
        .
      </Hint>

      <SectionTitle>The whole mechanism</SectionTitle>
      <Code>{`let parked: (Point & { at: number }) | null = null;

export function parkOrigin(point: Point) {
  parked = { ...point, at: Date.now() };
}

export function consumeOrigin(): Point | undefined {
  if (!parked) return undefined;
  const point = parked;
  parked = null;                                  // consumed once
  if (Date.now() - point.at > 250) return undefined;  // and only while fresh
  return { x: point.x, y: point.y };
}`}</Code>

      <QuickSwitch />
      <NextCase slug="origin" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    crosshair: {
      borderColor: theme.tint,
      borderRadius: 11,
      borderWidth: 2,
      height: 22,
      position: 'absolute',
      width: 22,
    },
    mono: { color: theme.text, fontFamily: 'Menlo', fontSize: 13 },
    pad: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderStyle: 'dashed',
      borderWidth: 1,
      height: 220,
      justifyContent: 'center',
      marginTop: 12,
      overflow: 'hidden',
    },
    padHint: { color: theme.muted, fontSize: 13, paddingHorizontal: 24, textAlign: 'center' },
    readout: { flexBasis: '46%', flexGrow: 1, marginTop: 0 },
  });
