// ============================================================
// VoteCapsule™ — ActionButton
// Large tappable row with icon + label + optional badge.
// Used on HomeScreen action list.
// ============================================================
import React from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet,
  GestureResponderEvent,
} from 'react-native';

interface ActionButtonProps {
  label: string;
  icon: string;
  primary?: boolean;
  onPress: (event: GestureResponderEvent) => void;
  badge?: number;
  disabled?: boolean;
}

export function ActionButton({
  label, icon, primary, onPress, badge, disabled,
}: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        primary && styles.btnPrimary,
        disabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, primary && styles.labelPrimary]}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#3b82f6',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    color: '#94a3b8',
    fontSize: 15,
    flex: 1,
  },
  labelPrimary: {
    color: '#fff',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
