// ============================================================
// VoteCapsule™ — App Navigator
// apps/agent-mobile/src/navigation/AppNavigator.tsx
//
// Auth-gated React Navigation stack.
// - While hydrating from AsyncStorage → shows spinner
// - Unauthenticated → Login screen only
// - Authenticated   → full agent stack
//
// The SafeAreaProvider is mounted in App.tsx, so all screens
// can safely use useSafeAreaInsets() without nesting issues.
// ============================================================
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { startSyncEngine, stopSyncEngine } from '../services/syncEngine';

import LoginScreen        from '../screens/LoginScreen';
import HomeScreen         from '../screens/HomeScreen';
import CaptureScreen      from '../screens/CaptureScreen';
import ReviewScreen       from '../screens/ReviewScreen';
import TallyEntryScreen   from '../screens/TallyEntryScreen';
import QueueScreen        from '../screens/QueueScreen';
import StationSearchScreen from '../screens/StationSearchScreen';
import SettingsScreen     from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  // Restore auth state from AsyncStorage on first mount
  useEffect(() => {
    hydrate();
  }, []);

  // Start / stop background sync engine based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      startSyncEngine(30_000);
    } else {
      stopSyncEngine();
    }
    return () => stopSyncEngine();
  }, [isAuthenticated]);

  // ── Loading / hydrating ──────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashShield}>
          <Text style={styles.splashCheck}>✓</Text>
        </View>
        <Text style={styles.splashTitle}>VoteCapsule™</Text>
        <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 32 }} />
      </View>
    );
  }

  // ── Navigation stack ─────────────────────────────────────
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle:            { backgroundColor: '#0f172a' },
          headerTintColor:        '#f1f5f9',
          headerTitleStyle:       { fontWeight: '600', fontSize: 16 },
          headerBackTitleVisible: false,
          headerShadowVisible:    false,
          contentStyle:           { backgroundColor: '#0a1628' },
          animation:              'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          // ── Unauthenticated stack ─────────────────────────
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false, animation: 'fade' }}
          />
        ) : (
          // ── Authenticated stack ───────────────────────────
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
              options={{
                title:          'Review Submission',
                gestureEnabled: false,   // prevent accidental swipe-back
              }}
            />
            <Stack.Screen
              name="TallyEntry"
              component={TallyEntryScreen}
              options={{
                title:          'Enter Tally Data',
                gestureEnabled: false,   // prevent accidental swipe-back
              }}
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

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0a1628',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashShield: {
    width: 80,
    height: 88,
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  splashCheck:  { fontSize: 36, color: '#22d3ee' },
  splashTitle:  { fontSize: 28, fontWeight: '700', color: '#3b82f6', letterSpacing: 1 },
});
