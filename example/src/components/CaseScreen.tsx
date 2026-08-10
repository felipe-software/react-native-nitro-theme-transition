/**
 * The frame every case screen shares: what it tests, what should happen, and a
 * theme control that is always within thumb reach.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CycleButton, ThemeSwatches } from './ThemeControls';
import { Card, Row, useStyles } from './ui';
import { CASES, caseBySlug } from '@/cases';
import { useTheme, useThemeName } from '@/theme/store';
import { THEMES, type Theme } from '@/theme/themes';

export function CaseIntro({ slug, expect }: { slug: string; expect: string }) {
  const entry = caseBySlug(slug);
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  if (!entry) return null;

  return (
    <View style={styles.intro}>
      <Row gap={8}>
        <Ionicons name={entry.icon} size={16} color={theme.tint} />
        <Text style={styles.tag}>{entry.tag}</Text>
      </Row>

      <Text style={styles.summary}>{entry.summary}</Text>

      <View style={styles.expect}>
        <Text style={styles.expectLabel}>Expected</Text>
        <Text style={styles.expectText}>{expect}</Text>
      </View>
    </View>
  );
}

/** Swatches plus the cycle button — dropped at the end of every case. */
export function QuickSwitch({ children }: { children?: ReactNode }) {
  const name = useThemeName();
  const styles = useStyles(makeStyles);

  return (
    <Card title="Switch" subtitle={`Currently ${THEMES[name].label}`} icon="color-palette-outline">
      <ThemeSwatches />
      {children}
      <View style={styles.spacer} />
      <CycleButton />
    </Card>
  );
}

/** Link to the next case in the registry, so the screens read as a walkthrough. */
export function NextCase({ slug }: { slug: string }) {
  const index = CASES.findIndex(entry => entry.slug === slug);
  const next = CASES[(index + 1) % CASES.length];
  const theme = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <Link href={`/cases/${next.slug}`} style={styles.next}>
      <Text style={styles.nextText}>Next: {next.title}</Text>
      <Ionicons name="arrow-forward" size={14} color={theme.tint} />
    </Link>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    expect: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      marginTop: 12,
      padding: 12,
    },
    expectLabel: {
      color: theme.muted,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    expectText: { color: theme.text, fontSize: 13.5, lineHeight: 20, marginTop: 4 },
    intro: { marginTop: 14 },
    next: { color: theme.tint, marginTop: 28, paddingVertical: 8 },
    nextText: { color: theme.tint, fontSize: 14, fontWeight: '600' },
    spacer: { height: 2 },
    summary: { color: theme.text, fontSize: 15, lineHeight: 22, marginTop: 8 },
    tag: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
  });
