// ============================================================
// VoteCapsule™ — Settings Screen
// apps/agent-mobile/src/screens/SettingsScreen.tsx
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { user } = useAuthStore();

  const handleClearCache = () => {
    Alert.alert(
      'Clear Station Cache',
      'This removes the locally cached polling station list. You will need an internet connection to search stations again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            await AsyncStorage.removeItem('vc:station_cache');
            Alert.alert('Done', 'Station cache cleared.');
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 56 }}>
      <Text style={styles.title}>Settings</Text>

      <Section title="Account">
        <SettingRow label="Name"      value={user?.fullName ?? '—'} />
        <SettingRow label="Email"     value={user?.email ?? '—'} />
        <SettingRow label="Tenant"    value={user?.tenantId?.slice(0, 16) + '…' ?? '—'} mono />
        <SettingRow label="Device ID" value={user?.deviceId?.slice(0, 16) + '…' ?? '—'} mono />
        <SettingRow label="Roles"     value={(user?.roles ?? []).join(', ') || '—'} />
      </Section>

      <Section title="App">
        <SettingRow label="Version"         value="1.0.0" />
        <SettingRow label="API Gateway"     value="483uyy43nc.execute-api.us-east-1.amazonaws.com" mono small />
        <SettingRow label="Hash Algorithm"  value="SHA-256 (locked)" />
        <SettingRow label="Election Year"   value="2027" />
      </Section>

      <Section title="Security">
        <Text style={styles.secNote}>
          All evidence submissions are cryptographically sealed with a SHA-256 composite hash
          computed on this device at capture time. The formula is:
          {'\n\n'}SHA-256(imageSHA256 + sortedMetadataJSON + captureTimestamp)
          {'\n\n'}This hash is verified server-side and locked into the trust anchor after dual
          confirmation via Hedera Consensus Service and RFC 3161 timestamp. Any tampering with
          the image or metadata after capture will be detected.
        </Text>
      </Section>

      <Section title="Maintenance">
        <TouchableOpacity style={styles.actionBtn} onPress={handleClearCache}>
          <Text style={styles.actionBtnText}>Clear Station Cache</Text>
        </TouchableOpacity>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  label, value, mono, small,
}: {
  label: string; value: string; mono?: boolean; small?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.monoValue, small && styles.smallValue]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a1628' },
  title:        { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 24 },
  section:      { marginBottom: 24 },
  sectionTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  sectionBody:  { backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel:     { color: '#64748b', fontSize: 13 },
  rowValue:     { color: '#cbd5e1', fontSize: 13, maxWidth: '60%', textAlign: 'right' },
  monoValue:    { fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' },
  smallValue:   { fontSize: 10 },
  secNote:      { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  actionBtn:    { backgroundColor: '#1e293b', borderRadius: 8, padding: 14, borderWidth: 1, borderColor: '#334155', alignItems: 'center', marginTop: 8 },
  actionBtnText:{ color: '#f87171', fontSize: 14 },
});
