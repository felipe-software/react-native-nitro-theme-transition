import type { HybridObject } from 'react-native-nitro-modules';

/**
 * Which animation plays as the old screen is taken away.
 *
 * All of them are UIKit/Core Animation on iOS, so the render server interpolates
 * them and none costs per-frame CPU or JavaScript work:
 *
 *   fade            opacity to zero
 *   circularReveal  the old screen collapsing into a circle at `origin`
 *   circularRevealInverse
 *                   a hole opening at `origin` and growing outward — the same
 *                   shape as `circularReveal`, run the other way round
 *   slide           a straight edge sweeping across, uncovering the new theme
 *                   (a mask wipe — nothing on screen actually moves)
 *   blur            a `UIVisualEffectView` ramping up as the snapshot fades
 */
export type ThemeTransitionKind =
  'fade' | 'circularReveal' | 'circularRevealInverse' | 'slide' | 'blur';

/**
 * The edge the OUTGOING screen leaves through. `slide` only.
 *
 * `'bottom'` sweeps the boundary downward, so the last sliver of the old screen
 * sits against the bottom edge before it goes.
 *
 * Nothing translates: the old pixels stay exactly where they are and stop being
 * drawn as the line passes over them, so it reads as the new colours being
 * painted across the screen rather than the UI sliding away.
 */
export type ThemeTransitionDirection = 'top' | 'bottom' | 'left' | 'right';

export interface ThemeTransitionOptions {
  kind: ThemeTransitionKind;
  /** Animation length in milliseconds. */
  durationMs: number;
  /**
   * Centre of the circle for `circularReveal` / `circularRevealInverse`, in
   * points relative to the root view. Ignored by the other kinds. Negative
   * values mean "use the centre of the screen".
   */
  originX: number;
  originY: number;
  /**
   * How many display frames to hold the snapshot before animating.
   *
   * The theme swap is committed by Unistyles on the JS thread and mounted on the
   * main thread a frame or two later. Revealing before that lands would show the
   * OLD colours through the animation. Held natively so JS never has to time it.
   */
  settleFrames: number;
  /** Edge the outgoing screen leaves through. Ignored by every kind but `slide`. */
  direction: ThemeTransitionDirection;
}

/**
 * Native theme-change transition.
 *
 * ── The contract ──
 * 1. `begin()` takes a GPU-side copy of the current screen and pins it on top.
 *    Nothing has changed visually — the copy is identical to what was there.
 * 2. The caller changes the theme however it likes (Unistyles, in this app).
 *    That happens underneath the copy, so it is invisible.
 * 3. `commit()` waits for the swap to paint, then animates the copy away and
 *    resolves once it has been removed.
 *
 * The theme system is never involved in the animation, which is the whole point:
 * a Unistyles theme change is a full style re-evaluation plus a shadow-tree
 * commit, so it can never be driven per frame. See
 * `apps/mobile/src/docs/ThemeTransitionResearch.md`.
 */
export interface ThemeTransition extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Snapshot the screen and cover it. Synchronous on purpose: no frame may be
   * rendered between the capture and the caller's theme change.
   *
   * @returns `true` when a snapshot is up. `false` means the platform could not
   * capture (no window, or unsupported) — the caller should then just change the
   * theme normally, with no animation.
   */
  begin(): boolean;

  /** Animate the snapshot away. Resolves once it has been removed. */
  commit(options: ThemeTransitionOptions): Promise<void>;

  /** Drop the snapshot immediately, no animation. For error paths. */
  abort(): void;
}
