/**
 * GroupsStack — Tab #4 stack navigator.
 *
 * Routes:
 *   GroupsList         (initial)
 *   CreateGroup                     — NO invite flow here (Hard Rule 10)
 *   GroupDetail                     — TabPills: Members / Events / Polls / Ideas
 *   CoverPickerSheet                — modal sheet (formSheet presentation)
 *
 * `CoverPickerSheet` uses `presentation: 'formSheet'` (RN Screens 4.x picks the
 * native iOS sheet with grab handle when available; Android falls back to a
 * non-fullscreen modal). NAVIGATION.md treats it as a sheet.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { GroupsStackParamList } from './types';
import GroupsListScreen from '../screens/groups/GroupsListScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import CoverPickerSheetScreen from '../screens/groups/CoverPickerSheetScreen';

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export default function GroupsStack() {
  return (
    <Stack.Navigator
      initialRouteName="GroupsList"
      screenOptions={{
        headerShown: false,
        animation: 'default',
      }}
    >
      <Stack.Screen name="GroupsList" component={GroupsListScreen} />
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
