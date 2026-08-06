/**
 * Native bottom tabs.
 *
 * `expo-router/unstable-native-tabs` renders a real `UITabBarController` on iOS
 * and a Material `BottomNavigationView` on Android — not a JS re-implementation.
 * That makes it a good stress test for the transition:
 *
 *   - the tab bar is a NATIVE view inside the app's root, so it IS captured and
 *     revealed along with everything else;
 *   - its colours come from props, so a theme change has to repaint native
 *     chrome synchronously, in the same commit as the React tree.
 *
 * If a theme swap ever leaves the tab bar a frame behind, that shows up here
 * first.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

import { CASES } from '@/cases';
import { useTheme } from '@/theme/store';

/** The minimising tab bar is iOS 26+; passing it below that only logs a warning. */
const MINIMIZE_BEHAVIOR =
  Platform.OS === 'ios' && Number.parseInt(String(Platform.Version), 10) >= 26
    ? 'onScrollDown'
    : undefined;

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.surface}
      tintColor={theme.tint}
      iconColor={{ default: theme.muted, selected: theme.tint }}
      labelStyle={{ default: { color: theme.muted }, selected: { color: theme.tint } }}
      badgeBackgroundColor={theme.accent}
      badgeTextColor={theme.onPrimary}
      indicatorColor={theme.surfaceAlt}
      rippleColor={theme.surfaceAlt}
      blurEffect={theme.isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      minimizeBehavior={MINIMIZE_BEHAVIOR}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'wand.and.stars', selected: 'wand.and.stars.inverse' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="color-wand-outline" />}
        />
        <NativeTabs.Trigger.Label>Playground</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cases">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'flask', selected: 'flask.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="flask-outline" />}
        />
        <NativeTabs.Trigger.Label>Cases</NativeTabs.Trigger.Label>
        {/* Badges are native too — another thing that has to re-tint on a swap. */}
        <NativeTabs.Trigger.Badge>{String(CASES.length)}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="gallery">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="grid-outline" />}
        />
        <NativeTabs.Trigger.Label>Gallery</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="options-outline" />}
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
