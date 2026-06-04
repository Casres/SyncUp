/**
 * HomeStack — Tab #1 stack navigator.
 *
 * Routes:
 *   Home          (initial) — Today / Week / Month views
 *   EventDetail              — pushed from Home feed item or cross-stack
 *
 * Transitions: native step push (240ms easeStd) — handled by native-stack defaults.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { HomeStackParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import EventDetailScreen from '../screens/events/EventDetailScreen';
import EventChatScreen from '../screens/events/EventChatScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      <Stack.Screen name="EventChat" component={EventChatScreen} />
    </Stack.Navigator>
  );
}
