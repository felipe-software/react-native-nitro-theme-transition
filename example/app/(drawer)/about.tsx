/**
 * About — the idea in one screen, plus an honest status board.
 */
import { Platform } from 'react-native';

import { CycleButton, ThemeSwatches } from '@/components/ThemeControls';
import {
  Body,
  Callout,
  Card,
  Code,
  Hint,
  Row,
  Screen,
  SectionTitle,
  Stat,
  Title,
} from '@/components/ui';
import { KIND_META } from '@/kinds';
import { useChangeCount } from '@/theme/store';

const VERIFIED = [
  'All six effects on Android emulator and iOS simulator, both directions',
  'pixlated mid-transition colour swap (second-capture poll) on both platforms',
  'Six concurrent overlays with no crash, flicker or recycled-bitmap exception',
  'iOS pod install + xcodebuild compile, effects confirmed on a simulator recording',
  'Consumed cleanly from a second, unrelated app as a workspace package',
];

const UNVERIFIED = [
  'An automated end-to-end drive of every case screen',
  'The API < 29 software-capture fallback',
  'The API 24/25 Region.Op.DIFFERENCE path for the inverse reveal',
  'Device rotation during a transition',
  'Multi-window / foldable / picture-in-picture on Android',
  'Any measured GPU or memory profile on a low-end device',
];

export default function About() {
  const changes = useChangeCount();

  return (
    <Screen>
      <Title>Theme Transition</Title>
      <Body style={{ marginTop: 10 }}>
        GPU-driven theme changes for React Native. Six effects, no Skia, no Reanimated, no JS
        animation library. The only dependency is Nitro.
      </Body>

      <Row gap={10} wrap style={{ marginTop: 16 }}>
        <Stat label="effects" value="6" />
        <Stat label="native methods" value="3" />
        <Stat label="changes here" value={String(changes)} />
      </Row>

      <SectionTitle>The core idea</SectionTitle>
      <Body>
        A theme change cannot be animated frame by frame. Applying a theme is a whole-app style
        re-evaluation plus a tree commit, done synchronously — there is no intermediate state to
        interpolate, no “40% dark”. So the theme is not animated at all:
      </Body>

      <Card>
        <Body>1 · Take a GPU-side copy of the current screen and pin it on top.</Body>
        <Body>2 · Run the callback — the theme changes underneath, invisibly.</Body>
        <Body>3 · Animate the copy away with the platform’s own animator.</Body>
      </Card>

      <Callout tone="good" title="Why it cannot stutter">
        Step 3 is submitted to the OS once and interpolated by the render thread. A busy or blocked
        JavaScript thread has no way to interfere with it.
      </Callout>

      <SectionTitle>The API</SectionTitle>
      <Code>{`begin(): boolean               // snapshot now, synchronously
commit(options): Promise<void> // hold N frames, then animate it away
abort(): void                  // drop the snapshot, no animation`}</Code>
      <Hint>
        `begin()` must be synchronous — when it returns, the screen has to already be covered, or a
        frame can render between the capture and the theme change.
      </Hint>

      <SectionTitle>The six effects</SectionTitle>
      {Object.entries(KIND_META).map(([kind, meta]) => (
        <Card key={kind} title={meta.label} subtitle={meta.hint} icon={meta.icon}>
          <Hint>{meta.native}</Hint>
        </Card>
      ))}

      <SectionTitle>On this platform</SectionTitle>
      <Card subtitle={Platform.OS === 'ios' ? 'iOS' : 'Android'}>
        <Body>
          {Platform.OS === 'ios'
            ? 'snapshotView(afterScreenUpdates: false) of every visible window — so anything presented is included — hosted in a dedicated overlay window one level above the app, animated with Core Animation. `false` is deliberate: `true` forces a synchronous layout and render pass of the whole app on the main thread, exactly the stall this design avoids.'
            : 'RenderNode recording → HardwareRenderer → ImageReader → Bitmap.wrapHardwareBuffer, hosted as a sibling of the RN root inside android.R.id.content at child index 1, animated with ViewAnimationUtils and ValueAnimator.'}
        </Body>
      </Card>

      <SectionTitle>Verified</SectionTitle>
      {VERIFIED.map(item => (
        <Body key={item} style={{ marginTop: 6 }}>
          ✓ {item}
        </Body>
      ))}

      <SectionTitle>Not verified</SectionTitle>
      {UNVERIFIED.map(item => (
        <Body key={item} style={{ marginTop: 6 }}>
          ✗ {item}
        </Body>
      ))}

      <Callout tone="warn" title="Known limitations">
        RN `Modal` is a Dialog on Android and is not captured there; on iOS a presentation shares
        the app’s window and is. Content under the overlay is frozen for
        the duration — the app is not blocked, but the covered region shows pixels from capture time.
        Reduce Motion is the app’s job. Web is a no-op: the callback runs, the change is instant.
      </Callout>

      <SectionTitle>Switch</SectionTitle>
      <Card>
        <ThemeSwatches />
      </Card>
      <Row style={{ marginTop: 12 }}>
        <CycleButton />
      </Row>
    </Screen>
  );
}
