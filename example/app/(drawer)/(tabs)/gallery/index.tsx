/**
 * Gallery — a deliberately dense screen.
 *
 * Icon fonts, SF Symbols, images, tinted shapes and text at six sizes, all
 * tinted from the theme. Density is the point: a transition that looks clean on
 * a sparse screen can reveal banding, tearing or a stale region on one like this.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { THEME_TRANSITION_KINDS } from 'react-native-nitro-theme-transition';

import { CycleButton, ThemeSwatches } from '@/components/ThemeControls';
import {
  Body,
  Callout,
  Card,
  Hint,
  Row,
  Screen,
  SectionTitle,
  Tile,
  TileGrid,
  useStyles,
  type IoniconName,
} from '@/components/ui';
import { KIND_META } from '@/kinds';
import { themeStore, useSettings, useTheme } from '@/theme/store';
import { THEMES, nextThemeName, type Theme, type ThemeName } from '@/theme/themes';
import { runThemed } from '@/theme/transition';

const ICON = require('../../../../assets/icon.png');

const IONICONS: IoniconName[] = [
  'home-outline',
  'search-outline',
  'heart-outline',
  'bookmark-outline',
  'notifications-outline',
  'camera-outline',
  'cloud-outline',
  'lock-closed-outline',
  'person-circle-outline',
  'settings-outline',
  'trash-outline',
  'share-outline',
];

const MATERIAL = [
  'palette-swatch',
  'weather-night',
  'white-balance-sunny',
  'gesture-tap',
  'cellphone-cog',
  'animation-play',
] as const;

const SYMBOLS = [
  'paintpalette.fill',
  'moon.stars.fill',
  'sun.max.fill',
  'hand.tap.fill',
  'wand.and.stars',
  'square.stack.3d.up.fill',
] as const;

const TOKENS: { key: keyof Theme; label: string }[] = [
  { key: 'background', label: 'background' },
  { key: 'surface', label: 'surface' },
  { key: 'surfaceAlt', label: 'surfaceAlt' },
  { key: 'border', label: 'border' },
  { key: 'primary', label: 'primary' },
  { key: 'tint', label: 'tint' },
  { key: 'accent', label: 'accent' },
  { key: 'success', label: 'success' },
  { key: 'danger', label: 'danger' },
];

export default function Gallery() {
  const theme = useTheme();
  const settings = useSettings();
  const styles = useStyles(makeStyles);

  return (
    <Screen>
      <Body style={{ marginTop: 12 }}>
        Every glyph, image and shape below ends up in the same GPU copy. Switch from anywhere on the
        screen and watch the whole thing move as one layer.
      </Body>

      <View style={{ marginTop: 16 }}>
        <ThemeSwatches />
      </View>

      <SectionTitle>Play an effect</SectionTitle>
      <Hint>Tap a tile to run that effect from that tile.</Hint>
      <TileGrid>
        {THEME_TRANSITION_KINDS.map(kind => (
          <Tile
            key={kind}
            active={kind === settings.kind}
            icon={KIND_META[kind].icon}
            title={KIND_META[kind].label}
            hint={KIND_META[kind].hint}
            onPress={() =>
              runThemed(
                () => {
                  themeStore.setTheme(nextThemeName(themeStore.getState().themeName));
                  themeStore.setSettings({ kind });
                },
                { kind },
              )
            }
          />
        ))}
      </TileGrid>

      <SectionTitle>Icon font · Ionicons</SectionTitle>
      <Card>
        <Row gap={14} wrap>
          {IONICONS.map(name => (
            <View key={name} style={styles.iconCell}>
              <Ionicons name={name} size={22} color={theme.tint} />
            </View>
          ))}
        </Row>
        <Hint>Glyphs from a font atlas — re-tinted by a normal style change.</Hint>
      </Card>

      <SectionTitle>Icon font · Material Community</SectionTitle>
      <Card>
        <Row gap={14} wrap>
          {MATERIAL.map(name => (
            <View key={name} style={styles.iconCell}>
              <MaterialCommunityIcons name={name} size={22} color={theme.accent} />
            </View>
          ))}
        </Row>
      </Card>

      <SectionTitle>{Platform.OS === 'ios' ? 'SF Symbols' : 'SF Symbols (iOS only)'}</SectionTitle>
      <Card>
        {Platform.OS === 'ios' ? (
          <Row gap={14} wrap>
            {SYMBOLS.map(name => (
              <View key={name} style={styles.iconCell}>
                <SymbolView name={name} size={24} tintColor={theme.tint} />
              </View>
            ))}
          </Row>
        ) : (
          <Hint>
            Rendered by the system on iOS. The native tab bar in this app uses them for its icons,
            with Ionicons as the Android source.
          </Hint>
        )}
      </Card>

      <SectionTitle>Images</SectionTitle>
      <Row gap={10} wrap style={{ marginTop: 12 }}>
        {[0, 1, 2, 3].map(index => (
          <Image
            key={index}
            source={ICON}
            style={[styles.image, index % 2 === 0 && styles.imageRound]}
            contentFit="cover"
            transition={0}
          />
        ))}
      </Row>

      <SectionTitle>Palette tokens</SectionTitle>
      <Card subtitle={`${THEMES[theme.name as ThemeName].label} — every value swaps in one commit.`}>
        {TOKENS.map(token => (
          <View key={token.label} style={styles.tokenRow}>
            <View style={[styles.tokenSwatch, { backgroundColor: theme[token.key] as string }]} />
            <Text style={styles.tokenName}>{token.label}</Text>
            <Text style={styles.tokenValue}>{String(theme[token.key])}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Type scale</SectionTitle>
      <Card>
        <Text style={styles.type32}>Display 32</Text>
        <Text style={styles.type24}>Heading 24</Text>
        <Text style={styles.type18}>Subhead 18</Text>
        <Text style={styles.type15}>Body 15 — the workhorse size.</Text>
        <Text style={styles.type13}>Caption 13 — muted, for hints.</Text>
        <Text style={styles.type11}>Overline 11 — uppercase, tracked.</Text>
      </Card>

      <Callout title="What to look for">
        Text and icons are the most sensitive to a mistimed reveal: a font atlas re-rasterises on a
        colour change, so if anything is going to appear a frame late, it is a glyph.
      </Callout>

      <View style={{ marginTop: 20 }}>
        <CycleButton />
      </View>
    </Screen>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    iconCell: {
      alignItems: 'center',
      backgroundColor: theme.surfaceAlt,
      borderRadius: 10,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    image: { borderRadius: 10, flexBasis: '22%', flexGrow: 1, height: 72 },
    imageRound: { borderRadius: 36 },
    tokenName: { color: theme.text, flex: 1, fontSize: 13, fontWeight: '600' },
    tokenRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 5 },
    tokenSwatch: {
      borderColor: theme.border,
      borderRadius: 6,
      borderWidth: 1,
      height: 22,
      width: 22,
    },
    tokenValue: { color: theme.muted, fontFamily: 'Menlo', fontSize: 11 },
    type11: { color: theme.muted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
    type13: { color: theme.muted, fontSize: 13 },
    type15: { color: theme.text, fontSize: 15 },
    type18: { color: theme.text, fontSize: 18, fontWeight: '600' },
    type24: { color: theme.text, fontSize: 24, fontWeight: '700' },
    type32: { color: theme.text, fontSize: 32, fontWeight: '800', letterSpacing: -0.6 },
  });
