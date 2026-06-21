import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Call } from '@yes-boss/shared';
import { CallsScreen } from '@/screens/CallsScreen';
import { CallDetailScreen } from '@/screens/CallDetailScreen';
import { useTheme } from '@/theme/ThemeContext';

export type CallsStackParamList = {
  CallsList: { today?: boolean } | undefined;
  CallDetail: { call: Call };
};

const Stack = createNativeStackNavigator<CallsStackParamList>();

/** Calls tab: list + detail (with recap). */
export function CallsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CallsList"
        component={CallsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CallDetail"
        component={CallDetailScreen}
        options={{
          title: 'Call',
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
        }}
      />
    </Stack.Navigator>
  );
}
