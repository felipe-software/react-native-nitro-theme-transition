/**
 * Settings — the same options as the Playground, but driven by NATIVE controls.
 *
 * Two reasons it exists as its own screen:
 *
 *   1. SwiftUI / Jetpack Compose views have to repaint in the same commit as the
 *      React tree, or a theme change leaves them a frame behind;
 *   2. native controls emit no React Native touch, so nothing can park an
 *      origin — every change here starts from the centre of the screen unless
 *      the app measures the row itself.
 */
import { Host, Picker, Slider, Switch as NativeSwitch } from '@expo/ui';
import Constants from 'expo-constants';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  THEME_TRANSITION_DIRECTIONS,
  THEME_TRANSITION_KINDS,
  isThemeTransitionAvailable,
} from 'react-native-nitro-theme-transition';

import {
  Body,
  Button,
  Callout,
  Card,
  Divider,
  Hint,
  Row,
  Screen,
  SectionTitle,
  Stat,
  StatusDot,
  useStyles,
} from '@/components/ui';
import { DIRECTION_META, KIND_META } from '@/kinds';
import { DEFAULT_SETTINGS, themeStore, useChangeCount, useSettings, useTheme } from '@/theme/store';
import { THEMES, THEME_ORDER, type Theme, type ThemeName } from '@/theme/themes';
import { cycleTheme, isReduceMotionEnabled, setTheme } from '@/theme/transition';

