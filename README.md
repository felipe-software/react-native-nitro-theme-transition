# react-native-nitro-theme-transition

Native, GPU-driven theme-change transitions for React Native — circular reveal,
wipe, fade and blur.

**No Skia. No Reanimated. No JS animation library.** The animation is Core
Animation on iOS and the platform animators on Android, both interpolated by the
OS render thread, so a busy JavaScript thread cannot drop a frame of it.

Built on [Nitro Modules](https://nitro.margelo.com). iOS and Android.

```sh
npm install react-native-nitro-theme-transition react-native-nitro-modules
```

Then rebuild — this ships native code, so an existing dev client will not have
it:

```sh
npx expo prebuild
npx expo run:ios      # or: run:android
```

Until you rebuild, `withThemeTransition` degrades to an instant theme change
rather than crashing.

## Usage

```tsx
import { withThemeTransition } from 'react-native-nitro-theme-transition';

withThemeTransition(
  () => setScheme(s => (s === 'light' ? 'dark' : 'light')), // must be synchronous
  { kind: 'circularReveal', durationMs: 400, origin: { x, y } },
);
```

That is the whole API surface. Pass the touch point as `origin` and the reveal
starts from the user's finger:

```tsx
<Pressable
  onPress={event => {
    const { pageX, pageY } = event.nativeEvent;
    withThemeTransition(toggleTheme, { origin: { x: pageX, y: pageY } });
  }}
/>
```

## It is not a theming library

It has no idea what a theme is. It snapshots the screen, runs **your** callback,
and animates the snapshot away. Anything that changes the UI synchronously works
— a theme, a locale/RTL flip, a font-size change, a density switch.

There is no dependency on Unistyles or any styling library. The
[`example/`](./example) app deliberately uses nothing but `useState` and React
Native's own `StyleSheet` to prove it.

`applyTheme` runs **exactly once** in every path: if the native module is
missing, the capture fails, or the platform is web, the change still happens —
just without animation. The animation is never load-bearing.

## Options

| Option         | Default            | Notes                                                      |
| -------------- | ------------------ | ---------------------------------------------------------- |
| `kind`         | `'circularReveal'` | see below                                                  |
| `durationMs`   | `400`              |                                                            |
| `origin`       | screen centre      | circle centre, in dp                                       |
| `direction`    | `'bottom'`         | `slide` only — edge the wipe travels toward                |
| `settleFrames` | `2`                | frames to hold before revealing, so the change has painted |

`THEME_TRANSITION_KINDS` and `THEME_TRANSITION_DIRECTIONS` are exported as arrays
for building pickers. `isThemeTransitionAvailable()` reports whether the native
module is present.

### `settleFrames` — the one thing to check

This is the only setting whose right value depends on **your** theme system.

The snapshot is held for `settleFrames` frames before the reveal starts, so the
new state has painted underneath it. The default of `2` suits a theme system that
applies **synchronously** — Unistyles (a C++ shadow-tree commit), direct native
writes, and so on.

If you drive the theme with React state, your callback returns having only
_scheduled_ a re-render: React still has to reconcile, commit, mount and paint.
On a large tree that can exceed two frames, and revealing early means briefly
animating down to the **old** colours. Raise it:

```ts
withThemeTransition(applyTheme, { settleFrames: 4 });
```

## Kinds

| `kind`                    | What the outgoing screen does                        |
| ------------------------- | ---------------------------------------------------- |
| `'circularReveal'`        | collapses **into** a circle at `origin`              |
| `'circularRevealInverse'` | a hole opens **out** from `origin` and grows         |
| `'slide'`                 | a straight edge wipes across, painting the new theme |
| `'fade'`                  | dissolves                                            |
| `'blur'`                  | blurs and recedes slightly as it dissolves           |

All five share one timing curve, so the two platforms agree.

`circularReveal` and its inverse are the same shape run opposite ways, and they
are each other's natural counterpart: whichever is used for light→dark, the other
reads as "undo" for dark→light.

`slide` is a **wipe, not a translation** — nothing on screen moves. The old
pixels stay exactly where they are and stop being drawn as the boundary passes
over them, so it reads as a line painting the new colours across the screen.
Translating the snapshot instead drags the whole UI sideways, which looks like a
page transition rather than a theme change.

### How each one is done

| `kind`                    | iOS                                      | Android                                   |
| ------------------------- | ---------------------------------------- | ----------------------------------------- |
| `'fade'`                  | `UIViewPropertyAnimator`, opacity        | `ValueAnimator` → `alpha`                 |
| `'circularReveal'`        | `CAShapeLayer` mask + `CABasicAnimation` | `ViewAnimationUtils.createCircularReveal` |
| `'circularRevealInverse'` | the same mask, even-odd fill rule        | `Canvas.clipOutPath` in `onDraw`          |
| `'slide'`                 | animated mask rect                       | `Canvas.clipRect` in `onDraw`             |
| `'blur'`                  | `UIVisualEffectView` + property animator | `RenderEffect.createBlurEffect` (API 31+) |

Below API 31 there is no `RenderEffect`, and the fallback is the same motion
without the blur rather than a CPU blur that would drop frames.

## How it works

A theme change is typically a whole-app style re-evaluation plus a tree commit,
synchronous on the JS thread. It cannot be animated frame by frame. So this
package does not animate the theme at all. It:

1. takes a **GPU-side copy** of the screen and pins it on top;
2. lets you change the theme underneath it, invisibly;
3. animates the copy away with the platform's own animator.

|             | The copy                                                                          | Animated by                            |
| ----------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| **iOS**     | `UIView.snapshotView(afterScreenUpdates:false)`                                    | Core Animation, on the render server   |
| **Android** | a `RenderNode` recording rasterized by `HardwareRenderer` into a hardware `Bitmap` | `ValueAnimator` / `ViewAnimationUtils` |

No pixels are ever read back to the CPU, encoded or decoded.

### The Android capture must be rasterized

Worth knowing if you read the source, because it is a trap that compiles, runs,
and looks like a broken animation rather than a broken capture.

Recording the view into a `RenderNode` and drawing _that_ does not work.
`View.draw(Canvas)` → `dispatchDraw` → `drawChild` emits each child on a hardware
canvas as `drawRenderNode(child.renderNode)` — a **reference** to the child's
live RenderNode, not a copy of its pixels. The "snapshot" is therefore a live
mirror: the instant the theme changes, it changes too. Every mask, clip and
opacity animation then plays over content identical to what is underneath, so
nothing appears to happen — except `blur`, where the effect itself is visible
even though it is blurring the wrong frame.

So the recording is only step one. Step two renders it into an offscreen surface
with `HardwareRenderer`, which resolves every referenced RenderNode into actual
pixels. Below API 29 there is no public `HardwareRenderer`, so it falls back to a
software `Canvas` — which rasterizes for the same reason.

## Concurrent transitions

Switching again before a reveal finishes does **not** cancel anything. Each
change gets its own snapshot and its own animation, and they play at the same
time:

```
iOS: window                          Android: android.R.id.content
  ├─ snapshot A  ← oldest, TOP-most      ├─ [2] snapshot A  ← oldest, TOP-most
  ├─ snapshot B  ← next                  ├─ [1] snapshot B  ← next
  └─ rootViewController.view             └─ [0] React Native root
        ↑ live app, newest theme               ↑ live app, newest theme
```

Every snapshot reveals whatever sits directly beneath it, which is exactly the
state the app was in one step later — so newer snapshots go **below** older ones.
The stack stays visually consistent however fast you tap, and no animation is
ever cut short or restarted.

At most six run at once. Each is a full-screen layer the GPU composites every
frame — and on Android a full-screen buffer, roughly 10 MB at 1080×2400 — so the
stack is bounded; past the limit the **oldest** is dropped, which is the least
visible choice because by then it is furthest through its animation. Every
snapshot is released as soon as its animation ends, including an explicit
`recycle()` so the GPU buffer is not left to the garbage collector.

## Not handled

- **Reduce Motion.** Deliberately the app's call, not the library's — check
  `AccessibilityInfo.isReduceMotionEnabled()` and skip the animation yourself.
- **`Modal`.** RN's built-in `Modal` is a separate `UIWindow` (iOS) / `Dialog`
  window (Android) and is not part of the captured view, so it will not animate.
- **Web.** No native side; the callback runs and the change is instant.

## Example

```sh
cd example
bun install          # or npm install
bun run prebuild
bun run ios          # or: bun run android
```

## Contributing

`src/specs/ThemeTransition.nitro.ts` is the source of truth. After changing it:

```sh
bun run codegen      # nitrogen
bun run build        # bob
```

`nitrogen/generated/` is committed on purpose — CocoaPods needs it at
`pod install` time and Gradle needs it at sync time.

## License

MIT
