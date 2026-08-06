/**
 * Case: the controls that start a theme change.
 *
 * Three shapes, three different ways of getting an origin:
 *
 *   1. a `Pressable` — the press event carries the coordinate;
 *   2. an RN `Switch` — reports only a boolean, so the wrapping row parks it;
 *   3. a NATIVE SwiftUI/Compose control — produces no RN touch at all, so the
 *      origin has to be measured instead.
 */
import { Host, Picker, Switch as NativeSwitch } from '@expo/ui';
import { useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Callout,
  Card,
  Code,
  Divider,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import { THEMES, THEME_ORDER, oppositeThemeName } from '@/theme/themes';
import { useTheme, useThemeName } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { parkOrigin, parkOriginFromEvent, setTheme, toggleTheme } from '@/theme/transition';

export default function ControlsCase() {
  const theme = useTheme();
  const themeName = useThemeName();
  const styles = useStyles(makeStyles);
  const nativeRowRef = useRef<View>(null);
  const [lastPath, setLastPath] = useState('—');

  /**
   * Native controls live in their own hierarchy — a SwiftUI `Toggle` or a
   * Compose `Switch` never emits a React Native touch, so nothing bubbles to an
   * `onTouchStart`. Measuring the row gives an origin that still looks right.
   */
  function parkFromNativeRow() {
    nativeRowRef.current?.measureInWindow((x, y, width, height) => {
      parkOrigin({ x: x + width - 28, y: y + height / 2 });
    });
  }

  return (
    <Screen>
      <CaseIntro
        slug="controls"
        expect="All three reveal from roughly where the control is. The un-tracked switch reveals from the centre of the screen instead."
      />

      <SectionTitle>1 · Pressable</SectionTitle>
      <Card subtitle="The press event carries pageX/pageY. Nothing else needed.">
        <Row gap={8} wrap>
          {THEME_ORDER.map(name => (
            <Text
              key={name}
              accessibilityRole="button"
              suppressHighlighting
              onPress={event => {
                parkOriginFromEvent(event);
                setTheme(name);
                setLastPath('Pressable → event.nativeEvent.pageX/pageY');
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: name === themeName ? theme.primary : theme.surfaceAlt,
                  color: name === themeName ? theme.onPrimary : theme.text,
                },
              ]}
            >
              {THEMES[name].label}
            </Text>
          ))}
        </Row>
      </Card>

      <SectionTitle>2 · React Native Switch</SectionTitle>
      <Card subtitle="onValueChange gives you a boolean and nothing else.">
        {/* Tracked: the row sees the touch before the switch handles it. */}
        <View
          style={styles.row}
          onTouchStart={event => {
            parkOriginFromEvent(event);
            setLastPath('View onTouchStart → wrapping row');
          }}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Tracked row</Text>
            <Text style={styles.rowHint}>onTouchStart on the wrapper — reveals from the switch</Text>
          </View>
          <Switch
            value={THEMES[themeName].isDark}
            onValueChange={() => toggleTheme()}
            thumbColor={theme.surface}
            trackColor={{ false: theme.border, true: theme.tint }}
            ios_backgroundColor={theme.border}
          />
        </View>

        <Divider />

        {/* Untracked: nothing parks a point, so the library falls back to centre. */}
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Untracked row</Text>
            <Text style={styles.rowHint}>No wrapper — falls back to the screen centre</Text>
          </View>
          <Switch
            value={THEMES[themeName].isDark}
            onValueChange={() => {
              setTheme(oppositeThemeName(themeName), { origin: undefined });
              setLastPath('nothing parked → centre of screen');
            }}
            thumbColor={theme.surface}
            trackColor={{ false: theme.border, true: theme.tint }}
            ios_backgroundColor={theme.border}
          />
        </View>
      </Card>

      <SectionTitle>3 · Native SwiftUI / Compose control</SectionTitle>
      <Card subtitle="No RN touch is emitted. Measure the row instead.">
        <View ref={nativeRowRef} collapsable={false} style={styles.nativeRow}>
          <Host style={styles.host} colorScheme={theme.isDark ? 'dark' : 'light'} seedColor={theme.tint} matchContents>
            <NativeSwitch
              label="Dark mode"
              value={THEMES[themeName].isDark}
              onValueChange={() => {
                parkFromNativeRow();
                toggleTheme();
                setLastPath('measureInWindow(row) → synthetic origin');
              }}
            />
          </Host>
        </View>

        <Hint>A native picker, re-tinted in the same commit as the React tree:</Hint>
        <Host style={styles.hostTall} colorScheme={theme.isDark ? 'dark' : 'light'} seedColor={theme.tint}>
          <Picker
            selectedValue={themeName}
            onValueChange={value => {
              parkFromNativeRow();
              setTheme(value as (typeof THEME_ORDER)[number]);
              setLastPath('native Picker → measured origin');
            }}
          >
            {THEME_ORDER.map(name => (
              <Picker.Item key={name} label={THEMES[name].label} value={name} />
            ))}
          </Picker>
        </Host>
      </Card>

      <Callout title="Last origin path">{lastPath}</Callout>

      <SectionTitle>The rule</SectionTitle>
      <Body>
        Park on touch-DOWN, not on press. A press fires after the gesture is recognised, which is
        already too late for a control that swallows the event, and never fires at all for a native
        one.
      </Body>

      <Code>{`<View onTouchStart={parkOriginFromEvent}>
  <Switch value={isDark} onValueChange={toggleTheme} />
</View>`}</Code>

      <QuickSwitch />
      <NextCase slug="controls" />
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    host: { height: 44 },
    hostTall: { height: 52 },
    nativeRow: { borderRadius: 10, overflow: 'hidden' },
    pill: {
      borderRadius: 999,
      fontSize: 13,
      fontWeight: '600',
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    row: { alignItems: 'center', flexDirection: 'row', paddingVertical: 6 },
    rowHint: { color: theme.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
    rowText: { flex: 1, paddingRight: 12 },
    rowTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
  });
