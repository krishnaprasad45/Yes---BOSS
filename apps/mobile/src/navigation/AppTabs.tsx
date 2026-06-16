import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/screens/HomeScreen';
import { SpendingScreen } from '@/screens/SpendingScreen';
import { CallsStack } from '@/navigation/CallsStack';
import { SettingsScreen } from '@/screens/SettingsScreen';

export type AppTabsParamList = {
  Dashboard: undefined;
  Spending: undefined;
  Calls: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

// Simple emoji icons keep the bundle lean (no vector-icon native dep yet).
function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#111',
        tabBarInactiveTintColor: '#999',
      }}>
      <Tab.Screen
        name="Dashboard"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="Spending"
        component={SpendingScreen}
        options={{ tabBarIcon: tabIcon('💰') }}
      />
      <Tab.Screen
        name="Calls"
        component={CallsStack}
        options={{ tabBarIcon: tabIcon('📞') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: tabIcon('⚙️') }}
      />
    </Tab.Navigator>
  );
}
