/**
 * TabBar — Custom 5-tab bottom bar for the SyncUp tab navigator.
 *
 * Layout (left → right):
 *   [Home] [Explore] [Create +] [Friends] [Profile]
 *
 * The center "Create" slot is NOT a tab screen — pressing it intercepts the
 * `tabPress` event and opens the `CreateEventModal` modal stack at the root.
 * See `RootNavigator.tsx`. `GroupsTab` is registered in RootNavigator for
 * cross-tab navigation but is intentionally NOT rendered in this bar — groups
 * are reached via the Friends tab's SegmentedSwitcher.
 *
 * Visual spec (ANCHOR / NAVIGATION.md):
 *   - Background:        colors.bgElevated
 *   - Top hairline:      1px colors.hair
 *   - Active icon+label: colors.accent
 *   - Inactive:          colors.ink3
 *   - Center "Create":   48x48 accent circle, white "+" icon (no label)
 *   - Height (incl. safe area on iPhone): TAB_BAR_HEIGHT = 83
 *
 * Haptics: fires `light` on every tab change (Hard Rule R5-8 haptic map).
 *
 * Icons: uses Ionicons from @expo/vector-icons exclusively. Do not mix sets.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { themeColors as colors, radii, spacing, typography, useHaptic } from '../theme';

/**
 * Total tab bar height INCLUDING the safe-area bottom inset (iPhone with home
 * indicator: 49pt content + 34pt safe area = 83pt). Toast components dock
 * `bottom: TAB_BAR_HEIGHT + 24` from the screen bottom.
 */
export const TAB_BAR_HEIGHT = 83;

/** Visible content height above the safe-area inset. */
const TAB_BAR_CONTENT_HEIGHT = 49;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { focused: IconName; blurred: IconName; label: string }> = {
  HomeTab:    { focused: 'home',          blurred: 'home-outline',          label: 'Home' },
  ExploreTab: { focused: 'compass',       blurred: 'compass-outline',       label: 'Explore' },
  FriendsTab: { focused: 'people',        blurred: 'people-outline',        label: 'Friends' },
  ProfileTab: { focused: 'person-circle', blurred: 'person-circle-outline', label: 'Profile' },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const fire = useHaptic();

  // Reorder so Create sits in the center: Home, Friends, Create, Groups, Profile.
  // The underlying tab order may be defined however TabNavigator declares it;
  // we rely on the route names to position items.
  const ordered = orderRoutes(state.routes.map((r) => r.name));

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.hair,
        },
      ]}
      accessibilityRole="tablist"
    >
      {ordered.map((routeName) => {
        const routeIndex = state.routes.findIndex((r) => r.name === routeName);
        if (routeIndex === -1) return null;
        const route = state.routes[routeIndex];
        const isFocused = state.index === routeIndex;
        const { options } = descriptors[route.key];

        const isCreate = routeName === 'CreateTab';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (isCreate) {
            // Always intercept — never switch to the (non-existent) Create screen.
            // The RootNavigator-mounted listener handles the actual modal open
            // by also listening for `tabPress` on this route, but we also
            // explicitly preventDefault here so the tab focus does not change.
            event.preventDefault();
            fire('medium');
            // `getParent()` reaches the RootStackNavigator (where the
            // CreateEventModal is mounted as a sibling of the Tabs).
            navigation.getParent()?.navigate('CreateEventModal');
            return;
          }

          if (!isFocused && !event.defaultPrevented) {
            fire('light');
            navigation.navigate(route.name as never);
          }
        };

        const accessibilityLabel =
          options.tabBarAccessibilityLabel ??
          (isCreate ? 'Create event' : TAB_ICONS[routeName]?.label ?? routeName);

        if (isCreate) {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityLabel={accessibilityLabel}
              hitSlop={8}
              style={styles.createWrapper}
            >
              <View style={[styles.createCircle, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={28} color={colors.bgElevated} />
              </View>
            </Pressable>
          );
        }

        const iconCfg = TAB_ICONS[routeName];
        const tint = isFocused ? colors.accent : colors.ink3;

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={accessibilityLabel}
            hitSlop={8}
            style={styles.tab}
          >
            <Ionicons
              name={isFocused ? iconCfg.focused : iconCfg.blurred}
              size={24}
              color={tint}
            />
            <Text
              style={[
                styles.label,
                {
                  color: tint,
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: typography.caption.fontWeight,
                  letterSpacing: typography.caption.letterSpacing,
                },
              ]}
              numberOfLines={1}
            >
              {iconCfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Force the visual order to: Home, Explore, Create, Friends, Profile.
 *
 * Non-canonical routes are intentionally NOT rendered. `GroupsTab` is
 * registered in RootNavigator so cross-tab navigation can target it, but
 * is hidden from this TabBar by design — see the comment on the GroupsTab
 * line in RootNavigator.tsx.
 */
function orderRoutes(names: string[]): string[] {
  const canonical = ['HomeTab', 'ExploreTab', 'CreateTab', 'FriendsTab', 'ProfileTab'];
  return canonical.filter((n) => names.includes(n));
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: spacing.xs,
  },
  label: {
    marginTop: 2,
  },
  createWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.pill ?? 999,
    alignItems: 'center',
    justifyContent: 'center',
    // Soft accent shadow (uses theme token for parity with rest of UI).
    shadowColor: colors.shadowAccent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
});
