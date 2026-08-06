/**
 * The case index.
 *
 * Every card pushes a native stack screen, so getting to a case is itself a
 * navigation transition — handy for spotting interference between the two.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CASES, CASE_GROUPS } from '@/cases';
import { ThemeSwatches } from '@/components/ThemeControls';
import { Body, Callout, Hint, Screen, SectionTitle, useStyles } from '@/components/ui';
import { useTheme } from '@/theme/store';
import type { Theme } from '@/theme/themes';

export default function CasesIndex() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const router = useRouter();

  return (
    <Screen>
      <Body style={{ marginTop: 12 }}>
        Sixteen situations a real app runs into. Each one states what should happen, and what to
        look for when it does not.
      </Body>

      <View style={{ marginTop: 16 }}>
        <ThemeSwatches />
      </View>

      {CASE_GROUPS.map(group => (
        <View key={group}>
          <SectionTitle>{group}</SectionTitle>

          <View style={styles.list}>
            {CASES.filter(entry => entry.group === group).map(entry => (
              <Pressable
                key={entry.slug}
                accessibilityRole="link"
                onPress={() => router.push(`/cases/${entry.slug}`)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.icon}>
                    <Ionicons name={entry.icon} size={18} color={theme.tint} />
                  </View>
                  <Text style={styles.tag}>{entry.tag}</Text>
                </View>

                <Text style={styles.title}>{entry.title}</Text>
                <Text style={styles.summary}>{entry.summary}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      <Callout title="Reading the results">
        A transition that looks like a no-op on Android almost always means the capture came back as
        a live mirror of the app rather than pixels — every effect except blur then plays over
        content identical to what is underneath.
      </Callout>

      <Hint>Switch the theme on any case screen; the controls are always in reach.</Hint>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      gap: 8,
      padding: 16,
    },
    cardHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    icon: {
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    list: {
      gap: 10,
      marginTop: 12,
    },
    pressed: { opacity: 0.7 },
    summary: {
      color: theme.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    tag: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 6,
      color: theme.muted,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.4,
      overflow: 'hidden',
      paddingHorizontal: 8,
      paddingVertical: 3,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
    },
  });
