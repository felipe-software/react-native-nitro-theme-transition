/**
 * A transparent modal.
 *
 * The screen underneath stays mounted and visible, which makes this the clearest
 * way to see what a snapshot actually contains: everything on screen, in one
 * flat copy, including the dimmed backdrop.
 */
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemeSwatches } from '@/components/ThemeControls';
import { Button, useStyles } from '@/components/ui';
import { useTheme } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

export default function OverlayScreen() {
  const theme = useTheme();
  const router = useRouter();
  const styles = useStyles(makeStyles);

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={() => router.back()}
        style={StyleSheet.absoluteFill}
      >
        {/* A real platform blur, so the capture has to resolve a live effect view
            into pixels rather than a reference. */}
        <BlurView
          intensity={40}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.title}>Transparent modal</Text>
        <Text style={styles.body}>
          The screen behind is still live. Switch from here and watch the reveal cross the blur, the
          card and the screen underneath as one image.
        </Text>

        <View style={styles.controls}>
          <ThemeSwatches />
        </View>

        <Button label="Switch" icon="color-wand-outline" onPress={() => cycleTheme()} />
        <Button label="Dismiss" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    body: { color: theme.muted, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
    card: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 10,
      margin: 20,
      padding: 20,
    },
    controls: { marginVertical: 6 },
    root: { flex: 1, justifyContent: 'center' },
    title: { color: theme.text, fontSize: 20, fontWeight: '700' },
  });
