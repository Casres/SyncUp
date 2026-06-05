/**
 * RootNavigator — top-level navigation tree.
 *
 * Structure:
 *   RootStack (native-stack, root)
 *     ├── "Tabs"               — BottomTabNavigator (5 tabs)
 *     │     ├── HomeTab    → HomeStack
 *     │     ├── ExploreTab → ExploreStack
 *     │     ├── CreateTab  → empty placeholder; press intercepted by TabBar
 *     │     ├── FriendsTab → FriendsStack (hosts Groups + Messages segments)
 *     │     └── ProfileTab → ProfileStack
 *     │
 *     └── "CreateEventModal"   — CreateEventStack (fullScreenModal)
 *
 * Why the modal lives at the ROOT (not inside the tab navigator):
 *   The Create Event flow must render ABOVE the tab bar (full-screen, no
 *   tab bar peeking at the bottom). Modals presented from inside a tab stack
 *   inherit the tab bar's safe area. Mounting at the root sidesteps that.
 *
 * Center "Create" tab pattern:
 *   `TabBar.tsx` listens for `tabPress` on the `CreateTab` route, calls
 *   `event.preventDefault()`, then `navigation.getParent()?.navigate(
 *   'CreateEventModal')`. The CreateTab screen body is a no-op `<View />` —
 *   it never actually renders because the press is intercepted first.
 */

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@clerk/clerk-expo';

import type { RootStackParamList, RootTabParamList } from './types';
import HomeStack        from './HomeStack';
import ExploreStack     from './ExploreStack';
import FriendsStack     from './FriendsStack';
import ProfileStack     from './ProfileStack';
import CreateEventStack from './CreateEventStack';
import AuthNavigator   from './AuthNavigator';
import TabBar           from './TabBar';
import { colors } from '../theme';
import {
  NotifSheet,
  NotifSheetProvider,
} from '../components/notifications';
import { SearchProvider } from '../components/social/SearchContext';

// TAB BAR IA (LOCKED 2026-05-25): Home · Explore · Create(+) · Friends ·
// Profile. ANCHOR R6-6 + Hard Rule 23 updated to match. NotifSheet is a
// root-level overlay (mounted below) opened from the Home FlowHeader bell
// — it is intentionally NOT a tab. There is no GroupsTab: groups and
// messages are SEGMENTS of the Friends tab (R17-1), and the group routes
// live in FriendsStack.

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

/** Empty placeholder for the Create tab — never actually rendered. */
function CreateTabPlaceholder() {
  return <View />;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Tab order: Home | Explore | Create (+) | Friends | Profile */}
      <Tab.Screen name="HomeTab"    component={HomeStack} />
      <Tab.Screen name="ExploreTab" component={ExploreStack} />
      <Tab.Screen
        name="CreateTab"
        component={CreateTabPlaceholder}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Belt-and-braces: TabBar already intercepts, but if any other
            // surface ever fires `tabPress` on this route (e.g. a deep link
            // handler), we still prevent the focus change and open the modal.
            e.preventDefault();
            navigation.getParent()?.navigate('CreateEventModal');
          },
        })}
      />
      <Tab.Screen name="FriendsTab" component={FriendsStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuth();

  // Clerk hydrates the session asynchronously on cold start. Until it
  // resolves we show a spinner — Hard Rule (loading states): spinner only,
  // no skeletons or shimmer (R5-2).
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.light.bg }}>
        <ActivityIndicator color={colors.light.accent} />
      </View>
    );
  }

  if (!isSignedIn) {
    return <AuthNavigator />;
  }

  return (
    <SearchProvider>
      <NotifSheetProvider>
        <RootStack.Navigator
          initialRouteName="Tabs"
          screenOptions={{ headerShown: false }}
        >
          <RootStack.Screen name="Tabs" component={TabNavigator} />
          <RootStack.Screen
            name="CreateEventModal"
            component={CreateEventStack}
            options={{
              presentation: 'fullScreenModal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
            }}
          />
        </RootStack.Navigator>
        {/* Mounted ABOVE the navigator: NotifSheet is a root-level overlay,
            not a screen — see GAP 6 prompt and R6-1. */}
        <NotifSheet />
      </NotifSheetProvider>
    </SearchProvider>
  );
}
