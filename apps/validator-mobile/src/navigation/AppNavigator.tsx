// ============================================================
// VoteCapsule -- Validator App Navigator
// apps/validator-mobile/src/navigation/AppNavigator.tsx
//
// Auth stack: LoginScreen
// Main stack (tab navigator): QueueScreen, HistoryScreen, StatsScreen, SettingsScreen
// Detail stack: CapsuleReviewScreen, ImageViewerScreen
// ============================================================
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

import { RootStackParamList, MainTabParamList } from '../types';
import { useAuthStore } from '../store/authStore';

import LoginScreen from '../screens/LoginScreen';
import QueueScreen from '../screens/QueueScreen';
import HistoryScreen from '../screens/HistoryScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CapsuleReviewScreen from '../screens/CapsuleReviewScreen';
import ImageViewerScreen from '../screens/ImageViewerScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 10, color: focused ? '#0B3C6D' : '#9ca3af', fontWeight: focused ? '700' : '400' }}>
      {label}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0B3C6D' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: '#0B3C6D',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#e5e7eb' },
      }}
    >
      <Tab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          title: 'Validation Queue',
          tabBarLabel: 'Queue',
          tabBarIcon: ({ focused }) => <TabIcon label="[Q]" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'My Decisions',
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <TabIcon label="[H]" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          title: 'Performance',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ focused }) => <TabIcon label="[S]" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="[=]" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0B3C6D', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#ffffff" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0B3C6D' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600' },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: '#f8fafc' },
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CapsuleReview"
              component={CapsuleReviewScreen}
              options={{ title: 'Review Capsule', gestureEnabled: false }}
            />
            <Stack.Screen
              name="ImageViewer"
              component={ImageViewerScreen}
              options={{ title: 'Evidence Image', headerTransparent: true }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
