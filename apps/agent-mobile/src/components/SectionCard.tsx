// ============================================================
// VoteCapsule™ — SectionCard
// A labelled section with a dark card body.
// Used on ReviewScreen and SettingsScreen.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
  },
});
