// ============================================================
// VoteCapsule™ — Home / Dashboard Screen
// apps/agent-mobile/src/screens/HomeScreen.tsx
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { getAllCapsules } from '../utils/storage';
import { LocalCapsule } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuthStore();
  const { isOnline, isWifi } = useNetworkSync();
  const [capsules, setCapsules]   = useState<LocalCapsule[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadCapsules = async () => {
    const all = await getAllCapsules();
    setCapsules(all);
  };

  useEffect(() => { loadCapsules(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCapsules();
    setRefreshing(false);
  };

  const pending   = capsules.filter((c) => c.status === 'QUEUED' || c.status === 'CAPTURED').length;
  const uploaded  = capsules.filter((c) => c.status === 'UPLOADED').length;
  const failed    = capsules.filter((c) => c.status === 'FAILED').length;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.name}>{user?.fullName ?? 'Agent'}</Text>
        </View>
        <View style={styles.networkBadge}>
          <View style={[styles.dot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.networkText}>{isOnline ? (isWifi ? 'WiFi' : 'Data') : 'Offline'}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatCard label="Queued"   value={pending}  color="#f59e0b" />
        <StatCard label="Uploaded" value={uploaded} color="#22c55e" />
        <StatCard label="Failed"   value={failed}   color="#ef4444" />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <ActionButton
          label="Capture Evidence"
          icon="📷"
          primary
          onPress={() => navigation.navigate('Capture', {})}
        />
        <ActionButton
          label="Sync Queue"
          icon="⬆️"
          onPress={() => navigation.navigate('Queue')}
          badge={pending > 0 ? pending : undefined}
        />
        <ActionButton
          label="Find Station"
          icon="📍"
          onPress={() => navigation.navigate('StationSearch')}
        />
        <ActionButton
          label="Settings"
          icon="⚙️"
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      {/* Tenant / device info */}
      <View style={styles.infoBox}>
        <InfoRow label="Tenant"    value={user?.tenantId?.slice(0, 8) + '...' ?? 'Unknown'} />
        <InfoRow label="Device ID" value={user?.deviceId?.slice(0, 8) + '...' ?? 'Unknown'} />
        <InfoRow label="Role"      value={user?.roles?.[0] ?? 'CAPSULE_AGENT'} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionButton({
  label, icon, primary, onPress, badge,
}: {
  label: string; icon: string; primary?: boolean;
  onPress: () => void; badge?: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, primary && styles.actionBtnPrimary]}
      onPress={onPress}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={[styles.actionLabel, primary && styles.actionLabelPrimary]}>{label}</Text>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a1628' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, paddingTop: 56 },
  greeting:     { color: '#64748b', fontSize: 13 },
  name:         { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginTop: 2 },
  networkBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  dot:          { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  networkText:  { color: '#94a3b8', fontSize: 12 },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginBottom: 24 },
  statCard:     { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 16, alignItems: 'center', borderTopWidth: 3 },
  statValue:    { fontSize: 24, fontWeight: '700' },
  statLabel:    { color: '#64748b', fontSize: 12, marginTop: 4 },
  actions:      { paddingHorizontal: 24, gap: 10 },
  actionBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, padding: 16, gap: 12 },
  actionBtnPrimary: { backgroundColor: '#3b82f6' },
  actionIcon:   { fontSize: 20 },
  actionLabel:  { color: '#94a3b8', fontSize: 15, flex: 1 },
  actionLabelPrimary: { color: '#fff', fontWeight: '600' },
  badge:        { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  infoBox:      { margin: 24, backgroundColor: '#1e293b', borderRadius: 10, padding: 16 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel:    { color: '#64748b', fontSize: 13 },
  infoValue:    { color: '#cbd5e1', fontSize: 13 },
  logoutBtn:    { marginHorizontal: 24, marginBottom: 40, padding: 14, alignItems: 'center' },
  logoutText:   { color: '#ef4444', fontSize: 15 },
});
