// ============================================================
// VoteCapsule™ — ErrorBanner
// Red dismissible error banner shown on screens with errors.
// Used on LoginScreen, CaptureScreen, etc.
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.text} numberOfLines={3}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.dismiss}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  text: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  dismiss: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  dismissText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
});
