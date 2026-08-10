/**
 * Case: Reduce Motion.
 *
 * The library animates whatever it is told to animate. Deciding when NOT to is
 * the app's job — which means every consumer has to remember to check, and this
 * screen is what that check looks like.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Switch, View } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Code,
  Divider,
  Hint,
  Row,
  Screen,
  SectionTitle,
  StatusDot,
} from '@/components/ui';
import { themeStore, useSettings, useTheme } from '@/theme/store';
import { cycleTheme, isReduceMotionEnabled } from '@/theme/transition';

export default function ReduceMotionCase() {
  const theme = useTheme();
  const settings = useSettings();
  const [enabled, setEnabled] = useState(isReduceMotionEnabled());

  useEffect(() => {
    let cancelled = false;

    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (!cancelled) setEnabled(value);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return (
    <Screen>
      <CaseIntro
        slug="reduce-motion"
        expect="With Reduce Motion on and the policy respected, the theme still changes — instantly, with no snapshot and no animation."
      />

      <View style={{ marginTop: 16 }}>
        <StatusDot
          ok={!enabled}
          label={enabled ? 'Reduce Motion is ON' : 'Reduce Motion is off'}
        />
      </View>

      <Hint>
        {Platform.OS === 'ios'
          ? 'Settings → Accessibility → Motion → Reduce Motion'
          : 'Settings → Accessibility → Remove animations'}
      </Hint>

      <SectionTitle>Policy</SectionTitle>
      <Card>
        <Row>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Body>Respect Reduce Motion</Body>
            <Hint>Skip the snapshot entirely when the OS setting is on.</Hint>
          </View>
          <Switch
            value={settings.respectReduceMotion}
            onValueChange={value => themeStore.setSettings({ respectReduceMotion: value })}
            thumbColor={theme.surface}
            trackColor={{ false: theme.border, true: theme.tint }}
            ios_backgroundColor={theme.border}
          />
        </Row>

        <Divider />

        <Row>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Body>Animate at all</Body>
            <Hint>The master switch. Off means every change is instant.</Hint>
          </View>
          <Switch
            value={settings.animate}
            onValueChange={value => themeStore.setSettings({ animate: value })}
            thumbColor={theme.surface}
            trackColor={{ false: theme.border, true: theme.tint }}
            ios_backgroundColor={theme.border}
          />
        </Row>
      </Card>

      <SectionTitle>Preview both</SectionTitle>
      <Row gap={10} wrap style={{ marginTop: 12 }}>
        <Button
          label="Animated"
          icon="color-wand-outline"
          style={{ flexGrow: 1 }}
          onPress={() => cycleTheme()}
        />
        <Button
          label="As a Reduce Motion user"
          icon="accessibility-outline"
          variant="secondary"
          style={{ flexGrow: 1 }}
          onPress={() => cycleTheme({ instant: true })}
        />
      </Row>

      <Callout title="Read it synchronously">
        `AccessibilityInfo.isReduceMotionEnabled()` returns a Promise, and awaiting it inside the
        callback would put the theme swap after the capture. Read it once at startup, keep it current
        with the listener, and check the cached boolean at the moment of the change.
      </Callout>

      <Code>{`let reduceMotion = false;

AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceMotion = v; });
AccessibilityInfo.addEventListener('reduceMotionChanged', v => { reduceMotion = v; });

export function runThemed(apply: () => void) {
  if (reduceMotion) { apply(); return; }   // still changes — just not animated
  withThemeTransition(apply, options);
}`}</Code>

      <Body style={{ marginTop: 14 }}>
        Moving this check into `withThemeTransition` as an opt-out default is on the roadmap; until
        then it belongs in every app's policy module.
      </Body>

      <QuickSwitch />
      <NextCase slug="reduce-motion" />
    </Screen>
  );
}
