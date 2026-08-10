/**
 * Case: native surfaces inside the snapshot.
 *
 * On Android this is the screen that catches the worst possible regression.
 * Recording a view into a `RenderNode` emits each child as a REFERENCE to its
 * live render node, not as pixels — so the "snapshot" becomes a live mirror of
 * the app and every effect except blur looks like a no-op. Rasterising through
 * `HardwareRenderer` is what fixes it, and hosted native views are where a
 * broken capture shows first.
 */
import { BottomSheet, Button as NativeButton, Column, Host, Slider, Text as NativeText } from '@expo/ui';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import { themeStore, useSettings, useTheme } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

const ICON = require('../../../../assets/icon.png');

export default function SurfacesCase() {
  const theme = useTheme();
  const settings = useSettings();
  const styles = useStyles(makeStyles);
  const [sheetOpen, setSheetOpen] = useState(false);

  const scheme = theme.isDark ? 'dark' : 'light';

  return (
    <Screen>
      <CaseIntro
        slug="surfaces"
        expect="Every surface below is copied as PIXELS. If any of them keeps updating live during a transition — or the whole screen looks unchanged while only blur works — the Android capture has regressed to a render-node reference."
      />

      <SectionTitle>SwiftUI / Jetpack Compose</SectionTitle>
      <Card subtitle="Hosted native views, themed by props on the host.">
        <Host style={styles.hostTall} colorScheme={scheme} seedColor={theme.tint}>
          <Column spacing={12}>
            <NativeText>Native text, native layout</NativeText>
            {/*
              `label`, never string children. A `Host` renders SwiftUI on iOS and
              Compose on Android, and its subtree has to be made of @expo/ui
              elements — a bare string there mounts as a RawText host view, which
              the host cannot lay out. It logs "Text strings must be rendered
              within a <Text> component" and then hard-crashes the app.
            */}
            <NativeButton
              label="Switch from a native button"
              variant="filled"
              onPress={() => cycleTheme()}
            />
            <Slider
              min={200}
              max={2500}
              step={50}
              value={settings.durationMs}
              onValueChange={value => themeStore.setSettings({ durationMs: Math.round(value) })}
            />
          </Column>
        </Host>
        <Hint>Duration {settings.durationMs}ms — dragged with a real platform slider.</Hint>
        <Callout tone="warn" title="Props, not children">
          Everything inside a `Host` has to be an @expo/ui element. Give a native button its text
          through `label`; a bare string there mounts as a RawText host view the platform host cannot
          lay out, which logs “Text strings must be rendered within a &lt;Text&gt; component” and then
          crashes the app outright.
        </Callout>
      </Card>

      <SectionTitle>Native bottom sheet</SectionTitle>
      <Card subtitle="A SwiftUI sheet / Compose ModalBottomSheet, not a JS re-creation.">
        <Button
          label="Open the sheet"
          icon="chevron-up-outline"
          variant="secondary"
          onPress={() => setSheetOpen(true)}
        />
        <Hint>Switch from inside it and note whether the sheet animates or snaps on your device.</Hint>
      </Card>

      <SectionTitle>Blur</SectionTitle>
      <Card subtitle="A UIVisualEffectView / RenderEffect blur behind live content.">
        <View style={styles.blurWrap}>
          <Image source={ICON} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
          <BlurView intensity={45} tint={scheme} style={styles.blur}>
            <Text style={styles.blurText}>Blur over an image</Text>
          </BlurView>
        </View>
        <Hint>
          The `blur` effect blurs the COPY, not the app. Two blurs stacked is the fastest way to see
          that the copy really is a separate layer.
        </Hint>
      </Card>

      <SectionTitle>Images and vectors</SectionTitle>
      <Row gap={10} wrap style={{ marginTop: 12 }}>
        <Image source={ICON} style={styles.tile} contentFit="cover" transition={0} />
        <View style={[styles.tile, styles.tileFill]}>
          {Platform.OS === 'ios' ? (
            <SymbolView name="paintpalette.fill" size={44} tintColor={theme.tint} />
          ) : (
            <Text style={styles.glyph}>◑</Text>
          )}
        </View>
        <View style={[styles.tile, styles.gradient]} />
      </Row>
      <Hint>
        {Platform.OS === 'ios'
          ? 'An SF Symbol, an image and a CSS-style gradient — all rasterised into the same copy.'
          : 'A glyph, an image and a gradient — all rasterised into the same copy.'}
      </Hint>

      <Callout tone="warn" title="What does NOT capture">
        Anything drawn on a separate `SurfaceView` — video players, camera previews, some map views,
        GL surfaces — is composited by the system outside the view's own draw pass on Android. Expect
        those regions to appear black or stale in the copy, and prefer `TextureView`-backed
        components on screens where a theme change is likely.
      </Callout>

      <Body style={{ marginTop: 14 }}>
        Below API 29 there is no public `HardwareRenderer`, so the capture falls back to a software
        `Canvas`. That rasterises for the same reason, just on the CPU. It is one of the untested
        paths in this package.
      </Body>

      <QuickSwitch />
      <NextCase slug="surfaces" />

      <Host style={styles.sheetHost} colorScheme={scheme} seedColor={theme.tint}>
        <BottomSheet isPresented={sheetOpen} onDismiss={() => setSheetOpen(false)}>
          <Column spacing={12}>
            <NativeText>Inside a native sheet</NativeText>
            <NativeButton label="Switch the theme" variant="filled" onPress={() => cycleTheme()} />
            <NativeButton
              label="Close"
              variant="outlined"
              onPress={() => setSheetOpen(false)}
            />
          </Column>
        </BottomSheet>
      </Host>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    blur: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    blurText: { color: theme.text, fontSize: 14, fontWeight: '700' },
    blurWrap: { borderRadius: 12, height: 110, overflow: 'hidden' },
    glyph: { color: theme.tint, fontSize: 40 },
    gradient: {
      backgroundColor: theme.surfaceAlt,
      experimental_backgroundImage: `linear-gradient(135deg, ${theme.tint}, ${theme.surface})`,
    },
    hostTall: { height: 190 },
    // The sheet presents itself over the whole window; the host only has to
    // exist somewhere in the tree, not to occupy space.
    sheetHost: { position: 'absolute' },
    tile: {
      alignItems: 'center',
      borderRadius: 12,
      flexBasis: '30%',
      flexGrow: 1,
      height: 90,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    tileFill: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
  });
