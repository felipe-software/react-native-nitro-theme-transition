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
 *                   (a mask wipe — nothing on screen actually moves). The edge
 *                   can be tilted with `angleDeg`
 *   split           the same edge, but TWO of them, parting from the centre —
 *                   the old screen retreats to both opposite edges at once
 *   blur            a `UIVisualEffectView` ramping up as the snapshot fades
 *   pixlated        dual mosaic crossfade — colour swaps mid-transition behind
 *                   the pixels (Skia `pixelize` look, CPU mosaic on both platforms)
 *   dissolve        the old screen disintegrates into grain — cells drop out in
 *                   a fixed noise order until nothing is left
 *   iris            `circularReveal` with a shape other than a circle — see
 *                   `shape`
 *   barnDoor        `split` run the other way: two edges close IN to the centre,
 *                   so the old screen survives as a shrinking middle band
 *   blinds          `bands` parallel slabs, each wiping across itself in unison
 *   stripes         `dissolve`'s grain, ordered along `direction` instead of at
 *                   random — a grainy edge sweeping across
 *   ripple          concentric wavefronts expanding from `origin`
 *   shatter         the screen breaks into cells that fall away in random order
 *   zoom            the old screen scales up and fades
 */
export type ThemeTransitionKind =
  | 'fade'
  | 'circularReveal'
  | 'circularRevealInverse'
  | 'slide'
  | 'split'
  | 'barnDoor'
  | 'blinds'
  | 'blur'
  | 'pixlated'
  | 'dissolve'
  | 'stripes'
  | 'ripple'
  | 'shatter'
  | 'iris'
  | 'zoom';

/**
 * The outline `iris` collapses the old screen into. `iris` only.
 *
 * Every one of these is a polygon with a FIXED vertex count that scales
 * linearly with the radius, which is what lets Core Animation interpolate the
 * mask path directly — see `IrisShape` in the iOS implementation.
 *
 * `'circle'` makes `iris` identical to `circularReveal`; it exists so the shape
 * can be chosen at runtime without special-casing the kind.
 */
export type ThemeTransitionShape = 'circle' | 'diamond' | 'hexagon' | 'roundedRect';

/**
 * The edge the OUTGOING screen leaves through. `slide` and `split` only.
 *
 * `'bottom'` sweeps the boundary downward, so the last sliver of the old screen
 * sits against the bottom edge before it goes.
 *
 * Nothing translates: the old pixels stay exactly where they are and stop being
 * drawn as the line passes over them, so it reads as the new colours being
 * painted across the screen rather than the UI sliding away.
 *
 * For `split` this picks the AXIS rather than an edge, because both edges are
 * used: `'top'`/`'bottom'` part the screen horizontally, `'left'`/`'right'`
 * vertically.
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
  /** Edge the outgoing screen leaves through. `slide` and `split` only. */
  direction: ThemeTransitionDirection;
  /**
   * Tilt of the boundary line, in degrees. `slide` and `split` only.
   *
   * Zero is the axis-aligned edge — horizontal for `top`/`bottom`, vertical for
   * `left`/`right`. A non-zero value rotates the LINE while keeping the sweep
   * along its own normal, so `direction: 'top'` with `angleDeg: 40` still
   * travels upward, but the edge doing the travelling is raked over by 40°.
   *
   * Positive is clockwise on screen (y grows downward). Any value is accepted
   * and wrapped; the sweep always starts with the whole screen covered and ends
   * with none of it, whatever the angle.
   */
  angleDeg: number;
  /** Outline the old screen collapses into. `iris` only. */
  shape: ThemeTransitionShape;
  /**
   * How many parallel slabs the screen is cut into. `blinds` only.
   *
   * Each slab wipes across itself, all at the same time, so a higher count
   * reads as finer louvres. Clamped to a sane range natively.
   */
  bands: number;
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
