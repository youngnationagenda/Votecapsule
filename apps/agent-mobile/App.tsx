// ============================================================
// VoteCapsule™ — Agent Mobile App Entry Point
// apps/agent-mobile/App.tsx
// ============================================================
import 'reflect-metadata';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0a1628" />
      <AppNavigator />
    </>
  );
}
