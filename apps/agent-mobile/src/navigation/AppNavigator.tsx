// ============================================================
// VoteCapsule™ — App Navigator
// apps/agent-mobile/src/navigation/AppNavigator.tsx
// ============================================================
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { startSyncEngine, stopSyncEngine } from '../services/syncEngine';

import LoginScreen        from '../screens/LoginScreen';
import HomeScreen         from '../screens/HomeScreen';
import CaptureScreen      from '../screens/CaptureScreen';
import ReviewScreen       from '../screens/ReviewScreen';
import QueueScreen        from '../screens/QueueScreen';
import StationSearchScreen from '../screens/StationSearchScreen';
import SettingsScreen     from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      startSyncEngine(30_000);
    } else {
      stopSyncEngine();
    }
    return () => stopSyncEngine();
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a1628', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle:       { backgroundColor: '#0f172a' },
          headerTintColor:   '#f1f5f9',
          headerTitleStyle:  { fontWeight: '600' },
          headerBackTitleVisible: false,
          contentStyle:      { backgroundColor: '#0a1628' },
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
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Capture"
              component={CaptureScreen}
              options={{ title: 'Capture Evidence' }}
            />
            <Stack.Screen
              name="Review"
              component={ReviewScreen}
              options={{ title: 'Review Submission', gestureEnabled: false }}
            />
            <Stack.Screen
              name="Queue"
              component={QueueScreen}
              options={{ title: 'Sync Queue' }}
            />
            <Stack.Screen
              name="StationSearch"
              component={StationSearchScreen}
              options={{ title: 'Find Station' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: 'Settings' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
