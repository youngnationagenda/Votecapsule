// ============================================================
// VoteCapsule™ — Section wrapper
// A labelled section header + children container.
// Used on CaptureScreen, ReviewScreen, SettingsScreen.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  title: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
});
