// ============================================================
// VoteCapsule -- Validator Stats Screen
// apps/validator-mobile/src/screens/StatsScreen.tsx
//
// Personal stats dashboard: total reviewed, approval rate,
// avg review time, daily/weekly breakdown.
// ============================================================
import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useValidationStore } from '../store/validationStore';

export default function StatsScreen() {
  const { stats, fetchStats } = useValidationStore();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0B3C6D" size="large" />
      </View>
    );
  }

  const total = stats.totalReviewed || 1;
  const approvalRate = Math.round((stats.approved / total) * 100);
  const rejectionRate = Math.round((stats.rejected / total) * 100);
  const escalationRate = Math.round((stats.escalated / total) * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#0B3C6D"
          colors={['#0B3C6D']}
        />
      }
    >
      <Text style={styles.pageTitle}>Your Performance</Text>

      {/* Summary grid */}
      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalReviewed}</Text>
          <Text style={styles.statLabel}>Total Reviewed</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.escalated}</Text>
          <Text style={styles.statLabel}>Escalated</Text>
        </View>
      </View>

      {/* Rate breakdown */}
      <View style={styles.rateCard}>
        <Text style={styles.rateTitle}>Decision Breakdown</Text>

        {/* Approval rate */}
        <View style={styles.rateRow}>
          <Text style={styles.rateLabel}>Approval Rate</Text>
          <Text style={[styles.rateValue, { color: '#16a34a' }]}>{approvalRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${approvalRate}%`, backgroundColor: '#16a34a' }]} />
        </View>

        {/* Rejection rate */}
        <View style={[styles.rateRow, { marginTop: 12 }]}>
          <Text style={styles.rateLabel}>Rejection Rate</Text>
          <Text style={[styles.rateValue, { color: '#dc2626' }]}>{rejectionRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${rejectionRate}%`, backgroundColor: '#dc2626' }]} />
        </View>

        {/* Escalation rate */}
        <View style={[styles.rateRow, { marginTop: 12 }]}>
          <Text style={styles.rateLabel}>Escalation Rate</Text>
          <Text style={[styles.rateValue, { color: '#d97706' }]}>{escalationRate}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${escalationRate}%`, backgroundColor: '#d97706' }]} />
        </View>
      </View>

      {/* Average review time */}
      <View style={styles.timeCard}>
        <Text style={styles.timeLabel}>Average Review Time</Text>
        <Text style={styles.timeValue}>{formatDuration(stats.avgReviewTime)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 20 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', color: '#0B3C6D', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  rateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  rateTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  rateLabel: { fontSize: 14, color: '#4b5563' },
  rateValue: { fontSize: 14, fontWeight: '700' },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  timeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  timeLabel: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  timeValue: { fontSize: 32, fontWeight: '800', color: '#0B3C6D' },
});
