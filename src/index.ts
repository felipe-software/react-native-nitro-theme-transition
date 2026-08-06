import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type {
  ThemeTransition,
  ThemeTransitionDirection,
  ThemeTransitionKind,
  ThemeTransitionShape,
} from './specs/ThemeTransition.nitro';

export type {
  ThemeTransition,
  ThemeTransitionDirection,
  ThemeTransitionKind,
  ThemeTransitionShape,
};

/** Everything is optional at the call site; these fill the gaps. */
export type ThemeTransitionConfig = {
  kind?: ThemeTransitionKind;
  /**
   * Animation length in milliseconds. Defaults to 650.
   *
   * There is a floor, applied natively so both platforms agree: 200ms for
   * `fade`, 260ms for the reveals and `slide`, 300ms for `blur`, 520ms for
   * `pixlated`. Below those a full-screen copy coming apart does not have enough
   * frames to read as motion — the eye gets the start and the end and nothing
   * between them, which looks like a flicker with a hard edge in it rather than
   * a fast transition. `pixlated` is the highest because it has to grow a
   * mosaic, swap the colours behind it and take the mosaic back down again.
   *
   * Pass `0` to opt out entirely: that still means "no animation" and is not
   * clamped.
   */
  durationMs?: number;
  /**
   * Centre of the circle for `circularReveal` / `circularRevealInverse`, in dp.
   * Omit for the centre of the screen.
   *
   * Pass a touch event's `pageX/pageY` as-is. React Native reports those relative
   * to the surface the touch happened in, and a presented screen — a modal, a
   * form sheet — is its own surface, so inside one they are offset from the
   * window. The snapshot covers the window, but the correction is applied
   * natively: only UIKit knows where a sheet currently sits, and it re-reads that
   * on every capture, so any detent works with no help from the caller.
   *
   * ```ts
   * const { pageX, pageY } = event.nativeEvent;
   * withThemeTransition(applyTheme, { origin: { x: pageX, y: pageY } });
   * ```
   */
  origin?: { x: number; y: number };
  /**
   * Edge the outgoing screen leaves through — `slide` and `split`.
   * `'bottom'` drops the old screen off the bottom edge.
   *
   * `split` uses both edges at once, so this picks the axis instead:
   * `'top'`/`'bottom'` part the screen horizontally, `'left'`/`'right'`
   * vertically.
   */
  direction?: ThemeTransitionDirection;
  /**
   * Tilt of the boundary line in degrees — `slide` and `split`. Defaults to 0,
   * the axis-aligned edge.
   *
   * The sweep still travels along `direction`; the line doing the sweeping is
   * raked over. `{ direction: 'top', angleDeg: 40 }` leaves through the top with
   * a 40° diagonal edge rather than a level one. Positive is clockwise on
   * screen, and the sweep always ends fully uncovered whatever the angle.
   */
  angleDeg?: number;
  /**
   * Outline the old screen collapses into — `iris` only. Defaults to
   * `'hexagon'`.
   *
   * `'circle'` makes `iris` identical to `circularReveal`, which is why that
   * kind is still the one to reach for when a circle is what you want.
   */
  shape?: ThemeTransitionShape;
  /**
   * How many parallel slabs the screen is cut into — `blinds` only. Defaults to
   * 6, and is clamped natively to 2…24.
   *
   * Each slab wipes across itself at the same time, so a higher count reads as
   * finer louvres.
   */
  bands?: number;
  /**
   * Display frames to hold the snapshot before revealing, so the theme swap has
   * painted underneath. Two is enough in practice: Unistyles commits on the JS
   * thread and mounts on the next main-thread pass.
   */
  settleFrames?: number;
};

const DEFAULTS = {
  kind: 'circularReveal' as ThemeTransitionKind,
  direction: 'bottom' as ThemeTransitionDirection,
  /**
   * 650ms, not the 300–400ms a UI animation usually wants.
   *
   * This is not a fade between two frames of the same screen — it is a copy of
   * the whole app being taken apart to reveal a different one, and the eye needs
   * time to read that. Below ~500ms the reveal stops being a transition between
   * two states and starts reading as a flicker, however even the easing curve is.
   * Shorten it deliberately if you want that, but it is not a good default.
   *
   * The native side will not go below a per-kind floor — see `durationMs` on
   * {@link ThemeTransitionConfig}.
   */
  durationMs: 650,
  settleFrames: 2,
  angleDeg: 0,
  shape: 'hexagon' as ThemeTransitionShape,
  bands: 6,
};

