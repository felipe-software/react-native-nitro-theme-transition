import { Platform } from 'react-native';
import { NitroModules } from 'react-native-nitro-modules';
import type {
  ThemeTransition,
  ThemeTransitionDirection,
  ThemeTransitionKind,
} from './specs/ThemeTransition.nitro';

export type { ThemeTransition, ThemeTransitionDirection, ThemeTransitionKind };

/** Everything is optional at the call site; these fill the gaps. */
export type ThemeTransitionConfig = {
  kind?: ThemeTransitionKind;
  durationMs?: number;
  /**
   * Centre of the circle for `circularReveal` / `circularRevealInverse`, in dp.
   * Omit for the centre of the screen.
   */
  origin?: { x: number; y: number };
  /**
   * Edge the outgoing screen leaves through — `slide` only.
   * `'bottom'` drops the old screen off the bottom edge.
   */
  direction?: ThemeTransitionDirection;
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
  durationMs: 400,
  settleFrames: 2,
};

/** Every kind the native side implements, for building pickers. */
export const THEME_TRANSITION_KINDS = [
  'fade',
  'circularReveal',
  'circularRevealInverse',
  'slide',
  'blur',
] as const satisfies readonly ThemeTransitionKind[];

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

  void native
    .commit({
      kind: config.kind ?? DEFAULTS.kind,
      durationMs: config.durationMs ?? DEFAULTS.durationMs,
      // Negative means "centre of the screen" on the native side.
      originX: origin?.x ?? -1,
      originY: origin?.y ?? -1,
      settleFrames: config.settleFrames ?? DEFAULTS.settleFrames,
      direction: config.direction ?? DEFAULTS.direction,
    })
    .catch(() => {
      try {
        native.abort();
      } catch {
        // nothing further we can do
      }
    });
}
