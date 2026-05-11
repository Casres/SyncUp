/**
 * ExploreStack — native-stack navigator for the Explore tab.
 *
 * Screens:
 *   Explore       → ExploreScreen (feed)
 *   ExploreDetail → ExploreDetailScreen (venue/event detail + Create Event CTA)
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { ExploreStackParamList } from './types';
import ExploreScreen      from '../screens/explore/ExploreScreen';
import ExploreDetailScreen from '../screens/explore/ExploreDetailScreen';

const Stack = createNativeStackNavigator<ExploreStackParamList>();

export default function ExploreStack(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Explore"       component={ExploreScreen} />
      <Stack.Screen name="ExploreDetail" component={ExploreDetailScreen} />
    </Stack.Navigator>
  );
}
