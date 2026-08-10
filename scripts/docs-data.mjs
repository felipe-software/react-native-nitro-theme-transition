// Everything the demo site knows about the sixteen kinds.
//
// Kept in one place because the same facts appear in three renderings — the
// index grid, the per-effect page, and the options table on it — and the only
// thing worse than an undocumented option is one documented three ways.
//
// The applies-to lists mirror the doc comments on `ThemeTransitionConfig` in
// src/index.ts; the duration floors mirror `floorDuration` in the Kotlin and
// the `minimumDuration` switch in the Swift, which agree by design.

/** Options every kind accepts, rendered on every page. */
export const UNIVERSAL_OPTIONS = [
  {
    name: 'durationMs',
    type: 'number',
    default: '650',
    note: 'Animation length. Clamped up to this kind’s floor; <code>0</code> means no animation and is never clamped.',
  },
  {
    name: 'settleFrames',
    type: 'number',
    default: '2',
    note: 'Display frames to hold the snapshot before revealing, so the theme swap has painted underneath.',
  },
];

export const DIRECTION_VALUES = [
  ['top', 'sweeps upward — horizontal edge'],
  ['bottom', 'sweeps downward — horizontal edge (default)'],
  ['left', 'sweeps left — vertical edge'],
  ['right', 'sweeps right — vertical edge'],
];

export const SHAPE_VALUES = [
  ['circle', 'identical to <code>circularReveal</code>'],
  ['diamond', 'four-vertex rhombus'],
  ['hexagon', 'six-vertex polygon (default)'],
  ['roundedRect', 'squircle'],
];

export const BLUR_STYLE_VALUES = [
  ['uniform', 'the whole screen blurs and recedes at once (default)'],
  ['sweep', 'a wipe brings the NEW theme in out of focus and pulls it sharp'],
];

/** Option descriptions, specialised per kind where the meaning differs. */
const ORIGIN = {
  name: 'origin',
  type: '{ x: number; y: number }',
  default: 'screen centre',
  note: 'Where the effect starts, in dp. Pass a touch’s <code>pageX/pageY</code> as-is — the offset inside a modal or form sheet is corrected natively.',
};

const DIRECTION_EDGE = {
  name: 'direction',
  type: "'top' | 'bottom' | 'left' | 'right'",
  default: "'bottom'",
  note: 'The edge the outgoing screen leaves through.',
  values: DIRECTION_VALUES,
};

const DIRECTION_AXIS = {
  name: 'direction',
  type: "'top' | 'bottom' | 'left' | 'right'",
  default: "'bottom'",
  note: 'Both edges are used, so this picks the <strong>axis</strong> rather than an edge: <code>top</code>/<code>bottom</code> work horizontally, <code>left</code>/<code>right</code> vertically.',
  values: DIRECTION_VALUES,
};

const ANGLE = {
  name: 'angleDeg',
  type: 'number',
  default: '0',
  note: 'Tilt of the boundary line. The sweep still travels along <code>direction</code>; the line doing the sweeping is raked over. Positive is clockwise on screen. Any value is accepted and wrapped.',
};

