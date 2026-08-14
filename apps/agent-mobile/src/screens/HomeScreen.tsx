// ============================================================
// VoteCapsule™ — Home / Dashboard Screen (Assignment-Scoped)
// apps/agent-mobile/src/screens/HomeScreen.tsx
//
// The HomeScreen now fetches the agent's assignment on focus
// and displays ONLY the assigned election. This prevents:
//   - Agents seeing elections they weren't assigned to
//   - Capturing for wrong elections/stations
//   - Hardcoded election names
//
// Assignment flow:
//   1. Agent logs in → authStore gets tokens
//   2. HomeScreen focused → assignmentStore.fetchAssignment()
//   3. UI renders the assigned election name, stations, position
//   4. "Capture Evidence" button passes assignment context to Capture
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList, LocalCapsule } from '../types';
import { useAuthStore } from '../store/authStore';
import { useAssignmentStore } from '../store/assignmentStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { getAllCapsules } from '../utils/storage';
import { runSync } from '../services/syncEngine';
import { StatCard }     from '../components/StatCard';
import { ActionButton } from '../components/ActionButton';
import { NetworkBadge } from '../components/NetworkBadge';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { user, tokens, logout } = useAuthStore();
  const { assignment, isLoading: assignmentLoading, error: assignmentError, fetchAssignment, hydrate } = useAssignmentStore();
  const { isOnline, isWifi } = useNetworkSync();
  const [capsules, setCapsules]     = useState<LocalCapsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const insets = useSafeAreaInsets();

  const loadCapsules = useCallback(async () => {
    const all = await getAllCapsules();
    setCapsules(all);
  }, []);

  // Hydrate cached assignment on mount
  useEffect(() => { hydrate(); }, []);

  // Fetch assignment whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCapsules();
      if (user && tokens?.accessToken) {
        fetchAssignment(user.userId, user.tenantId, tokens.accessToken);
      }
    }, [loadCapsules, user, tokens]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCapsules();
    if (user && tokens?.accessToken) {
      await fetchAssignment(user.userId, user.tenantId, tokens.accessToken);
    }
    setRefreshing(false);
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You are currently offline. Sync will happen automatically when connectivity is restored.');
      return;
    }
    setSyncing(true);
    await runSync();
    await loadCapsules();
    setSyncing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Any unsynced evidence will remain on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    );
  };

  const pending   = capsules.filter((c) => c.status === 'QUEUED' || c.status === 'CAPTURED').length;
  const uploading = capsules.filter((c) => c.status === 'UPLOADING').length;
  const uploaded  = capsules.filter((c) => c.status === 'UPLOADED').length;
  const failed    = capsules.filter((c) => c.status === 'FAILED').length;
  const totalLocal = capsules.length;

  // ── Derived assignment values ──────────────────────────────
  const hasAssignment = !!assignment;
  const electionName = assignment?.election.electionName ?? 'No Election Assigned';
  const positionLabel = assignment?.election.positionLabel ?? '—';
  const areaName = assignment?.areaName ?? '—';
  const stationCount = assignment?.stations.length ?? 0;
  const assignmentStatus = assignment?.status ?? 'UNASSIGNED';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.name}>{user?.fullName ?? 'Agent'}</Text>
          <Text style={styles.tenant}>
            {user?.tenantId ? `Tenant: ${user.tenantId.slice(0, 12)}…` : ''}
          </Text>
        </View>
        <NetworkBadge isOnline={isOnline} isWifi={isWifi} />
      </View>

      {/* ── Assignment Card ────────────────────────────────── */}
      {assignmentLoading && !assignment ? (
        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentLoading}>Loading assignment…</Text>
        </View>
      ) : hasAssignment ? (
        <View style={styles.assignmentCard}>
          <View style={styles.assignmentHeader}>
            <View style={[styles.assignmentDot, { backgroundColor: assignmentStatus === 'ACTIVE' ? '#22c55e' : '#f59e0b' }]} />
            <Text style={styles.assignmentStatus}>{assignmentStatus}</Text>
          </View>
          <Text style={styles.assignmentElection}>{electionName}</Text>
          <View style={styles.assignmentMeta}>
            <View style={styles.assignmentMetaItem}>
              <Text style={styles.assignmentMetaLabel}>Position</Text>
              <Text style={styles.assignmentMetaValue}>{positionLabel}</Text>
            </View>
            <View style={styles.assignmentMetaItem}>
              <Text style={styles.assignmentMetaLabel}>Area</Text>
              <Text style={styles.assignmentMetaValue}>{areaName}</Text>
            </View>
            <View style={styles.assignmentMetaItem}>
              <Text style={styles.assignmentMetaLabel}>Stations</Text>
              <Text style={styles.assignmentMetaValue}>{stationCount}</Text>
            </View>
          </View>

          {/* Station list (scrollable if many) */}
          {stationCount > 0 && (
            <View style={styles.stationListContainer}>
              <Text style={styles.stationListTitle}>YOUR STATIONS</Text>
              {assignment!.stations.slice(0, 5).map((station) => (
                <View key={station.iebcCode} style={styles.stationRow}>
                  <View style={styles.stationRowLeft}>
                    <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
                    <Text style={styles.stationCentre}>{station.centreName}</Text>
                  </View>
                  <View style={styles.stationRowRight}>
                    {station.streamNumber != null && (
                      <View style={styles.streamBadge}>
                        <Text style={styles.streamBadgeText}>S{station.streamNumber}</Text>
                      </View>
                    )}
                    <Text style={styles.stationVoters}>{station.registeredVoters.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
              {stationCount > 5 && (
                <Text style={styles.moreStations}>+{stationCount - 5} more stations</Text>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noAssignmentCard}>
          <Text style={styles.noAssignmentIcon}>📋</Text>
          <Text style={styles.noAssignmentTitle}>No Assignment</Text>
          <Text style={styles.noAssignmentText}>
            You haven't been assigned to any election yet. Contact your party administrator to receive an assignment.
          </Text>
          {assignmentError && (
            <Text style={styles.assignmentErrorText}>{assignmentError}</Text>
          )}
        </View>
      )}

      {/* ── Uploading indicator ─────────────────────────────── */}
      {uploading > 0 && (
        <View style={styles.uploadingBanner}>
          <Text style={styles.uploadingText}>
            ⬆️  Uploading {uploading} capsule{uploading > 1 ? 's' : ''}…
          </Text>
        </View>
      )}

      {/* ── Stats row ──────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard label="Pending"  value={pending}  color="#f59e0b" />
        <StatCard label="Uploaded" value={uploaded} color="#22c55e" />
        <StatCard label="Failed"   value={failed}   color="#ef4444" />
      </View>

      {/* ── Primary actions ────────────────────────────────── */}
      <View style={styles.actionsSection}>
        <Text style={styles.actionsLabel}>ACTIONS</Text>
        <View style={styles.actions}>
          <ActionButton
            label={hasAssignment ? `Capture — ${positionLabel}` : 'Capture Evidence'}
            icon="📷"
            primary
            onPress={() => navigation.navigate('Capture', {})}
            disabled={!hasAssignment || assignmentStatus !== 'ACTIVE'}
          />
          <ActionButton
            label={syncing ? 'Syncing…' : 'Sync Queue'}
            icon="⬆️"
            onPress={handleSyncNow}
            badge={pending}
            disabled={syncing}
          />
          <ActionButton
            label="View Sync Queue"
            icon="📋"
            onPress={() => navigation.navigate('Queue')}
            badge={failed > 0 ? failed : undefined}
          />
          <ActionButton
            label="Settings"
            icon="⚙️"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>

      {/* ── Device info card ───────────────────────────────── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>DEVICE</Text>
        <InfoRow label="Role" value={(user?.roles?.[0] ?? 'CAPSULE_AGENT')} />
        <InfoRow label="Device ID" value={(user?.deviceId?.slice(0, 12) ?? '—') + '…'} mono />
        <InfoRow label="Total captured" value={String(totalLocal)} />
        <InfoRow
          label="Election"
          value={hasAssignment ? electionName : 'Not assigned'}
        />
        <InfoRow
          label="Geo-fence"
          value={hasAssignment ? `${assignment!.geofenceRadiusMeters}m radius` : '—'}
        />
      </View>

      {/* ── Sign out ───────────────────────────────────────── */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.monoValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  greeting:         { color: '#64748b', fontSize: 13 },
  name:             { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginTop: 2 },
  tenant:           { color: '#475569', fontSize: 11, marginTop: 2 },

  // Assignment card
  assignmentCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#0f2d1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#166534',
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  assignmentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  assignmentStatus: {
    color: '#86efac',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignmentElection: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  assignmentMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  assignmentMetaItem: {
    flex: 1,
  },
  assignmentMetaLabel: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  assignmentMetaValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  assignmentLoading: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },

  // Station list
  stationListContainer: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 197, 94, 0.2)',
  },
  stationListTitle: {
    color: '#4ade80',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  stationRowLeft: {
    flex: 1,
    marginRight: 8,
  },
  stationName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
  },
  stationCentre: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  stationRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamBadge: {
    backgroundColor: '#1e3a5f',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  streamBadgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '700',
  },
  stationVoters: {
    color: '#94a3b8',
    fontSize: 11,
  },
  moreStations: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },

  // No assignment
  noAssignmentCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  noAssignmentIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noAssignmentTitle: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  noAssignmentText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  assignmentErrorText: {
    color: '#ef4444',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },

  // Uploading
  uploadingBanner: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#312e81',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  uploadingText:    { color: '#c4b5fd', fontSize: 13 },

  // Stats
  statsRow:         { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 24 },

  // Actions
  actionsSection:   { paddingHorizontal: 24, marginBottom: 24 },
  actionsLabel:     { color: '#334155', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 10 },
  actions:          { gap: 8 },

  // Device info
  infoCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
  },
  infoCardTitle: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  infoRow:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  infoLabel:        { color: '#64748b', fontSize: 13 },
  infoValue:        { color: '#cbd5e1', fontSize: 13 },
  monoValue:        { fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' },

  // Logout
  logoutBtn:        { marginHorizontal: 24, marginBottom: 16, padding: 14, alignItems: 'center' },
  logoutText:       { color: '#ef4444', fontSize: 15 },
});
