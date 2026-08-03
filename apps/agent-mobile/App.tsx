// ============================================================
// VoteCapsule™ — Agent Mobile App Entry Point
// apps/agent-mobile/App.tsx
// ============================================================
import 'reflect-metadata';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0a1628" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
