// ============================================================
// VoteCapsule™ — Home / Dashboard Screen
// apps/agent-mobile/src/screens/HomeScreen.tsx
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
  const { user, logout } = useAuthStore();
  const { isOnline, isWifi } = useNetworkSync();
  const [capsules, setCapsules]     = useState<LocalCapsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing]       = useState(false);
  const insets = useSafeAreaInsets();

  const loadCapsules = useCallback(async () => {
    const all = await getAllCapsules();
    setCapsules(all);
  }, []);

  // Reload whenever screen comes into focus (after capture, queue changes, etc.)
  useFocusEffect(
    useCallback(() => {
      loadCapsules();
    }, [loadCapsules]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCapsules();
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
            label="Capture Evidence"
            icon="📷"
            primary
            onPress={() => navigation.navigate('Capture', {})}
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
            label="Find Polling Station"
            icon="📍"
            onPress={() => navigation.navigate('StationSearch')}
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
        <InfoRow label="Role"       value={(user?.roles?.[0] ?? 'CAPSULE_AGENT')} />
        <InfoRow label="Device ID"  value={(user?.deviceId?.slice(0, 12) ?? '—') + '…'} mono />
        <InfoRow label="Total captured" value={String(totalLocal)} />
        <InfoRow label="Election"   value="Kenya General 2027" />
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
