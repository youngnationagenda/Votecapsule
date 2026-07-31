// ============================================================
// VoteCapsule™ — Queue Screen
// apps/agent-mobile/src/screens/QueueScreen.tsx
//
// Shows the offline sync queue with per-capsule status.
// Allows manual retry and deletion of failed items.
// ============================================================
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { LocalCapsule } from '../types';
import { getAllCapsules, deleteCapsule } from '../utils/storage';
import { runSync } from '../services/syncEngine';

const STATUS_COLORS: Record<string, string> = {
  CAPTURED:   '#f59e0b',
  QUEUED:     '#3b82f6',
  UPLOADING:  '#8b5cf6',
  UPLOADED:   '#22c55e',
  FAILED:     '#ef4444',
  DRAFT:      '#64748b',
};

export default function QueueScreen() {
  const [capsules, setCapsules]     = useState<LocalCapsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing]       = useState(false);

  const load = useCallback(async () => {
    const all = await getAllCapsules();
    // Show most recent first
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
      `Delete capsule ${capsule.localId.slice(0, 8)}…? This cannot be undone.`,
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

  const renderItem = ({ item }: { item: LocalCapsule }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] ?? '#64748b' }]} />
        <Text style={styles.statusText}>{item.status}</Text>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
      </View>

      <Text style={styles.stationCode}>{item.iebcStationCode}</Text>
      <Text style={styles.position}>{item.positionCode} · {item.electionYear}</Text>

      {item.lastSyncError && (
        <Text style={styles.errorMsg}>{item.lastSyncError}</Text>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.attempts}>Attempts: {item.syncAttempts}</Text>
        {item.serverId && (
          <Text style={styles.serverId}>Server: {item.serverId.slice(0, 8)}…</Text>
        )}
        {(item.status === 'FAILED' || item.status === 'QUEUED') && (
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteBtn}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sync button */}
      <TouchableOpacity
        style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
        onPress={handleSyncNow}
        disabled={syncing}
      >
        <Text style={styles.syncBtnText}>
          {syncing ? '⬆️  Syncing…' : '⬆️  Sync Now'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={capsules}
        keyExtractor={(c) => c.localId}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No capsules in queue</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  syncBtn:          { margin: 16, backgroundColor: '#3b82f6', borderRadius: 10, padding: 14, alignItems: 'center' },
  syncBtnDisabled:  { opacity: 0.5 },
  syncBtnText:      { color: '#fff', fontSize: 15, fontWeight: '600' },
  card:             { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 10 },
  cardHeader:       { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot:        { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText:       { color: '#94a3b8', fontSize: 12, fontWeight: '600', flex: 1 },
  dateText:         { color: '#475569', fontSize: 11 },
  stationCode:      { color: '#cbd5e1', fontSize: 14, fontFamily: 'monospace', marginBottom: 2 },
  position:         { color: '#64748b', fontSize: 12 },
  errorMsg:         { color: '#f87171', fontSize: 11, marginTop: 6, backgroundColor: '#1a0a0a', borderRadius: 4, padding: 6 },
  cardFooter:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  attempts:         { color: '#475569', fontSize: 11 },
  serverId:         { color: '#22c55e', fontSize: 11, fontFamily: 'monospace', flex: 1 },
  deleteBtn:        { color: '#ef4444', fontSize: 12 },
  empty:            { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText:        { color: '#475569', fontSize: 15 },
});
