// ============================================================
// VoteCapsule -- Validator Mobile App Entry Point
// apps/validator-mobile/App.tsx
// ============================================================
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0B3C6D" />
      <AppNavigator />
    </>
  );
}
