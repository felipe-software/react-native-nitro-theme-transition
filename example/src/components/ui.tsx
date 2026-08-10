/**
 * The app's shared primitives.
 *
 * Nothing here is part of the library — it is ordinary React Native, re-styled
 * from the theme tokens on every render. That is the point: the package does not
 * care how the UI is built, only that the change is synchronous.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/store';
import type { Theme, ThemeName } from '@/theme/themes';
import { parkOriginFromEvent } from '@/theme/transition';

export type IoniconName = keyof typeof Ionicons.glyphMap;

/* -------------------------------------------------------------------------- */
/* Layout                                                                     */
/* -------------------------------------------------------------------------- */

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles(makeStyles);

  const content: StyleProp<ViewStyle> = [
    padded && styles.padded,
    // The native tab bar overlays the content on iOS 26; the inset keeps the
    // last card reachable.
    { paddingBottom: 32 + insets.bottom },
  ];

  if (!scroll) {
    return <View style={[styles.screen, content, style]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.screen, style]}
      contentContainerStyle={content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      indicatorStyle={theme.isDark ? 'white' : 'black'}
    >
      {children}
    </ScrollView>
  );
}

export function Card({
  title,
  subtitle,
  icon,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  icon?: IoniconName;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.card, style]}>
      {(title || subtitle) && (
        <View style={styles.cardHeader}>
          {icon && (
            <View style={styles.cardIcon}>
              <Ionicons name={icon} size={16} color={theme.tint} />
            </View>
          )}
          <View style={styles.flex}>
            {title && <Text style={styles.cardTitle}>{title}</Text>}
            {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
    </View>
  );
}

export function Row({
  children,
  gap = 8,
  wrap = false,
  align = 'center',
  style,
}: {
  children: ReactNode;
  gap?: number;
  wrap?: boolean;
  align?: ViewStyle['alignItems'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        { alignItems: align, flexDirection: 'row', flexWrap: wrap ? 'wrap' : 'nowrap', gap },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  const styles = useStyles(makeStyles);
  return <View style={styles.divider} />;
}

/* -------------------------------------------------------------------------- */
/* Type                                                                       */
/* -------------------------------------------------------------------------- */

export function Title({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <Text style={styles.title}>{children}</Text>;
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles(makeStyles);
  return <Text style={[styles.section, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const styles = useStyles(makeStyles);
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Hint({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <Text style={styles.hint}>{children}</Text>;
}

export function Code({ children }: { children: string }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.code}>
      <Text style={styles.codeText}>{children}</Text>
    </View>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn' | 'good';
  title?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  const color = tone === 'warn' ? theme.danger : tone === 'good' ? theme.success : theme.accent;
  const icon: IoniconName =
    tone === 'warn' ? 'warning-outline' : tone === 'good' ? 'checkmark-circle-outline' : 'information-circle-outline';

  return (
    <View style={[styles.callout, { borderLeftColor: color }]}>
      <Row gap={8} align="flex-start">
        <Ionicons name={icon} size={16} color={color} style={styles.calloutIcon} />
        <View style={styles.flex}>
          {title && <Text style={[styles.calloutTitle, { color }]}>{title}</Text>}
          <Text style={styles.calloutBody}>{children}</Text>
        </View>
      </Row>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every control that can start a theme change wraps its press in this, so the
 * touch point is parked before any handler runs.
 *
 * `onTouchStart` rather than `onPress` is deliberate: RN touch events bubble, so
 * a wrapping row still sees the coordinate even for children that report only a
 * value (a `Switch` reports a boolean and nothing else).
 */
export function OriginTracker({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style} onTouchStart={parkOriginFromEvent}>
      {children}
    </View>
  );
}

export function Button({
  label,
  icon,
  variant = 'primary',
  style,
  ...rest
}: {
  label: string;
  icon?: IoniconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
} & Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.surfaceAlt
          : 'transparent';

  const foreground =
    variant === 'primary'
      ? theme.onPrimary
      : variant === 'danger'
        ? '#FFFFFF'
        : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      onTouchStart={parkOriginFromEvent}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        variant === 'ghost' && styles.buttonGhost,
        pressed && styles.pressed,
        style,
      ]}
      {...rest}
    >
      {icon && <Ionicons name={icon} size={17} color={foreground} />}
      <Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active = false,
  icon,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  icon?: IoniconName;
  onPress?: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onTouchStart={parkOriginFromEvent}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed, style]}
    >
      {icon && (
        <Ionicons name={icon} size={14} color={active ? theme.onPrimary : theme.muted} />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

/**
 * A wrapping two-column grid of {@link Tile}s.
 *
 * Exists because `Row` is the wrong container for these. Its `alignItems`
 * defaults to `center`, so tiles of different heights — and they always differ,
 * because the hints differ — floated at their own size within each line, leaving
 * ragged gaps above and below the shorter ones. `stretch` makes every tile in a
 * line take the height of the tallest, which is what a grid is supposed to do.
 */
export function TileGrid({ children }: { children: ReactNode }) {
  const styles = useStyles(makeStyles);
  return <View style={styles.grid}>{children}</View>;
}

export function Tile({
  title,
  hint,
  icon,
  active = false,
  onPress,
}: {
  title: string;
  hint?: string;
  icon?: IoniconName;
  active?: boolean;
  onPress?: PressableProps['onPress'];
}) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onTouchStart={parkOriginFromEvent}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, active && styles.tileActive, pressed && styles.pressed]}
    >
      <View style={styles.tileHead}>
        <View style={[styles.tileIcon, active && styles.tileIconActive]}>
          {icon && (
            <Ionicons name={icon} size={16} color={active ? theme.onPrimary : theme.muted} />
          )}
        </View>
        {active && <Ionicons name="checkmark-circle" size={17} color={theme.tint} />}
      </View>

      <Text style={[styles.tileTitle, active && { color: theme.tint }]} numberOfLines={1}>
        {title}
      </Text>
      {/*
        Clamped rather than left to run: a tile two lines taller than its
        neighbour is what made the grid look ragged in the first place, and the
        long-form explanation belongs in the section below it, not in a chip.
      */}
      {hint && (
        <Text style={styles.tileHint} numberOfLines={2}>
          {hint}
        </Text>
      )}
    </Pressable>
  );
}

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: ok ? theme.success : theme.danger }]} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The stylesheet for a factory under the current theme.
 *
 * ── Why this is cached across components, not per component ──
 * This used to be `useMemo(() => factory(theme), [factory, theme])`, which
 * memoises per component INSTANCE. That is the wrong axis. A theme change
 * invalidates every one of those memos at once, so the app rebuilt one full
 * `StyleSheet` per mounted component that reads styles — thirty-nine call sites,
 * each producing a sheet of twenty to forty entries. A screen with sixty of
 * those instances rebuilt a couple of thousand style objects per change, and a
 * user flicking the toggle multiplied that by the tap rate. That is JavaScript
 * work, on the JS thread, at exactly the moment the JS thread also has to
 * reconcile and commit the whole tree.
 *
 * The results depend only on `(factory, theme)`, and there are four themes. So
 * they are cached on that pair: each sheet is built once for the lifetime of the
 * app, and every later theme change is a map lookup. Components still re-render
 * — their colours really did change — but the render itself is now free, and the
 * style objects are referentially stable, which lets the renderer diff them
 * cheaply too.
 *
 * A production styling runtime (Unistyles, and every StyleSheet-based library)
 * does exactly this. The mechanism does not matter to the transition library,
 * only that the swap runs synchronously inside the callback.
 */
