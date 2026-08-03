/**
 * react-native-nitro-theme-transition — example app.
 *
 * Deliberately uses NOTHING but React state and React Native's own StyleSheet:
 * no Unistyles, no styling library, no animation library. The package does not
 * know what a theme is — it snapshots the screen, runs your callback, and
 * animates the snapshot away — so any mechanism that changes the UI works.
 */
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import {
  isThemeTransitionAvailable,
  withThemeTransition,
  THEME_TRANSITION_DIRECTIONS,
  THEME_TRANSITION_KINDS,
  type ThemeTransitionDirection,
  type ThemeTransitionKind,
} from 'react-native-nitro-theme-transition';

const THEMES = {
  light: {
    background: '#F6F3EE',
    surface: '#FFFFFF',
    text: '#211D19',
    muted: '#756D62',
    border: '#E6E0D6',
    primary: '#211D19',
    onPrimary: '#F6F3EE',
  },
  dark: {
    background: '#141210',
    surface: '#1E1B18',
    text: '#F2EDE4',
    muted: '#A8A096',
    border: '#2E2A26',
    primary: '#EDE6DB',
    onPrimary: '#141210',
  },
} as const;

type Scheme = keyof typeof THEMES;

const LABELS: Record<ThemeTransitionKind, string> = {
  circularReveal: 'Circle in',
  circularRevealInverse: 'Circle out',
  slide: 'Wipe',
  fade: 'Fade',
  blur: 'Blur',
};

const HINTS: Record<ThemeTransitionKind, string> = {
  circularReveal: 'Old screen shrinks into a circle where you tapped',
  circularRevealInverse: 'New theme spreads out from where you tapped',
  slide: 'A straight edge paints the new theme across',
  fade: 'Straight cross-dissolve',
  blur: 'Blurs and recedes as it dissolves',
};

/**
 * Long enough to actually watch each effect. Production apps want something
 * closer to 300–450ms.
 */
const DURATION_MS = 700;

/**
 * How many frames the snapshot is held before the reveal starts, so the new
 * theme has painted underneath it.
 *
 * The default is 2, which suits a theme system that applies SYNCHRONOUSLY. This
 * example drives the theme with `useState`, so React only *schedules* the
 * re-render when the callback returns — it still has to reconcile, commit and
 * paint. Three frames covers that; revealing too early would briefly animate
 * down to the OLD colours.
 */
const SETTLE_FRAMES = 3;

export default function App() {
  const [scheme, setScheme] = useState<Scheme>('light');
  const [kind, setKind] = useState<ThemeTransitionKind>('circularReveal');
  const [direction, setDirection] = useState<ThemeTransitionDirection>('bottom');

  const theme = THEMES[scheme];
  const styles = makeStyles(theme);
  const available = isThemeTransitionAvailable();

  /** Flips the theme behind the chosen animation, starting from the touch point. */
  function toggle(event: GestureResponderEvent, nextKind: ThemeTransitionKind = kind) {
    const { pageX, pageY } = event.nativeEvent;

    withThemeTransition(
      () => {
        // Must be synchronous — it runs while the screen is covered.
        setScheme(current => (current === 'light' ? 'dark' : 'light'));
      },
      {
        kind: nextKind,
        direction,
        durationMs: DURATION_MS,
        settleFrames: SETTLE_FRAMES,
        origin: { x: pageX, y: pageY },
      },
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Theme Transition</Text>
        <Text style={styles.subtitle}>
          Native, GPU-driven theme switching. No Skia, no Reanimated, no JS animation library.
        </Text>

        <View style={styles.badge}>
          <View style={[styles.dot, !available && styles.dotOff]} />
          <Text style={styles.badgeText}>
            {available ? 'Native module ready' : 'Unavailable — switches instantly'}
          </Text>
        </View>

        <Text style={styles.section}>Animation</Text>
        <Text style={styles.sectionHint}>Tap any one to select it and play it straight away.</Text>

        <View style={styles.grid}>
          {THEME_TRANSITION_KINDS.map(option => {
            const active = option === kind;

            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={event => {
                  setKind(option);
                  toggle(event, option);
                }}
                style={({ pressed }) => [
                  styles.tile,
                  active && styles.tileActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.tileTitle, active && styles.tileTitleActive]}>
                  {LABELS[option]}
                </Text>
                <Text style={styles.tileHint}>{HINTS[option]}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Only the wipe travels anywhere. */}
        {kind === 'slide' && (
          <>
            <Text style={styles.section}>Wipe direction</Text>
            <View style={styles.row}>
              {THEME_TRANSITION_DIRECTIONS.map(option => {
                const active = option === direction;

                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={event => {
                      setDirection(option);
                      toggle(event);
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      active && styles.chipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={event => toggle(event)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>Switch to {scheme === 'light' ? 'dark' : 'light'}</Text>
        </Pressable>

        <Text style={styles.footer}>
          Switch again mid-animation — nothing is cancelled. Each change gets its own snapshot and
          they play at the same time.
        </Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: (typeof THEMES)[Scheme]) {
  return StyleSheet.create({
    badge: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      marginTop: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    badgeText: { color: theme.muted, fontSize: 13 },
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 14,
      marginTop: 32,
      paddingVertical: 18,
    },
    buttonText: { color: theme.onPrimary, fontSize: 16, fontWeight: '600' },
    chip: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      flex: 1,
      paddingVertical: 12,
    },
    chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { color: theme.muted, fontSize: 13, textAlign: 'center' },
    chipTextActive: { color: theme.onPrimary },
    content: { padding: 24, paddingBottom: 64, paddingTop: 72 },
    dot: { backgroundColor: '#3E7C4F', borderRadius: 4, height: 8, width: 8 },
    dotOff: { backgroundColor: '#B23B34' },
    footer: { color: theme.muted, fontSize: 13, lineHeight: 20, marginTop: 28 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    pressed: { opacity: 0.7 },
    root: { backgroundColor: theme.background, flex: 1 },
    row: { flexDirection: 'row', gap: 8, marginTop: 12 },
    section: { color: theme.text, fontSize: 18, fontWeight: '600', marginTop: 32 },
    sectionHint: { color: theme.muted, fontSize: 13, marginTop: 4 },
    subtitle: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
    tile: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      flexBasis: '48%',
      flexGrow: 1,
      gap: 4,
      padding: 14,
    },
    tileActive: { borderColor: theme.primary, borderWidth: 2 },
    tileHint: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    tileTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
    tileTitleActive: { color: theme.primary },
    title: { color: theme.text, fontSize: 32, fontWeight: '700' },
  });
}