/** Every kind the native side implements, for building pickers. */
export const THEME_TRANSITION_KINDS = [
  'fade',
  'circularReveal',
  'circularRevealInverse',
  'iris',
  'slide',
  'split',
  'barnDoor',
  'blinds',
  'blur',
  'zoom',
  'pixlated',
  'dissolve',
  'stripes',
  'ripple',
  'shatter',
] as const satisfies readonly ThemeTransitionKind[];

/** Every `iris` outline, for building pickers. */
export const THEME_TRANSITION_SHAPES = [
  'circle',
  'diamond',
  'hexagon',
  'roundedRect',
] as const satisfies readonly ThemeTransitionShape[];

export const THEME_TRANSITION_DIRECTIONS = [
  'top',
  'bottom',
  'left',
  'right',
] as const satisfies readonly ThemeTransitionDirection[];

/**
 * The native hybrid object, or `null` where it cannot exist.
 *
 * Resolved lazily and defensively: a JS bundle can run against a native binary
 * that predates this package (any dev client built before it was added), and a
 * missing native module must degrade to "no animation", never to a crash.
 */
let cached: ThemeTransition | null | undefined;

function getNative(): ThemeTransition | null {
  if (cached !== undefined) return cached;

  // iOS and Android both have an implementation; web has no native side at all.
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }

  try {
    cached = NitroModules.createHybridObject<ThemeTransition>('ThemeTransition');
  } catch {
    cached = null;
  }

  return cached;
}

/** Whether an animated switch is actually available on this build. */
export function isThemeTransitionAvailable(): boolean {
  return getNative() !== null;
}

/**
 * Runs `applyTheme` underneath a snapshot of the current screen, then animates
 * the snapshot away.
 *
 * `applyTheme` MUST be synchronous. It is invoked while the screen is covered,
 * and the reveal is scheduled from native frame callbacks — an async mutation
 * would land after the reveal had already started.
 *
 * Safe by construction: if the native module is unavailable, or the capture
 * fails, `applyTheme` still runs exactly once, just without animation. It is
 * never skipped and never run twice.
 */
export function withThemeTransition(applyTheme: () => void, config: ThemeTransitionConfig = {}) {
  const native = getNative();

  if (!native) {
    applyTheme();
    return;
  }

  let captured = false;

  try {
    captured = native.begin();
  } catch {
    captured = false;
  }

  // The theme change happens either way — the snapshot only decides whether it
  // is visible while it happens.
  try {
    applyTheme();
  } catch (error) {
    // Never strand the overlay on top of the app if the caller threw.
    if (captured) {
      try {
        native.abort();
      } catch {
        // nothing further we can do
      }
    }
    throw error;
  }

  if (!captured) return;

  const origin = config.origin;
  const kind = config.kind ?? DEFAULTS.kind;
  const durationMs = config.durationMs ?? DEFAULTS.durationMs;
  const settleFrames = config.settleFrames ?? DEFAULTS.settleFrames;

  const doCommit = () => {
    void native
      .commit({
        kind,
        durationMs,
        // Negative means "centre of the screen" on the native side.
        originX: origin?.x ?? -1,
        originY: origin?.y ?? -1,
        settleFrames,
        direction: config.direction ?? DEFAULTS.direction,
        angleDeg: config.angleDeg ?? DEFAULTS.angleDeg,
        shape: config.shape ?? DEFAULTS.shape,
        bands: config.bands ?? DEFAULTS.bands,
      })
      .catch(() => {
        try {
          native.abort();
        } catch {
          // nothing further we can do
        }
      });
  };

  // Pixelize needs a second snapshot of the *already painted* new theme.
  // Yield two animation frames so React (useSyncExternalStore / context)
  // can commit before native settle + capture starts — otherwise old≈new.
  if (kind === 'pixlated') {
    requestAnimationFrame(() => {
      requestAnimationFrame(doCommit);
    });
  } else {
    doCommit();
  }
}
