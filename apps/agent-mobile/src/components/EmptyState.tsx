// ============================================================
// VoteCapsule™ — EmptyState
// Centred empty-list placeholder with optional icon + action.
// ============================================================
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  GestureResponderEvent,
} from 'react-native';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: (e: GestureResponderEvent) => void;
}

export function EmptyState({
  icon, title, subtitle, actionLabel, onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.action} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#334155',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  action: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  actionText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '600',
  },
});
