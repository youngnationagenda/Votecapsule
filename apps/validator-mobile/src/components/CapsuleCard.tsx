// ============================================================
// VoteCapsule -- Capsule Card Component
// apps/validator-mobile/src/components/CapsuleCard.tsx
//
// Queue item card with key info summary:
// - Station name + code
// - Position being reviewed
// - AI confidence badge
// - Time in queue
// - Priority indicator
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CapsuleForReview } from '../types';
import ConfidenceBadge from './ConfidenceBadge';

interface CapsuleCardProps {
  capsule: CapsuleForReview;
  onPress: () => void;
}

function formatTimeAgo(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return '#dc2626';
    case 'medium': return '#d97706';
    case 'low': return '#6b7280';
    default: return '#6b7280';
  }
}

function getPriorityBg(priority: string): string {
  switch (priority) {
    case 'high': return '#fef2f2';
    case 'medium': return '#fef3c7';
    case 'low': return '#f3f4f6';
    default: return '#f3f4f6';
  }
}

export default function CapsuleCard({ capsule, onPress }: CapsuleCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header: Station name + Priority + Confidence */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.stationName} numberOfLines={1}>{capsule.stationName}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityBg(capsule.priority) }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(capsule.priority) }]}>
              {capsule.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        <ConfidenceBadge confidence={capsule.aiConfidence} size="small" />
      </View>

      {/* Body: Key info rows */}
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Station Code</Text>
          <Text style={styles.cardValue}>{capsule.stationCode}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Position</Text>
          <Text style={styles.cardValue}>{capsule.position}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>Agent</Text>
          <Text style={styles.cardValue}>{capsule.agentName}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>In Queue</Text>
          <Text style={styles.cardValue}>{formatTimeAgo(capsule.submittedAt)}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Text style={styles.tapHint}>Tap to review</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: { flex: 1, marginRight: 8 },
  stationName: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardBody: { gap: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 13, color: '#6b7280' },
  cardValue: { fontSize: 13, color: '#374151', fontWeight: '500' },
  cardFooter: { marginTop: 12, alignItems: 'flex-end' },
  tapHint: { fontSize: 12, color: '#9ca3af' },
});
