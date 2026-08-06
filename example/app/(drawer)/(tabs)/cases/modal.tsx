/**
 * Case: modals, sheets and overlays.
 *
 * The distinction that matters is not "is it modal" — it is "is it on screen in
 * one of the app's windows".
 *
 * On iOS the capture copies the scene's WINDOWS, not the root view, so anything
 * presented is in it however UIKit chose to host it — and the copies are kept in
 * a window of their own, above everything the app draws.
 *
 * On Android an RN `Modal` is a separate `Dialog` window, outside the captured
 * view, and still snaps.
 */
import { useState } from 'react';
import { Link } from 'expo-router';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import { ThemeSwatches } from '@/components/ThemeControls';
import {
  Body,
  Button,
  Callout,
  Card,
  Code,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

export default function ModalCase() {
  const styles = useStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  const [transparent, setTransparent] = useState(false);

  return (
    <Screen>
      <CaseIntro
        slug="modal"
        expect={
          Platform.OS === 'ios'
            ? 'Everything animates: the modal, the dimming behind it and the screen underneath are one copy. The modal must never disappear while the reveal plays.'
            : 'Inside an RN Modal the theme snaps with no animation, because a Dialog is its own window. Router modals and the screen behind animate normally.'
        }
      />

      <SectionTitle>React Native Modal</SectionTitle>
      <Card
        subtitle={
          Platform.OS === 'ios'
            ? 'A presented view controller in the app’s own window — captured, and animated with everything else.'
            : 'A Dialog: its own window, outside the captured view. A documented limitation, not a bug.'
        }
      >
        <Row gap={10}>
          <Button label="Opaque" icon="square-outline" style={styles.grow} onPress={() => setVisible(true)} />
          <Button
            label="Transparent"
            icon="scan-outline"
            variant="secondary"
            style={styles.grow}
            onPress={() => {
              setTransparent(true);
              setVisible(true);
            }}
          />
        </Row>
        <Hint>
          The transparent one is the clearer demo: you can see the modal and the screen behind it at
          the same time, so it is obvious whether they animate together.
        </Hint>
      </Card>

      <SectionTitle>Router presentations</SectionTitle>
      <Card subtitle="Declared on the root stack, so they present over the tabs and the drawer alike.">
        <Link href="/modal" asChild>
          <Button label="Modal screen" icon="albums-outline" />
        </Link>
        <Link href="/sheet" asChild>
          <Button label="Form sheet (detented)" icon="reorder-four-outline" variant="secondary" />
        </Link>
        <Link href="/overlay" asChild>
          <Button label="Transparent modal" icon="scan-outline" variant="ghost" />
        </Link>
      </Card>

      <Callout title="What decides it">
        Not “is it modal” — “is it on screen in one of the app’s windows”. On iOS the capture copies
        the windows themselves, so a presentation is included whatever container UIKit put it in.
        The keyboard, system alerts, autofill and the share sheet are drawn by the OS above the app
        and stay live rather than being frozen into the copy; on Android an RN `Modal` is a `Dialog`
        window and is outside the capture entirely.
      </Callout>

      <SectionTitle>If a modal disappears</SectionTitle>
      <Body>
        {Platform.OS === 'ios'
          ? 'That is the bug this case exists to catch: a copy taken from the root view alone has the modal cut out of it, and is then pinned on top of the live one — so the modal blinks out for the whole animation and returns already re-themed. Copying whole windows is what prevents it.'
          : 'On Android the practical workaround is to present through the navigator rather than through RN’s Modal, which is usually the better control on both platforms anyway.'}
      </Body>

      <Code>{`// iOS
overlay window        ← the copies live here, above everything
  └─ snapshot
app window            ← this whole window is what gets copied
  ├─ presentation container   (the modal + its dimming)
  └─ rootViewController.view

// Android: a Dialog is its own window, outside android.R.id.content`}</Code>

      <QuickSwitch />
      <NextCase slug="modal" />

      <Modal
        visible={visible}
        transparent={transparent}
        animationType="slide"
        onRequestClose={() => {
          setVisible(false);
          setTransparent(false);
        }}
        presentationStyle={transparent ? 'overFullScreen' : 'pageSheet'}
      >
        <View style={[styles.modal, transparent && styles.modalTransparent]}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Inside an RN Modal</Text>
            <Text style={styles.modalBody}>
              {Platform.OS === 'ios'
                ? 'Switch the theme from here. This card, the dimming behind it and the screen underneath are all one copy, and they animate together — the modal must stay visible the whole way through.'
                : 'Switch the theme from here. The colours change instantly: a Dialog is its own window, so there is no snapshot over it. If you opened the transparent variant, the app behind is animating right now.'}
            </Text>

            <View style={styles.modalControls}>
              <ThemeSwatches />
            </View>

            <Button label="Switch" icon="color-wand-outline" onPress={() => cycleTheme()} />
            <Button
              label="Close"
              variant="ghost"
              onPress={() => {
                setVisible(false);
                setTransparent(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    grow: { flex: 1 },
    modal: { backgroundColor: theme.background, flex: 1, justifyContent: 'flex-end' },
    modalBody: { color: theme.muted, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
    modalCard: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      gap: 10,
      padding: 20,
      paddingBottom: 36,
    },
    modalControls: { marginVertical: 6 },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
    modalTransparent: { backgroundColor: 'rgba(0,0,0,0.35)' },
  });
