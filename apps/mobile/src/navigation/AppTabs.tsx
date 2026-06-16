import React from 'react';
import { Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/screens/HomeScreen';
import { SpendingScreen } from '@/screens/SpendingScreen';
import { CallsStack } from '@/navigation/CallsStack';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { colors } from '@/theme/theme';

export type AppTabsParamList = {
  Home: undefined;
  Calls: undefined;
  Finance: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

// Simple emoji icons keep the bundle lean (no vector-icon native dep yet).
function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 19, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsStack}
        options={{ tabBarIcon: tabIcon('📞') }}
      />
      <Tab.Screen
        name="Finance"
        component={SpendingScreen}
        options={{ tabBarIcon: tabIcon('📊') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcon('⚙️') }}
      />
    </Tab.Navigator>
  );
}