export default function Settings() {
  const theme = useTheme();
  const settings = useSettings();
  const changes = useChangeCount();
  const styles = useStyles(makeStyles);

  const scheme = theme.isDark ? 'dark' : 'light';

  return (
    <Screen>
      <Row gap={10} wrap style={{ marginTop: 14 }}>
        <Stat label="changes" value={String(changes)} />
        <Stat label="duration" value={`${settings.durationMs}ms`} />
        <Stat label="settle" value={`${settings.settleFrames}f`} />
      </Row>

      <SectionTitle>Theme</SectionTitle>
      <Card subtitle="A native picker. No touch event reaches React, so the reveal starts centred.">
        <Host style={styles.picker} colorScheme={scheme} seedColor={theme.tint}>
          <Picker
            selectedValue={theme.name}
            onValueChange={value => setTheme(value as ThemeName)}
          >
            {THEME_ORDER.map(name => (
              <Picker.Item key={name} label={THEMES[name].label} value={name} />
            ))}
          </Picker>
        </Host>
      </Card>

      <SectionTitle>Effect</SectionTitle>
      <Card subtitle={KIND_META[settings.kind].native}>
        <Host style={styles.picker} colorScheme={scheme} seedColor={theme.tint}>
          <Picker
            selectedValue={settings.kind}
            onValueChange={value =>
              themeStore.setSettings({ kind: value as (typeof THEME_TRANSITION_KINDS)[number] })
            }
          >
            {THEME_TRANSITION_KINDS.map(kind => (
              <Picker.Item key={kind} label={KIND_META[kind].label} value={kind} />
            ))}
          </Picker>
        </Host>

        {(settings.kind === 'slide' ||
          settings.kind === 'split' ||
          settings.kind === 'barnDoor' ||
          settings.kind === 'blinds' ||
          settings.kind === 'stripes') && (
          <>
            <Divider />
            <Hint>{settings.kind === 'slide' ? 'Wipe direction' : 'Sweep axis'}</Hint>
            <Host style={styles.picker} colorScheme={scheme} seedColor={theme.tint}>
              <Picker
                selectedValue={settings.direction}
                onValueChange={value =>
                  themeStore.setSettings({
                    direction: value as (typeof THEME_TRANSITION_DIRECTIONS)[number],
                  })
                }
              >
                {THEME_TRANSITION_DIRECTIONS.map(direction => (
                  <Picker.Item
                    key={direction}
                    label={DIRECTION_META[direction].label}
                    value={direction}
                  />
                ))}
              </Picker>
            </Host>
          </>
        )}
      </Card>

      <SectionTitle>Timing</SectionTitle>
      <Card>
        <Hint>Duration — {settings.durationMs}ms</Hint>
        <Host style={styles.control} colorScheme={scheme} seedColor={theme.tint}>
          <Slider
            min={120}
            max={3000}
            step={20}
            value={settings.durationMs}
            onValueChange={value => themeStore.setSettings({ durationMs: Math.round(value) })}
          />
        </Host>

        <Hint>Settle frames — {settings.settleFrames}</Hint>
        <Host style={styles.control} colorScheme={scheme} seedColor={theme.tint}>
          <Slider
            min={0}
            max={10}
            step={1}
            value={settings.settleFrames}
            onValueChange={value => themeStore.setSettings({ settleFrames: Math.round(value) })}
          />
        </Host>
        {settings.settleFrames < 2 && (
          <Callout tone="warn">
            Below 2 the reveal starts before React has painted the new palette.
          </Callout>
        )}
      </Card>

      <SectionTitle>Behaviour</SectionTitle>
      <Card>
        <Host style={styles.control} colorScheme={scheme} seedColor={theme.tint} matchContents>
          <NativeSwitch
            label="Animate theme changes"
            value={settings.animate}
            onValueChange={value => themeStore.setSettings({ animate: value })}
          />
        </Host>

        <Host style={styles.control} colorScheme={scheme} seedColor={theme.tint} matchContents>
          <NativeSwitch
            label="Respect Reduce Motion"
            value={settings.respectReduceMotion}
            onValueChange={value => themeStore.setSettings({ respectReduceMotion: value })}
          />
        </Host>

        <Host style={styles.control} colorScheme={scheme} seedColor={theme.tint} matchContents>
          <NativeSwitch
            label="Haptic tick on change"
            value={settings.haptics}
            onValueChange={value => themeStore.setSettings({ haptics: value })}
          />
        </Host>

        <Hint>
          Reduce Motion is currently {isReduceMotionEnabled() ? 'ON' : 'off'} on this device.
        </Hint>
      </Card>

      <SectionTitle>Environment</SectionTitle>
      <Card>
        <StatusDot
          ok={isThemeTransitionAvailable()}
          label={isThemeTransitionAvailable() ? 'Native module ready' : 'Native module missing'}
        />
        <View style={styles.envRows}>
          <EnvRow label="platform" value={`${Platform.OS} ${String(Platform.Version)}`} />
          <EnvRow label="app version" value={Constants.expoConfig?.version ?? '—'} />
          <EnvRow label="new architecture" value="enabled" />
          <EnvRow label="origin mode" value={settings.originMode} />
        </View>
      </Card>

      <Row gap={10} style={{ marginTop: 20 }}>
        <Button
          label="Reset settings"
          icon="refresh-outline"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => {
            themeStore.resetSettings();
            cycleTheme({
              kind: DEFAULT_SETTINGS.kind,
              durationMs: DEFAULT_SETTINGS.durationMs,
              settleFrames: DEFAULT_SETTINGS.settleFrames,
            });
          }}
        />
        <Button
          label="Switch"
          icon="color-wand-outline"
          style={{ flex: 1 }}
          onPress={() => cycleTheme()}
        />
      </Row>

      <Body style={{ marginTop: 20 }}>
        These settings live in a module-level store rather than React context, so the theme setter
        can run synchronously inside the transition callback.
      </Body>
    </Screen>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.envRow}>
      <Text style={styles.envLabel}>{label}</Text>
      <Text style={styles.envValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    control: { height: 46 },
    envLabel: { color: theme.muted, flex: 1, fontSize: 12.5 },
    envRow: { flexDirection: 'row', paddingVertical: 4 },
    envRows: { marginTop: 6 },
    envValue: { color: theme.text, fontFamily: 'Menlo', fontSize: 11.5 },
    picker: { height: 52 },
  });
