// ============================================================
// VoteCapsule -- AI Confidence Badge Component
// apps/validator-mobile/src/components/ConfidenceBadge.tsx
//
// Color-coded AI confidence indicator:
// - Green: > 0.9 (90%)
// - Yellow: 0.7 - 0.9 (70-90%)
// - Red: < 0.7 (below 70%)
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ConfidenceBadgeProps {
  confidence: number; // 0-100 or 0-1 (auto-detected)
  size?: 'small' | 'medium' | 'large';
}

function normalizeConfidence(value: number): number {
  // If value <= 1 assume 0-1 scale, otherwise 0-100
  return value <= 1 ? value * 100 : value;
}

function getConfidenceColor(pct: number): string {
  if (pct >= 90) return '#16a34a'; // green
  if (pct >= 70) return '#d97706'; // amber
  return '#dc2626'; // red
}

function getConfidenceLabel(pct: number): string {
  if (pct >= 90) return 'High';
  if (pct >= 70) return 'Medium';
  return 'Low';
}

export default function ConfidenceBadge({ confidence, size = 'medium' }: ConfidenceBadgeProps) {
  const pct = Math.round(normalizeConfidence(confidence));
  const color = getConfidenceColor(pct);
  const label = getConfidenceLabel(pct);

  const fontSize = size === 'small' ? 11 : size === 'large' ? 16 : 13;
  const paddingH = size === 'small' ? 6 : size === 'large' ? 14 : 10;
  const paddingV = size === 'small' ? 2 : size === 'large' ? 8 : 4;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${color}18`,
          borderColor: color,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color, fontSize }]}>
        {pct}% {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
  },
});
