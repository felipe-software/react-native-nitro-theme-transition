/**
 * Case: a heavy list.
 *
 * 300 rows, each with an image and four themed colours, all re-styled in the
 * commit that happens under the snapshot. The point is that the size of the
 * re-render does not change the cost of the ANIMATION — only how many settle
 * frames it needs before the reveal starts.
 */
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { CaseIntro } from '@/components/CaseScreen';
import { CycleButton } from '@/components/ThemeControls';
import { Callout, Chip, Hint, Row, SectionTitle, useStyles } from '@/components/ui';
import { themeStore, useSettings, useTheme } from '@/theme/store';
import type { Theme } from '@/theme/themes';

const ICON = require('../../../../assets/icon.png');

type Item = { id: string; title: string; subtitle: string; value: string };

function buildItems(count: number): Item[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index),
    title: `Item ${index + 1}`,
    subtitle: 'Re-styled from theme tokens on every change',
    value: `${((index * 37) % 100) + 1}%`,
  }));
}

export default function ListsCase() {
  const theme = useTheme();
  const settings = useSettings();
  const styles = useStyles(makeStyles);
  const [count, setCount] = useState(300);

  const items = useMemo(() => buildItems(count), [count]);

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={item => item.id}
      initialNumToRender={12}
      windowSize={7}
      ListHeaderComponent={
        <View>
          <CaseIntro
            slug="lists"
            expect="The list is fully re-themed before the reveal starts. No row is caught half-styled, at any list size."
          />

          <SectionTitle>List size</SectionTitle>
          <Row gap={8} wrap style={{ marginTop: 12 }}>
            {[50, 300, 1000].map(size => (
              <Chip
                key={size}
                active={size === count}
                label={`${size} rows`}
                onPress={() => setCount(size)}
              />
            ))}
          </Row>

          <SectionTitle>Settle frames</SectionTitle>
          <Row gap={8} wrap style={{ marginTop: 12 }}>
            {[1, 2, 3, 5].map(frames => (
              <Chip
                key={frames}
                active={frames === settings.settleFrames}
                label={`${frames}f`}
                onPress={() => themeStore.setSettings({ settleFrames: frames })}
              />
            ))}
          </Row>
          <Hint>
            A bigger list needs the same number of frames — virtualisation means only the visible
            rows are ever re-rendered.
          </Hint>

          <View style={styles.switcher}>
            <CycleButton />
          </View>

          <Callout title="Scroll first">
            Scroll a few screens down, then switch. The snapshot holds the exact offset you were at,
            so the reveal has nothing to line up.
          </Callout>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Image source={ICON} style={styles.thumb} contentFit="cover" transition={0} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.surfaceAlt }]}>
            <Text style={styles.pillText}>{item.value}</Text>
          </View>
        </View>
      )}
    />
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { paddingBottom: 96, paddingHorizontal: 20, paddingTop: 8 },
    list: { backgroundColor: theme.background, flex: 1 },
    pill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    pillText: { color: theme.muted, fontSize: 11, fontWeight: '700' },
    row: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      padding: 10,
    },
    rowSubtitle: { color: theme.muted, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
    rowText: { flex: 1 },
    rowTitle: { color: theme.text, fontSize: 14, fontWeight: '600' },
    switcher: { marginTop: 18 },
    thumb: { borderRadius: 9, height: 40, width: 40 },
  });
