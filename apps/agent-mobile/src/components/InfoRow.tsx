// ============================================================
// VoteCapsule™ — InfoRow
// A single label + value row, optionally monospace.
// Used inside SectionCard on ReviewScreen & SettingsScreen.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
  small?: boolean;
  selectable?: boolean;
}

export function InfoRow({ label, value, mono, small, selectable }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text
        style={[styles.value, mono && styles.mono, small && styles.small]}
        selectable={selectable}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: {
    color: '#64748b',
    fontSize: 13,
    flexShrink: 0,
    marginRight: 8,
  },
  value: {
    color: '#cbd5e1',
    fontSize: 13,
    maxWidth: '60%',
    textAlign: 'right',
  },
  mono: {
    fontFamily: 'monospace',
    color: '#94a3b8',
    fontSize: 11,
  },
  small: {
    fontSize: 10,
  },
});
