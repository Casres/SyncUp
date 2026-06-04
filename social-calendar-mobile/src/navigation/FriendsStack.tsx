/**
 * FriendsStack — Tab #3 stack navigator.
 *
 * Routes:
 *   FriendsList        (initial)
 *   AddFriend                     — QR / Link / Username (SegmentedSwitcher)
 *   FriendProfile                 — pushed from FriendsList row
 *   FriendTypesManager            — reachable from Profile or Friend Profile
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { FriendsStackParamList } from './types';
import FriendsListScreen from '../screens/friends/FriendsListScreen';
import AddFriendScreen from '../screens/friends/AddFriendScreen';
import FriendProfileScreen from '../screens/friends/FriendProfileScreen';
import FriendTypesManagerScreen from '../screens/friends/FriendTypesManagerScreen';
import MessagesScreen from '../screens/friends/MessagesScreen';
import MessageThreadScreen from '../screens/friends/MessageThreadScreen';

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
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="MessageThread" component={MessageThreadScreen} />
    </Stack.Navigator>
  );
}
