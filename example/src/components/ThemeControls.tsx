/**
 * The controls that actually start a theme change, in the three shapes an app
 * usually needs: a picker, a single "next" button, and an OS switch.
 */
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button, Row, useStyles, type IoniconName } from './ui';
import { useTheme, useThemeName } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { THEMES, THEME_ORDER, nextThemeName, oppositeThemeName } from '@/theme/themes';
import { cycleTheme, parkOriginFromEvent, setTheme, toggleTheme, type ChangeOptions } from '@/theme/transition';

/** Four swatches — tapping one reveals from exactly where it was tapped. */
export function ThemeSwatches({ options }: { options?: ChangeOptions }) {
  const current = useThemeName();
  const styles = useStyles(makeStyles);

  return (
    <Row gap={8} wrap>
      {THEME_ORDER.map(name => {
        const palette = THEMES[name];
        const active = name === current;

        return (
          <View
            key={name}
            // Park on touch-down: by the time `onPress` fires the store has
            // already been asked for a coordinate.
            onTouchStart={parkOriginFromEvent}
            style={styles.swatchWrap}
          >
            <Text
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTheme(name, options)}
              suppressHighlighting
              style={[
                styles.swatch,
                {
                  backgroundColor: palette.background,
                  borderColor: active ? palette.tint : palette.border,
                  borderWidth: active ? 2 : 1,
                  color: palette.text,
                },
              ]}
            >
              {palette.label}
            </Text>
          </View>
        );
      })}
    </Row>
  );
}

/** One button that steps through the four-palette cycle. */
export function CycleButton({
  options,
  icon = 'color-palette-outline',
}: {
  options?: ChangeOptions;
  icon?: IoniconName;
}) {
  const current = useThemeName();

  return (
    <Button
      icon={icon}
      label={`Switch to ${THEMES[nextThemeName(current)].label}`}
      onPress={() => cycleTheme(options)}
    />
  );
}

/**
 * The classic gotcha: a `Switch` reports only its new boolean, so there is no
 * coordinate in its own callback. The wrapping `View` catches the touch first.
 */
export function ThemeSwitch({ options }: { options?: ChangeOptions }) {
  const theme = useTheme();
  const current = useThemeName();
  const styles = useStyles(makeStyles);

  return (
    <View onTouchStart={parkOriginFromEvent} style={styles.switchRow}>
      <View style={styles.switchLabel}>
        <Text style={styles.switchTitle}>Dark mode</Text>
        <Text style={styles.switchHint}>
          Reveals from the switch — the row parks the touch, not the switch.
        </Text>
      </View>
      <Switch
        value={THEMES[current].isDark}
        onValueChange={() => toggleTheme(options)}
        thumbColor={theme.surface}
        trackColor={{ false: theme.border, true: theme.tint }}
        ios_backgroundColor={theme.border}
      />
    </View>
  );
}

/** Small readout of the current palette and where it will go next. */
export function ThemeReadout() {
  const current = useThemeName();
  const styles = useStyles(makeStyles);

  return (
    <Text style={styles.readout}>
      {THEMES[current].label} → next {THEMES[nextThemeName(current)].label} · opposite{' '}
      {THEMES[oppositeThemeName(current)].label}
    </Text>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    readout: { color: theme.muted, fontSize: 12, marginTop: 10 },
    swatch: {
      borderRadius: 999,
      fontSize: 13,
      fontWeight: '600',
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    swatchWrap: { borderRadius: 999 },
    switchHint: { color: theme.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
    switchLabel: { flex: 1, paddingRight: 12 },
    switchRow: { alignItems: 'center', flexDirection: 'row', paddingVertical: 4 },
    switchTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
  });
