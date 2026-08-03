// ============================================================
// VoteCapsule™ — Settings Screen
// apps/agent-mobile/src/screens/SettingsScreen.tsx
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuthStore }    from '../store/authStore';
import { getAllCapsules }   from '../utils/storage';
import { SectionCard }     from '../components/SectionCard';
import { InfoRow }         from '../components/InfoRow';

const APP_VERSION    = '1.0.0';
const API_GATEWAY    = '483uyy43nc.execute-api.us-east-1.amazonaws.com';
const HASH_ALGORITHM = 'SHA-256 (LOCKED)';
const ELECTION_YEAR  = '2027';
const HASH_FORMULA   = 'SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)';

export default function SettingsScreen() {
  const { user } = useAuthStore();
  const [storageInfo, setStorageInfo] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const handleClearCache = () => {
    Alert.alert(
      'Clear Station Cache',
      'This removes the locally cached polling station list. You will need an internet connection to search for stations again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('vc:station_cache');
            Alert.alert('Done', 'Station cache cleared.');
          },
        },
      ],
    );
  };

  const handleCheckStorage = async () => {
    const capsules = await getAllCapsules();
    const total    = capsules.length;
    const uploaded = capsules.filter((c) => c.status === 'UPLOADED').length;
    const pending  = capsules.filter((c) => c.status === 'QUEUED' || c.status === 'CAPTURED').length;
    const failed   = capsules.filter((c) => c.status === 'FAILED').length;
    setStorageInfo(
      `${total} total  ·  ${uploaded} uploaded  ·  ${pending} pending  ·  ${failed} failed`,
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 24,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>

      {/* ── Account ─────────────────────────────────────────── */}
      <SectionCard title="Account">
        <InfoRow label="Name"      value={user?.fullName ?? '—'} />
        <InfoRow label="Email"     value={user?.email ?? '—'} />
        <InfoRow label="Tenant"    value={user?.tenantId ? user.tenantId.slice(0, 20) + '…' : '—'} mono />
        <InfoRow label="Device ID" value={user?.deviceId ? user.deviceId.slice(0, 20) + '…' : '—'} mono />
        <InfoRow label="Roles"     value={(user?.roles ?? []).join(', ') || 'CAPSULE_AGENT'} />
      </SectionCard>

      {/* ── App info ──────────────────────────────────────────── */}
      <SectionCard title="Application">
        <InfoRow label="Version"        value={APP_VERSION} />
        <InfoRow label="Election Year"  value={ELECTION_YEAR} />
        <InfoRow label="Hash Algorithm" value={HASH_ALGORITHM} />
        <InfoRow label="API Gateway"    value={API_GATEWAY} mono small />
      </SectionCard>

      {/* ── Security ──────────────────────────────────────────── */}
      <SectionCard title="Security & Integrity">
        <View style={styles.secBlock}>
          <Text style={styles.secLabel}>Evidence Hash Formula</Text>
          <Text style={styles.secFormula}>{HASH_FORMULA}</Text>
        </View>
        <View style={styles.divider} />
        <Text style={styles.secNote}>
          This formula is <Text style={styles.secNoteStrong}>locked</Text> and identical on the
          server. The server re-computes the hash from your uploaded data and rejects any capsule
          where the hash does not match. This protects against tampering in transit.
        </Text>
        <View style={styles.divider} />
        <Text style={styles.secNote}>
          After dual confirmation by a second agent, evidence is anchored to the{' '}
          <Text style={styles.secNoteStrong}>Hedera Consensus Service</Text> and timestamped
          via <Text style={styles.secNoteStrong}>RFC 3161</Text>. The resulting trust anchor
          is immutable.
        </Text>
      </SectionCard>

      {/* ── Local storage stats ───────────────────────────────── */}
      <SectionCard title="Local Storage">
        {storageInfo ? (
          <Text style={styles.storageInfo}>{storageInfo}</Text>
        ) : null}
        <TouchableOpacity style={styles.actionBtn} onPress={handleCheckStorage}>
          <Text style={styles.actionBtnText}>Check Storage Stats</Text>
        </TouchableOpacity>
      </SectionCard>

      {/* ── Maintenance ───────────────────────────────────────── */}
      <SectionCard title="Maintenance">
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearCache}>
          <Text style={styles.dangerBtnText}>🗑️  Clear Station Cache</Text>
        </TouchableOpacity>
      </SectionCard>

      {/* ── Build info ────────────────────────────────────────── */}
      <Text style={styles.buildInfo}>
        VoteCapsule™ Agent · v{APP_VERSION} · Kenya 2027{'\n'}
        Cryptographically sealed evidence capture system
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0a1628' },
  title:          { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 24 },

  // Security block
  secBlock:       { marginBottom: 10 },
  secLabel:       { color: '#64748b', fontSize: 12, marginBottom: 6 },
  secFormula: {
    color: '#22d3ee',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 10,
    lineHeight: 18,
  },
  divider:        { height: 1, backgroundColor: '#0f172a', marginVertical: 10 },
  secNote:        { color: '#64748b', fontSize: 12, lineHeight: 18 },
  secNoteStrong:  { color: '#94a3b8', fontWeight: '600' },

  // Storage
  storageInfo:    { color: '#94a3b8', fontSize: 13, marginBottom: 12, lineHeight: 18 },

  // Buttons
  actionBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnText:  { color: '#60a5fa', fontSize: 14 },
  dangerBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#450a0a',
  },
  dangerBtnText:  { color: '#f87171', fontSize: 14 },

  // Build info
  buildInfo: {
    color: '#1e293b',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },
});
