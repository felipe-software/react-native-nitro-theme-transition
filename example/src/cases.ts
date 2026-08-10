/**
 * The case registry.
 *
 * One entry per screen under `app/(drawer)/(tabs)/cases/`. Kept in a plain array
 * so the case list, the drawer and the search-free "next case" links all agree.
 */
import type { IoniconName } from './components/ui';

export type CaseGroup = 'Behaviour' | 'Navigation' | 'Content' | 'Safety';

export type CaseEntry = {
  /** File name under `cases/`, and the last path segment. */
  slug: string;
  title: string;
  summary: string;
  icon: IoniconName;
  group: CaseGroup;
  /** Shown as a small tag — the thing this screen is really testing. */
  tag: string;
};

export const CASES: readonly CaseEntry[] = [
  {
    slug: 'origin',
    title: 'Reveal origin',
    summary: 'Park the touch point, consume it once, expire it after 250ms.',
    icon: 'locate-outline',
    group: 'Behaviour',
    tag: 'origin',
  },
  {
    slug: 'controls',
    title: 'Controls that toggle',
    summary: 'Switches, segmented rows and list rows — onTouchStart, not onPress.',
    icon: 'toggle-outline',
    group: 'Behaviour',
    tag: 'events',
  },
  {
    slug: 'stacking',
    title: 'Rapid switching',
    summary: 'Six overlays at once. Nothing is cancelled, nothing flickers.',
    icon: 'layers-outline',
    group: 'Behaviour',
    tag: 'concurrency',
  },
  {
    slug: 'js-load',
    title: 'Blocked JS thread',
    summary: 'Burn the JS thread mid-transition; the animation does not care.',
    icon: 'speedometer-outline',
    group: 'Behaviour',
    tag: 'render thread',
  },
  {
    slug: 'settle',
    title: 'Settle frames',
    summary: 'Too few frames and the old colours flash back mid-reveal.',
    icon: 'timer-outline',
    group: 'Behaviour',
    tag: 'timing',
  },
  {
    slug: 'modal',
    title: 'Modals & sheets',
    summary: 'Captured on iOS, where a presentation shares the app’s window. Not on Android.',
    icon: 'albums-outline',
    group: 'Navigation',
    tag: 'windows',
  },
  {
    slug: 'drawer',
    title: 'Drawer',
    summary: 'Switch with the drawer open, and from inside the drawer itself.',
    icon: 'menu-outline',
    group: 'Navigation',
    tag: 'overlay',
  },
  {
    slug: 'navigation',
    title: 'Navigating mid-transition',
    summary: 'Push, pop and switch tabs while a snapshot is still animating.',
    icon: 'git-branch-outline',
    group: 'Navigation',
    tag: 'routing',
  },
  {
    slug: 'chrome',
    title: 'System chrome',
    summary: 'Status bar, tab bar and native headers — what is inside the capture.',
    icon: 'phone-portrait-outline',
    group: 'Navigation',
    tag: 'capture bounds',
  },
  {
    slug: 'scroll',
    title: 'Scrolling & frozen pixels',
    summary: 'The overlay is a still. Fling the list, then switch, and watch.',
    icon: 'swap-vertical-outline',
    group: 'Content',
    tag: 'known limit',
  },
  {
    slug: 'lists',
    title: 'Long lists & images',
    summary: 'A heavy FlatList re-themed under the snapshot.',
    icon: 'list-outline',
    group: 'Content',
    tag: 'scale',
  },
  {
    slug: 'keyboard',
    title: 'Keyboard & inputs',
    summary: 'Switch with the keyboard up and a field focused.',
    icon: 'create-outline',
    group: 'Content',
    tag: 'focus',
  },
  {
    slug: 'surfaces',
    title: 'Native surfaces',
    summary: 'SwiftUI/Compose hosts, blur views and images inside the snapshot.',
    icon: 'cube-outline',
    group: 'Content',
    tag: 'native views',
  },
  {
    slug: 'reduce-motion',
    title: 'Reduce Motion',
    summary: 'Accessibility is the app’s job — here is the whole policy.',
    icon: 'accessibility-outline',
    group: 'Safety',
    tag: 'a11y',
  },
  {
    slug: 'availability',
    title: 'Fallbacks & errors',
    summary: 'No native module, a throwing callback, an aborted capture.',
    icon: 'shield-checkmark-outline',
    group: 'Safety',
    tag: 'degradation',
  },
  {
    slug: 'rotation',
    title: 'Rotation & resize',
    summary: 'Rotate the device mid-transition. Documented as unverified.',
    icon: 'sync-outline',
    group: 'Safety',
    tag: 'unverified',
  },
];

export const CASE_GROUPS: readonly CaseGroup[] = ['Behaviour', 'Navigation', 'Content', 'Safety'];

export function caseBySlug(slug: string): CaseEntry | undefined {
  return CASES.find(entry => entry.slug === slug);
}
