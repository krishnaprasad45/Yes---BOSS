import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '@/screens/HomeScreen';
import { SpendingScreen } from '@/screens/SpendingScreen';
import { CallsStack } from '@/navigation/CallsStack';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PendingRecapReview } from '@/components/feature/PendingRecapReview';
import { House, Phone, ChartColumnBig, Settings2, type LucideIcon } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeContext';

export type AppTabsParamList = {
  Home: undefined;
  Calls: undefined;
  Finance: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

/** Lucide tab icon that lifts + brightens when its tab is focused. */
function tabIcon(Icon: LucideIcon) {
  return ({ focused, color }: { focused: boolean; color: string }) => {
    const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
    useEffect(() => {
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.9,
        useNativeDriver: true,
        speed: 30,
        bounciness: 10,
      }).start();
    }, [focused, scale]);
    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon size={23} color={color} strokeWidth={focused ? 2.6 : 2} />
      </Animated.View>
    );
  };
}

export function AppTabs() {
  const { colors } = useTheme();
  return (
    <>
      <PendingRecapReview />
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
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: tabIcon(House) }} />
        <Tab.Screen name="Calls" component={CallsStack} options={{ tabBarIcon: tabIcon(Phone) }} />
        <Tab.Screen
          name="Finance"
          component={SpendingScreen}
          options={{ tabBarIcon: tabIcon(ChartColumnBig) }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarIcon: tabIcon(Settings2) }}
        />
      </Tab.Navigator>
    </>
  );
}
