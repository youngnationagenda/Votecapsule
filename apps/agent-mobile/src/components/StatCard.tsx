// ============================================================
// VoteCapsule™ — StatCard
// Small metric card with coloured top border.
// Used on HomeScreen dashboard stats row.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatCardProps {
  label: string;
  value: number;
  color: string;
}

export function StatCard({ label, value, color }: StatCardProps) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 3,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
});
