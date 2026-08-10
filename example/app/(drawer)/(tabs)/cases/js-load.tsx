/**
 * Case: a busy JavaScript thread.
 *
 * This is the entire value proposition. The animation is submitted to the OS
 * once and interpolated by the render thread, so JavaScript can be completely
 * blocked while it plays and the motion stays smooth.
 *
 * The bar at the top is animated FROM JAVASCRIPT, one frame at a time, purely as
 * a control: it is what a JS-driven theme animation would look like under the
 * same load.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Chip,
  Code,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

const BLOCK_OPTIONS = [300, 800, 1500, 3000];

/** Spins the JS thread for `ms`, exactly the way a bad reducer or a big parse does. */
function blockJsThread(ms: number) {
  const until = Date.now() + ms;
  // eslint-disable-next-line no-empty
  while (Date.now() < until) {}
}

export default function JsLoadCase() {
  const styles = useStyles(makeStyles);
  const [blockMs, setBlockMs] = useState(1500);
  const [offset, setOffset] = useState(0);
  const [dropped, setDropped] = useState(0);
  const frame = useRef<number | null>(null);

  // A JS-driven "animation": one setState per frame. It is the thing that
  // stutters — the transition running next to it does not.
  useEffect(() => {
    let last = Date.now();
    let missed = 0;

    const tick = () => {
      const now = Date.now();
      const delta = now - last;
      last = now;

      // Anything over ~2 frames at 60Hz is a visible hitch.
      if (delta > 34) missed += 1;

      setDropped(missed);
      setOffset(previous => (previous + delta / 12) % 100);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <Screen>
      <CaseIntro
        slug="js-load"
        expect="Blocking mid-reveal: the transition plays at full frame rate while the JS bar freezes solid. Blocking in the same tick: nothing appears to happen, because the theme it would reveal has not painted yet."
      />

      <SectionTitle>JS-driven bar (the control)</SectionTitle>
      <View style={styles.track}>
        <View style={[styles.thumb, { left: `${offset}%` }]} />
      </View>
      <Hint>{dropped} hitches since this screen mounted — one setState per frame.</Hint>

      <SectionTitle>How long to block</SectionTitle>
      <Row gap={8} wrap style={{ marginTop: 12 }}>
        {BLOCK_OPTIONS.map(ms => (
          <Chip key={ms} active={ms === blockMs} label={`${ms}ms`} onPress={() => setBlockMs(ms)} />
        ))}
      </Row>

      <Card
        title="Jam the thread mid-reveal"
        subtitle="The new theme paints first, then JavaScript dies while the reveal is still running. This is the one that shows what the package is for."
        icon="speedometer-outline"
      >
        <Button
          label={`Switch, then block ${blockMs}ms`}
          icon="flame-outline"
          onPress={() => {
            cycleTheme();
            // 150ms is past the settle hold, so React has committed and painted
            // the new theme underneath the copy before the thread dies.
            setTimeout(() => blockJsThread(blockMs), 150);
          }}
        />
        <Hint>
          The reveal keeps running at full frame rate while the bar above is frozen solid.
        </Hint>
      </Card>

      <Card
        title="The instructive failure"
        subtitle="Block in the same tick as the switch, before React can re-render."
        icon="bug-outline"
      >
        <Button
          label={`Block ${blockMs}ms immediately`}
          icon="hourglass-outline"
          variant="secondary"
          onPress={() => {
            cycleTheme();
            blockJsThread(blockMs);
          }}
        />
        <Callout tone="warn" title="Nothing appears to happen — and that is correct">
          The animation runs exactly on time. It just uncovers the screen it is covering: this app
          drives the theme from React, so with JavaScript dead the new colours never paint. When the
          thread frees up, the copy is long gone and the theme snaps in.
          {'\n\n'}
          The package guarantees the ANIMATION survives JS load, not that a React-driven state change
          can happen while JS is stopped. A synchronous native applier paints under the copy and does
          not have this problem.
        </Callout>
      </Card>

      <Callout tone="warn" title="What to watch on Android">
        The capture blocks the JS thread on the main thread for up to 250ms. If the main thread is
        too busy to service it in that window, the theme still changes — just instantly. That is the
        designed failure mode: never a stall, never a missed change.
      </Callout>

      <SectionTitle>Why it survives</SectionTitle>
      <Body>
        Four earlier attempts in a sibling project animated the theme itself, or covered it with a
        JS-drawn overlay. All were visibly laggy for the same reason the bar above is: every frame
        had to come from JavaScript. Here the only JS work is one synchronous capture and one
        `commit()` call.
      </Body>
      <Body style={{ marginTop: 10 }}>
        The corollary is the failure above. JavaScript is out of the animation loop, but it is still
        in the loop for whatever your callback changes. The copy will peel away on schedule whether
        or not anything new has painted underneath it.
      </Body>

      <Code>{`begin()                 // synchronous — screen is covered when it returns
applyTheme()            // your callback, invisible under the copy
commit(options)         // hand N frames + a curve to the OS, then let go`}</Code>

      <QuickSwitch />
      <NextCase slug="js-load" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    thumb: {
      backgroundColor: theme.tint,
      borderRadius: 6,
      height: 12,
      position: 'absolute',
      top: 4,
      width: 12,
    },
    track: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      height: 20,
      marginTop: 12,
      overflow: 'hidden',
    },
  });
