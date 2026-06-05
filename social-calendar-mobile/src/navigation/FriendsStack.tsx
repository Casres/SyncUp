/**
 * FriendsStack — Tab #3 stack navigator.
 *
 * Routes:
 *   FriendsList        (initial)  — hosts the Friends·Groups·Messages carousel
 *   AddFriend                     — QR / Link / Username (SegmentedSwitcher)
 *   FriendProfile                 — pushed from a FriendsList friend row
 *   FriendTypesManager            — reachable from Profile or Friend Profile
 *   MessageThread                 — DM / group chat thread (pushed from inbox)
 *   GroupDetail / CreateGroup / CoverPickerSheet
 *                                 — Groups is a Friends-tab SEGMENT (R17-1), so
 *                                   these push within FriendsStack from the
 *                                   Groups pane (no separate Groups tab).
 *
 * The Messages inbox is a SEGMENT of FriendsList, not a route.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { FriendsStackParamList } from './types';
import FriendsListScreen from '../screens/friends/FriendsListScreen';
import AddFriendScreen from '../screens/friends/AddFriendScreen';
import FriendProfileScreen from '../screens/friends/FriendProfileScreen';
import FriendTypesManagerScreen from '../screens/friends/FriendTypesManagerScreen';
import MessageThreadScreen from '../screens/friends/MessageThreadScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import CoverPickerSheetScreen from '../screens/groups/CoverPickerSheetScreen';

const Stack = createNativeStackNavigator<FriendsStackParamList>();

export default function FriendsStack() {
  return (
    <Stack.Navigator
      initialRouteName="FriendsList"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="FriendsList" component={FriendsListScreen} />
      <Stack.Screen name="AddFriend" component={AddFriendScreen} />
      <Stack.Screen name="FriendProfile" component={FriendProfileScreen} />
      <Stack.Screen
        name="FriendTypesManager"
        component={FriendTypesManagerScreen}
      />
      <Stack.Screen name="MessageThread" component={MessageThreadScreen} />
      <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <Stack.Screen
        name="CoverPickerSheet"
        component={CoverPickerSheetScreen}
        options={{
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.5, 1.0],
          sheetCornerRadius: 16,
        }}
      />
    </Stack.Navigator>
  );
}
