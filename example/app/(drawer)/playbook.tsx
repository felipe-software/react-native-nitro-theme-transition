/**
 * Playbook — how to wire this into a real app, in the order you would do it.
 *
 * Every snippet here is the actual code this example runs, trimmed.
 */
import { CycleButton } from '@/components/ThemeControls';
import {
  Body,
  Callout,
  Card,
  Code,
  Hint,
  Row,
  Screen,
  SectionTitle,
  Title,
} from '@/components/ui';

export default function Playbook() {
  return (
    <Screen>
      <Title>Playbook</Title>
      <Body style={{ marginTop: 10 }}>
        The package is deliberately unopinionated: it snapshots, runs a callback, and animates the
        snapshot away. It knows nothing about themes, styling runtimes or React. Every consumer adds
        a thin policy layer — these four decisions are the whole of it.
      </Body>

      <SectionTitle>1 · Wrap the whole swap</SectionTitle>
      <Body>
        Not just the style call. If a screen also updates React state, that belongs inside the same
        callback, so the re-render happens under the snapshot and the reveal uncovers a settled
        screen.
      </Body>
      <Code>{`withThemeTransition(() => {
  styleSheet.setTheme(next);   // the styling runtime
  setSelectedTab(next);        // …and anything else that changes with it
}, options);`}</Code>

      <SectionTitle>2 · Do not animate rehydration</SectionTitle>
      <Body>
        The first apply — restoring a saved preference at startup — has no previous screen to reveal,
        and snapshotting a half-mounted app flashes over the first paint.
      </Body>
      <Code>{`const stored = await loadTheme();
themeStore.markHydrated(stored);   // applies WITHOUT a transition`}</Code>

      <SectionTitle>3 · Park the origin, do not thread it</SectionTitle>
      <Body>
        A theme change travels UI → store → styling runtime, and the press event is long gone by the
        time the theme is applied. Park the coordinate in a module variable and consume it once, with
        a short TTL so a stale point can never be reused by an unrelated change.
      </Body>
      <Code>{`let parked: (Point & { at: number }) | null = null;

export function parkOrigin(point: Point) {
  parked = { ...point, at: Date.now() };
}

export function consumeOrigin(): Point | undefined {
  if (!parked) return undefined;
  const point = parked;
  parked = null;
  return Date.now() - point.at > 250 ? undefined : point;
}`}</Code>

      <SectionTitle>4 · Switches need onTouchStart</SectionTitle>
      <Body>
        A toggle reports only its new boolean. React Native touch events bubble, so a wrapping row
        still sees the coordinate — and a native SwiftUI or Compose control emits no RN touch at all,
        so measure the row instead.
      </Body>
      <Code>{`<View onTouchStart={parkOriginFromEvent}>
  <Switch value={isDark} onValueChange={toggleTheme} />
</View>

// native control — no touch to catch
rowRef.current?.measureInWindow((x, y, w, h) =>
  parkOrigin({ x: x + w - 28, y: y + h / 2 }),
);`}</Code>

      <SectionTitle>5 · Pass pageX/pageY and stop there</SectionTitle>
      <Body>
        React Native reports a touch relative to the surface it happened in, and a modal or a form
        sheet is its own surface. A sheet at its half detent starts ~450dp down the window, so a press
        inside it arrives short by exactly that much. You cannot fix it in JavaScript — inside a sheet
        even `measureInWindow` reports in the sheet’s surface — and you do not need to: the library
        reads the presentation’s frame natively on every capture, so every detent works untouched.
      </Body>
      <Code>{`const { pageX, pageY } = event.nativeEvent;
parkOrigin({ x: pageX, y: pageY });   // that is the whole job`}</Code>

      <SectionTitle>Choosing settle frames</SectionTitle>
      <Card>
        <Body>2 — a synchronous applier such as Unistyles.</Body>
        <Body>3 — a store or React state, where the callback only schedules a re-render.</Body>
        <Body>4+ — heavy screens that also remount something on the swap.</Body>
        <Hint>
          Too low reads as “the old colours flash back mid-animation”. Raise the duration to ~3000ms
          while tuning; every stage becomes obvious.
        </Hint>
      </Card>

      <SectionTitle>Choosing a duration</SectionTitle>
      <Body>
        650ms is the library default, and the app uses it unchanged. It is longer than a typical UI
        animation on purpose: this is a copy of the whole app being taken apart, and below ~500ms the
        reveal reads as a flicker rather than a change. Longer still makes the frozen-content
        limitation visible.
      </Body>
      <Hint>
        The shared easing is `(0.4, 0, 0.2, 1)` — half the motion by 35% of the duration. It used to
        be `(0.2, 0, 0, 1)`, which is half done by 20% and 94% done by 62%: fine at 650ms, but at
        200–300ms the visible part collapses into two or three frames and the change reads as a cut.
        Judge a curve at the shortest duration you ship, never the longest.
      </Hint>

      <SectionTitle>Debugging</SectionTitle>
      <Card title="The animation does not play, the theme just snaps" icon="bug-outline">
        <Body>
          Check `isThemeTransitionAvailable()`. False means the native module is missing — almost
          always a JS bundle running against a native binary built before the package was added.
          Rebuild.
        </Body>
      </Card>

      <Card title="It plays, but nothing seems to move" icon="bug-outline">
        <Body>
          On Android, suspect the capture. If the snapshot is a live mirror of the app rather than
          pixels, every effect except blur looks like a no-op — the mask animates over content
          identical to what is underneath.
        </Body>
      </Card>

      <Card title="The old colours flash back mid-animation" icon="bug-outline">
        <Body>Settle frames are too low for the app’s theme system. Raise them to 3 or 4.</Body>
      </Card>

      <Callout title="Watching it frame by frame">
        `adb exec-out screencap -p` during the animation, tiled with ffmpeg, plus a temporary
        3000ms duration. That is how both the live-mirror bug and the missing settle-hold were found.
      </Callout>

      <Row style={{ marginTop: 20 }}>
        <CycleButton />
      </Row>
    </Screen>
  );
}
