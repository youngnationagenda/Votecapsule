// ============================================================
// VoteCapsule™ — StatusBadge
// Coloured pill badge for CapsuleStatus values.
// Used on QueueScreen and ReviewScreen.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CapsuleStatus } from '../types';

const STATUS_CONFIG: Record<CapsuleStatus, { color: string; label: string }> = {
  DRAFT:      { color: '#64748b', label: 'Draft'      },
  CAPTURED:   { color: '#f59e0b', label: 'Captured'   },
  QUEUED:     { color: '#3b82f6', label: 'Queued'     },
  UPLOADING:  { color: '#8b5cf6', label: 'Uploading…' },
  UPLOADED:   { color: '#22c55e', label: 'Uploaded'   },
  FAILED:     { color: '#ef4444', label: 'Failed'     },
};

interface StatusBadgeProps {
  status: CapsuleStatus;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot }: StatusBadgeProps) {
  const { color, label } = STATUS_CONFIG[status] ?? { color: '#64748b', label: status };
  return (
    <View style={styles.container}>
      {showDot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
