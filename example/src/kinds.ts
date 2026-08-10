/** Display metadata for every effect, wipe direction and iris shape. */
import type {
  ThemeTransitionBlurStyle,
  ThemeTransitionDirection,
  ThemeTransitionKind,
  ThemeTransitionShape,
} from 'react-native-nitro-theme-transition';

import type { IoniconName } from './components/ui';

export const KIND_META: Record<
  ThemeTransitionKind,
  { label: string; hint: string; icon: IoniconName; native: string }
> = {
  fade: {
    label: 'Fade',
    hint: 'Straight cross-dissolve.',
    icon: 'contrast-outline',
    native: 'UIViewPropertyAnimator on alpha · ValueAnimator on alpha',
  },
  circularReveal: {
    label: 'Circle in',
    hint: 'Shrinks into a circle at your touch.',
    icon: 'radio-button-on-outline',
    native: 'CAShapeLayer mask · ViewAnimationUtils.createCircularReveal',
  },
  circularRevealInverse: {
    label: 'Circle out',
    hint: 'Spreads out from your touch.',
    icon: 'aperture-outline',
    native: 'evenOdd mask path · Canvas.clipOutPath in onDraw',
  },
  iris: {
    label: 'Iris',
    hint: 'Collapses into a hexagon, diamond or squircle.',
    icon: 'shapes-outline',
    native: 'fixed-vertex polygon mask · same outline on both platforms',
  },
  slide: {
    label: 'Wipe',
    hint: 'A straight edge paints the new theme across.',
    icon: 'swap-horizontal-outline',
    native: 'animated mask path · Canvas.clipRect / clipPath in onDraw',
  },
  split: {
    label: 'Split',
    hint: 'Two edges part from the centre.',
    icon: 'contract-outline',
    native: 'two animated half-planes · same geometry on both platforms',
  },
  barnDoor: {
    label: 'Barn door',
    hint: 'Two edges close in; the old screen shrinks to a band.',
    icon: 'expand-outline',
    native: 'one animated slab · split run the other way',
  },
  blinds: {
    label: 'Blinds',
    hint: 'Parallel louvres wipe across themselves at once.',
    icon: 'menu-outline',
    native: 'N animated slabs · SweepGeometry.addSlab',
  },
  blur: {
    label: 'Blur',
    hint: 'Blurs away, or wipes the new theme in out of focus.',
    icon: 'water-outline',
    native: 'UIVisualEffectView · RenderEffect.createBlurEffect (API 31+)',
  },
  liquidGlass: {
    label: 'Liquid glass',
    hint: 'A glass sheet slides down, swaps, and slides back up.',
    icon: 'prism-outline',
    native: 'UIGlassEffect (iOS 26+) · falls back to blur elsewhere',
  },
  zoom: {
    label: 'Zoom',
    hint: 'The old screen scales up and fades away.',
    icon: 'scan-outline',
    native: 'transform + alpha · RenderThread on both platforms',
  },
  pixlated: {
    label: 'Pixlated',
    hint: 'Colours swap behind a pixel mosaic.',
    icon: 'grid-outline',
    native: 'dual mosaic crossfade (Skia pixelize look) · both platforms',
  },
  dissolve: {
    label: 'Dissolve',
    hint: 'Disintegrates into grain, speck by speck.',
    icon: 'sparkles-outline',
    native: 'pre-built noise masks · CAKeyframeAnimation · DST_IN mask',
  },
  stripes: {
    label: 'Stripes',
    hint: 'A grainy edge sweeps across, cell by cell.',
    icon: 'reorder-four-outline',
    native: 'same mask ladder, ordered along the direction',
  },
  ripple: {
    label: 'Ripple',
    hint: 'Wavefronts expand from where you tapped.',
    icon: 'radio-outline',
    native: 'same mask ladder, ordered by distance from the origin',
  },
  shatter: {
    label: 'Shatter',
    hint: 'Breaks into shards that fall away in turn.',
    icon: 'diamond-outline',
    native: 'same mask ladder, Voronoi cells in random order',
  },
};

export const BLUR_STYLE_META: Record<
  ThemeTransitionBlurStyle,
  { label: string; icon: IoniconName }
> = {
  uniform: { label: 'All at once', icon: 'water-outline' },
  sweep: { label: 'Swept', icon: 'arrow-down-outline' },
};

export const SHAPE_META: Record<ThemeTransitionShape, { label: string; icon: IoniconName }> = {
  circle: { label: 'Circle', icon: 'ellipse-outline' },
  diamond: { label: 'Diamond', icon: 'diamond-outline' },
  hexagon: { label: 'Hexagon', icon: 'shapes-outline' },
  roundedRect: { label: 'Squircle', icon: 'square-outline' },
};

export const DIRECTION_META: Record<ThemeTransitionDirection, { label: string; icon: IoniconName }> =
  {
    top: { label: 'Top', icon: 'arrow-up-outline' },
    bottom: { label: 'Bottom', icon: 'arrow-down-outline' },
    left: { label: 'Left', icon: 'arrow-back-outline' },
    right: { label: 'Right', icon: 'arrow-forward-outline' },
  };
