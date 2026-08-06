# Example app

An Expo Router app that exercises `react-native-nitro-theme-transition` in the
shapes a real app actually has: a drawer wrapping native bottom tabs, native
stack headers, router modals, a form sheet, a transparent overlay, and sixteen
case screens for the situations that are easy to get wrong.

```sh
bun install          # or npm install
bun run prebuild     # expo prebuild --clean
bun run ios          # or: bun run android
```

> **Native changes to the library:** `react-native.config.js` points autolinking
> at `..`, so the pod compiles the repo's `ios/` directly. Without it, CocoaPods
> builds the copy `bun install` left in its store and native edits silently do
> nothing. `grep NitroThemeTransition ios/Podfile.lock` must say `(from ../..)`.
> Also `xcrun simctl terminate` before re-testing — installing a new binary does
> not restart a running app.

## What it deliberately does not use

No styling runtime, no animation library. Four palettes live in a plain
module-level store; every screen re-creates its `StyleSheet` from theme tokens.
Reanimated and gesture-handler are present only because the drawer needs them —
nothing in the transition path touches either.

## Map

```
app/
  _layout.tsx                     root stack · rehydration · window background
  modal.tsx                       presentation: 'modal'
  sheet.tsx                       presentation: 'formSheet'
  overlay.tsx                     presentation: 'transparentModal'
  (drawer)/
    _layout.tsx                   drawer + custom themed content
    about.tsx                     the idea, the API, verified vs not
    playbook.tsx                  how to wire it into your own app
    (tabs)/
      _layout.tsx                 NativeTabs (expo-router/unstable-native-tabs)
      (home)/index.tsx            Playground — every option in one place
      cases/                      16 case screens
      gallery/index.tsx           icons, symbols, images, tokens, type scale
      settings/index.tsx          the same options via native @expo/ui controls
src/
  cases.ts                        the case registry
  kinds.ts                        effect metadata
  theme/themes.ts                 four palettes
  theme/store.ts                  synchronous store + hooks
  theme/transition.ts             THE POLICY LAYER — the file worth copying
  components/                     shared primitives
```

## The cases

| Screen                     | What it tests                                              |
| -------------------------- | ---------------------------------------------------------- |
| Reveal origin              | Parking a touch point, consuming it once, a 250ms TTL      |
| Controls that toggle       | `onTouchStart` vs `onPress`; native controls emit no touch |
| Rapid switching            | Six concurrent overlays; nothing is cancelled              |
| Blocked JS thread          | A busy JS thread next to a render-thread animation         |
| Settle frames              | Too few frames → the old colours flash back                |
| Modals & sheets            | Captured on iOS (same window); an Android Dialog is not    |
| Drawer                     | Switching with the drawer open, and from inside it         |
| Navigating mid-transition  | Push, pop and change tabs while a snapshot is playing      |
| System chrome              | What is inside the capture and what the OS draws on top    |
| Scrolling & frozen pixels  | The overlay is a still; the app underneath is not paused   |
| Long lists & images        | 1000 rows re-themed under the snapshot                     |
| Keyboard & inputs          | Focused fields, keyboard appearance, layout resize         |
| Native surfaces            | SwiftUI/Compose hosts, blur, images, SF Symbols            |
| Reduce Motion              | Reading the setting synchronously; skipping the animation  |
| Fallbacks & errors         | No module, a throwing callback, an aborted capture         |
| Rotation & resize          | An explicitly unverified path, made observable             |

## The policy layer

`src/theme/transition.ts` is the part to copy. It is the thin layer every
consumer ends up writing:

- which effect, how long, how many settle frames — from the settings store;
- where the reveal starts — a parked touch point with a 250ms TTL;
- when not to animate at all — Reduce Motion, and the first paint after startup.

The library itself knows none of that. It snapshots, runs your callback, and
animates the snapshot away.
