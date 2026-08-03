// ============================================================
// VoteCapsule™ — NetworkBadge
// Online/Offline indicator pill shown on HomeScreen header.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NetworkBadgeProps {
  isOnline: boolean;
  isWifi: boolean;
}

export function NetworkBadge({ isOnline, isWifi }: NetworkBadgeProps) {
  const label   = isOnline ? (isWifi ? 'WiFi' : 'Data') : 'Offline';
  const dotColor = isOnline ? '#22c55e' : '#ef4444';

  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  text: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