export const EFFECTS = [
  {
    kind: 'fade',
    file: 'fade',
    tagline: 'Straight cross-dissolve.',
    body: 'The simplest of the sixteen, and the cheapest: the snapshot’s opacity is animated to zero and nothing else happens. There is no mask, no geometry and no per-frame work of any sort — which is why it has the lowest duration floor.',
    floor: 200,
    options: [],
    ios: '<code>UIViewPropertyAnimator</code> on opacity',
    android: '<code>ViewPropertyAnimator</code> on <code>alpha</code>',
  },
  {
    kind: 'circularReveal',
    file: 'circle-in',
    tagline: 'Collapses into a circle at your touch point.',
    body: 'The old screen shrinks into a circle centred on <code>origin</code> and disappears. Nothing translates — the pixels stay where they are and stop being drawn as the circle passes over them.',
    floor: 260,
    options: [ORIGIN],
    ios: '<code>CAShapeLayer</code> mask + <code>CABasicAnimation</code>',
    android: '<code>ViewAnimationUtils.createCircularReveal</code>',
  },
  {
    kind: 'circularRevealInverse',
    file: 'circle-out',
    tagline: 'A hole opens out from your touch and grows.',
    body: 'The same shape as <code>circularReveal</code>, run the other way round: a hole opens at <code>origin</code> and expands until the old screen is gone.',
    floor: 260,
    options: [ORIGIN],
    ios: 'the same mask, even-odd fill rule',
    android: '<code>Canvas.clipOutPath</code> in <code>onDraw</code>',
  },
  {
    kind: 'iris',
    file: 'iris',
    tagline: 'Collapses into a hexagon, diamond or squircle.',
    body: '<code>circularReveal</code> with a shape other than a circle. Every outline is a polygon with a <strong>fixed vertex count</strong> that scales linearly with the radius, which is what lets Core Animation interpolate the mask path directly.',
    floor: 260,
    options: [
      ORIGIN,
      {
        name: 'shape',
        type: "'circle' | 'diamond' | 'hexagon' | 'roundedRect'",
        default: "'hexagon'",
        note: 'The outline the old screen collapses into.',
        values: SHAPE_VALUES,
      },
    ],
    ios: 'the same mask, a fixed-vertex polygon',
    android: '<code>Canvas.clipPath</code> on the same polygon',
  },
  {
    kind: 'slide',
    file: 'wipe',
    tagline: 'A straight edge paints the new theme across.',
    body: 'A mask wipe: one straight edge sweeps across and uncovers the new theme behind it. Nothing on screen moves, so it reads as the new colours being painted across rather than the UI sliding away.',
    floor: 260,
    options: [DIRECTION_EDGE, ANGLE],
    ios: 'animated mask half-plane',
    android: '<code>Canvas.clipRect</code>, or <code>clipPath</code> if tilted',
  },
  {
    kind: 'split',
    file: 'split',
    tagline: 'Two edges part from the centre.',
    body: 'The same edge as <code>slide</code>, but two of them, parting from the centre — the old screen retreats to both opposite edges at once.',
    floor: 260,
    options: [DIRECTION_AXIS, ANGLE],
    ios: 'two animated half-planes',
    android: '<code>Canvas.clipPath</code> over both',
  },
  {
    kind: 'barnDoor',
    file: 'barn-door',
    tagline: 'Two edges close in; the old screen shrinks to a band.',
    body: '<code>split</code> run the other way: the two edges close <strong>in</strong> on the centre, so the old screen survives as a shrinking middle band.',
    floor: 260,
    options: [DIRECTION_AXIS, ANGLE],
    ios: 'one animated slab',
    android: '<code>Canvas.clipPath</code> on the same slab',
    note: 'The bands keep a hundredth of a point of thickness rather than collapsing to zero — a zero-area subpath can be dropped by Core Graphics, which changes the path’s structure between the two ends of the animation and leaves Core Animation interpolating against the wrong subpath.',
  },
  {
    kind: 'blinds',
    file: 'blinds',
    tagline: 'Parallel louvres wipe across themselves at once.',
    body: 'The screen is cut into <code>bands</code> parallel slabs and each one wipes across itself, all at the same time. A higher count reads as finer louvres.',
    floor: 300,
    options: [
      DIRECTION_AXIS,
      ANGLE,
      {
        name: 'bands',
        type: 'number',
        default: '6',
        note: 'How many parallel slabs the screen is cut into. Clamped natively to 2…24.',
      },
    ],
    ios: 'N animated slabs in one mask path',
    android: '<code>Canvas.clipPath</code> over all of them',
  },
  {
    kind: 'blur',
    file: 'blur',
    tagline: 'Blurs away, or wipes the new theme in out of focus.',
    body: 'Two quite different animations behind one kind, chosen with <code>blurStyle</code>. <code>uniform</code> blurs the whole screen at once and lets it recede. <code>sweep</code> is a wipe that brings the <strong>new</strong> theme in out of focus and pulls it sharp as it arrives — the outgoing copy is never blurred at all, it is simply taken away by the mask.',
    floor: 300,
    options: [
      {
        name: 'blurStyle',
        type: "'uniform' | 'sweep'",
        default: "'uniform'",
        note: 'How the blur applies itself.',
        values: BLUR_STYLE_VALUES,
      },
      { ...DIRECTION_EDGE, note: 'The edge the sweep travels through. <strong>Only read when <code>blurStyle</code> is <code>sweep</code></strong>; ignored under <code>uniform</code>.' },
      { ...ANGLE, note: 'Tilt of the sweep’s boundary line, exactly as <code>slide</code> takes it. <strong>Only read when <code>blurStyle</code> is <code>sweep</code></strong>.' },
    ],
    ios: '<code>UIVisualEffectView</code> + property animator',
    android: '<code>RenderEffect.createBlurEffect</code>',
    platform: 'Android needs API 31+ for <code>RenderEffect</code>; below that the blur is skipped.',
  },
  {
    kind: 'liquidGlass',
    file: 'liquid-glass',
    tagline: 'A glass sheet slides down, swaps, and slides back up.',
    body: 'A sheet of Liquid Glass slides down over the screen, holds while the theme changes behind it, then slides back up. The swap happens entirely out of sight, so the sheet reads as a physical pane rather than a reveal boundary — which is why this has the highest duration floor of the sixteen.',
    floor: 620,
    options: [ORIGIN],
    ios: 'a sliding <code>UIGlassEffect</code> sheet, swap held behind it',
    android: 'falls back to <code>blur</code>',
    platform: '<strong>iOS 26+.</strong> Every other platform and version falls back to <code>blur</code>, which is the closest material there is.',
  },
  {
    kind: 'zoom',
    file: 'zoom',
    tagline: 'The old screen scales up and fades away.',
    body: 'The snapshot scales up past the screen edges while its opacity drops. Transform and alpha only, so like <code>fade</code> there is no mask and no per-frame work.',
    floor: 240,
    options: [],
    ios: '<code>UIViewPropertyAnimator</code>, scale + alpha',
    android: '<code>ViewPropertyAnimator</code>, scale + alpha',
  },
  {
    kind: 'pixlated',
    file: 'pixlated',
    tagline: 'Colours swap behind a pixel mosaic.',
    body: 'The screen breaks into a coarse mosaic, the colour swap rides it mid-transition, and the mosaic comes back down — so neither theme is ever seen sharp mid-flight. It needs a <strong>second</strong> snapshot of the already-painted new theme, which is why the JS side yields two animation frames before committing.',
    floor: 520,
    options: [],
    ios: 'dual mosaic + alpha crossfade',
    android: 'dual mosaic + alpha crossfade',
    note: 'The one kind that is not fully submitted to the render thread up front: its two mosaics have to be cross-faded against each other frame by frame. Frames are captured straight into the mosaic grid (~200×440 rather than ~1200×2600), so the per-frame cost is an image assignment rather than a resample.',
  },
  {
    kind: 'dissolve',
    file: 'dissolve',
    tagline: 'Disintegrates into grain, speck by speck.',
    body: 'Cells drop out of the old screen in a fixed noise order until nothing is left. One of the four kinds built on the <strong>mask ladder</strong>: a stack of mask frames pre-built once, off the main thread, and cached — playing the effect is then one image assignment per frame.',
    floor: 420,
    options: [],
    ios: 'pre-built noise masks, <code>CAKeyframeAnimation</code>',
    android: '<code>ALPHA_8</code> mask composited <code>DST_IN</code>',
  },
  {
    kind: 'stripes',
    file: 'stripes',
    tagline: 'A grainy edge sweeps across, cell by cell.',
    body: '<code>dissolve</code>’s grain, ordered along <code>direction</code> instead of at random — a grainy edge sweeping across rather than a uniform disintegration.',
    floor: 420,
    options: [
      {
        ...DIRECTION_AXIS,
        note: 'The axis the grain is ordered along. Note that <code>angleDeg</code> does <strong>not</strong> apply to this kind — the ladder is built per axis, not per angle.',
      },
    ],
    ios: 'the same mask ladder, ordered along the direction',
    android: 'the same mask ladder, ordered along the direction',
  },
  {
    kind: 'ripple',
    file: 'ripple',
    tagline: 'Wavefronts expand from where you tapped.',
    body: 'The same mask ladder as <code>dissolve</code>, with its cells ordered by distance from <code>origin</code> — so the grain leaves as concentric wavefronts rather than at random.',
    floor: 480,
    options: [ORIGIN],
    ios: 'the same mask ladder, ordered by distance from the origin',
    android: 'the same mask ladder, ordered by distance from the origin',
  },
  {
    kind: 'shatter',
    file: 'shatter',
    tagline: 'Breaks into shards that fall away in turn.',
    body: 'The mask ladder again, but its cells are Voronoi shards rather than grain, dropped in random order — so the screen reads as breaking apart rather than dissolving.',
    floor: 480,
    options: [],
    ios: 'the same mask ladder, Voronoi cells in random order',
    android: 'the same mask ladder, Voronoi cells in random order',
  },
];
