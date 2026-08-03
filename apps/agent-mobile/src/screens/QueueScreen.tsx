// ============================================================
// VoteCapsule™ — Queue Screen
// apps/agent-mobile/src/screens/QueueScreen.tsx
//
// Shows the offline sync queue with per-capsule status.
// Allows manual retry (Sync Now) and deletion of failed items.
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocalCapsule } from '../types';
import { getAllCapsules, deleteCapsule } from '../utils/storage';
import { runSync } from '../services/syncEngine';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState }  from '../components/EmptyState';

export default function QueueScreen() {
  const [capsules, setCapsules]     = useState<LocalCapsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    const all = await getAllCapsules();
    // Most recent first
    setCapsules(all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await runSync();
    await load();
    setSyncing(false);
  };

  const handleDelete = (capsule: LocalCapsule) => {
    Alert.alert(
      'Delete from Queue',
      `Delete capsule ${capsule.localId.slice(0, 8)}…?\n\nThis cannot be undone. The server will never receive this evidence.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCapsule(capsule.localId);
            await load();
          },
        },
      ],
    );
  };

  const pending  = capsules.filter((c) => c.status === 'QUEUED' || c.status === 'CAPTURED').length;
  const failed   = capsules.filter((c) => c.status === 'FAILED').length;
  const uploaded = capsules.filter((c) => c.status === 'UPLOADED').length;

  const renderItem = ({ item }: { item: LocalCapsule }) => (
    <View style={styles.card}>
      {/* Card header: status + timestamp */}
      <View style={styles.cardHeader}>
        <StatusBadge status={item.status} showDot />
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}{' '}
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {/* Station + position */}
      <Text style={styles.stationCode}>{item.iebcStationCode}</Text>
      <Text style={styles.position}>
        {item.positionCode} · Kenya General {item.electionYear}
      </Text>

      {/* Server ID on success */}
      {item.serverId && (
        <Text style={styles.serverId}>
          Server: {item.serverId.slice(0, 16)}…
        </Text>
      )}

      {/* Error message */}
      {item.lastSyncError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} numberOfLines={3}>{item.lastSyncError}</Text>
        </View>
      )}

      {/* Footer: attempts + delete */}
      <View style={styles.cardFooter}>
        <Text style={styles.attempts}>
          {item.syncAttempts} attempt{item.syncAttempts !== 1 ? 's' : ''}
        </Text>
        {(item.status === 'FAILED' || item.status === 'QUEUED' || item.status === 'CAPTURED') && (
          <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Summary row ──────────────────────────────────── */}
      <View style={styles.summary}>
        <SummaryChip label="Pending"  count={pending}  color="#f59e0b" />
        <SummaryChip label="Uploaded" count={uploaded} color="#22c55e" />
        <SummaryChip label="Failed"   count={failed}   color="#ef4444" />
      </View>

      {/* ── Sync button ──────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
        onPress={handleSyncNow}
        disabled={syncing}
      >
        <Text style={styles.syncBtnText}>
          {syncing ? '⬆️  Syncing…' : '⬆️  Sync Now'}
        </Text>
      </TouchableOpacity>

      {/* ── List ─────────────────────────────────────────── */}
      <FlatList
        data={capsules}
        keyExtractor={(c) => c.localId}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="📭"
            title="No capsules in queue"
            subtitle="Captured evidence will appear here once you photograph a Form 35A."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      />
    </View>
  );
}

function SummaryChip({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipCount, { color }]}>{count}</Text>
      <Text style={styles.chipLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a1628' },

  // Summary
  summary:      { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  chip:         { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, padding: 10, alignItems: 'center' },
  chipCount:    { fontSize: 20, fontWeight: '700' },
  chipLabel:    { color: '#64748b', fontSize: 11, marginTop: 2 },

  // Sync button
  syncBtn: {
    margin: 16,
    marginTop: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  syncBtnDisabled: { opacity: 0.5 },
  syncBtnText:     { color: '#fff', fontSize: 15, fontWeight: '600' },

  // List
  listContent:  { paddingHorizontal: 16 },

  // Cards
  card:         { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dateText:     { color: '#475569', fontSize: 11 },
  stationCode:  { color: '#cbd5e1', fontSize: 14, fontFamily: 'monospace', marginBottom: 2 },
  position:     { color: '#64748b', fontSize: 12, marginBottom: 4 },
  serverId:     { color: '#22c55e', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  errorBox: {
    backgroundColor: '#1a0808',
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#ef4444',
  },
  errorText:    { color: '#f87171', fontSize: 11, lineHeight: 16 },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  attempts:     { color: '#475569', fontSize: 11 },
  deleteBtn:    { paddingVertical: 4, paddingHorizontal: 8 },
  deleteBtnText:{ color: '#ef4444', fontSize: 12, fontWeight: '500' },
});