const sheets = new WeakMap<(theme: Theme) => unknown, Map<ThemeName, unknown>>();

function stylesFor<T>(factory: (theme: Theme) => T, theme: Theme): T {
  let byTheme = sheets.get(factory);

  if (!byTheme) {
    byTheme = new Map();
    sheets.set(factory, byTheme);
  }

  if (!byTheme.has(theme.name)) {
    byTheme.set(theme.name, factory(theme));
  }

  return byTheme.get(theme.name) as T;
}

export function useStyles<T>(factory: (theme: Theme) => T): T {
  return stylesFor(factory, useTheme());
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    badgeText: { color: theme.muted, fontSize: 13 },
    body: { color: theme.text, fontSize: 14, lineHeight: 21 },
    button: {
      alignItems: 'center',
      borderRadius: 12,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    buttonGhost: { borderColor: theme.border, borderWidth: 1 },
    buttonText: { fontSize: 15, fontWeight: '600' },
    callout: {
      backgroundColor: theme.surface,
      borderLeftWidth: 3,
      borderRadius: 10,
      marginTop: 12,
      padding: 12,
    },
    calloutBody: { color: theme.muted, fontSize: 13, lineHeight: 19 },
    calloutIcon: { marginTop: 1 },
    calloutTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    card: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      borderWidth: 1,
      gap: 10,
      marginTop: 16,
      padding: 16,
    },
    cardHeader: { alignItems: 'flex-start', flexDirection: 'row', gap: 10 },
    cardIcon: {
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 8,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    cardSubtitle: { color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
    cardTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
    chip: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { color: theme.muted, fontSize: 13, fontWeight: '500' },
    chipTextActive: { color: theme.onPrimary },
    code: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      padding: 12,
    },
    codeText: {
      color: theme.text,
      fontFamily: 'Menlo',
      fontSize: 11.5,
      lineHeight: 18,
    },
    divider: { backgroundColor: theme.border, height: 1, marginVertical: 12 },
    dot: { borderRadius: 4, height: 8, width: 8 },
    flex: { flex: 1 },
    hint: { color: theme.muted, fontSize: 13, lineHeight: 19 },
    padded: { paddingHorizontal: 20, paddingTop: 8 },
    pressed: { opacity: 0.65 },
    screen: { backgroundColor: theme.background, flex: 1 },
    section: { color: theme.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, marginTop: 26, textTransform: 'uppercase' },
    stat: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      flexGrow: 1,
      gap: 2,
      minWidth: 84,
      padding: 12,
    },
    statLabel: { color: theme.muted, fontSize: 11, textTransform: 'uppercase' },
    statValue: { color: theme.text, fontSize: 20, fontWeight: '700' },
    grid: {
      alignItems: 'stretch',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    tile: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 16,
      // Constant width, so selecting a tile re-colours it instead of resizing
      // it — a 1px border change nudges every tile in the row.
      borderWidth: 1.5,
      flexBasis: '47%',
      flexGrow: 1,
      gap: 7,
      minWidth: 150,
      padding: 14,
    },
    tileActive: { backgroundColor: theme.surfaceAlt, borderColor: theme.tint },
    tileHead: {
      alignItems: 'center',
      flexDirection: 'row',
      height: 28,
      justifyContent: 'space-between',
    },
    tileHint: { color: theme.muted, fontSize: 12, lineHeight: 16 },
    tileIcon: {
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 9,
      height: 28,
      justifyContent: 'center',
      width: 28,
    },
    tileIconActive: { backgroundColor: theme.tint },
    tileTitle: { color: theme.text, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
    title: { color: theme.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  });
