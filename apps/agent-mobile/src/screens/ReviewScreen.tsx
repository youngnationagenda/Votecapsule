// ============================================================
// VoteCapsule™ — Review Screen
// apps/agent-mobile/src/screens/ReviewScreen.tsx
//
// Shows the just-captured capsule: image preview, hash,
// GPS, station, position. Agent confirms or discards.
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, LocalCapsule } from '../types';
import { getCapsule, deleteCapsule } from '../utils/storage';
import { useCaptureStore } from '../store/captureStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Review'>;
  route: RouteProp<RootStackParamList, 'Review'>;
};

export default function ReviewScreen({ navigation, route }: Props) {
  const [capsule, setCapsule] = useState<LocalCapsule | null>(null);
  const { resetSession } = useCaptureStore();

  useEffect(() => {
    getCapsule(route.params.localId).then(setCapsule);
  }, [route.params.localId]);

  const handleDiscard = () => {
    Alert.alert(
      'Discard Submission',
      'This will permanently delete this captured evidence. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await deleteCapsule(route.params.localId);
            resetSession();
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  const handleDone = () => {
    resetSession();
    navigation.replace('Home');
  };

  if (!capsule) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#3b82f6" />
      </View>
    );
  }

  const syncLabel =
    capsule.status === 'UPLOADED'   ? '✅ Uploaded'  :
    capsule.status === 'UPLOADING'  ? '⬆️ Uploading…' :
    capsule.status === 'FAILED'     ? '❌ Upload Failed' :
    capsule.status === 'QUEUED'     ? '⏳ In Queue' :
    '📦 Captured';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 56 }}>
      <Text style={styles.title}>Evidence Review</Text>
      <Text style={styles.syncStatus}>{syncLabel}</Text>

      {/* Image preview */}
      <Image source={{ uri: capsule.imageUri }} style={styles.preview} resizeMode="contain" />

      {/* Integrity hash */}
      <InfoSection title="Integrity Hash (SHA-256)">
        <Text style={styles.hash} selectable>{capsule.sha256Hash}</Text>
        <Text style={styles.hint}>Sealed at capture. Any tampering will be detected.</Text>
      </InfoSection>

      {/* Capsule details */}
      <InfoSection title="Submission Details">
        <InfoRow label="Station Code" value={capsule.iebcStationCode} mono />
        <InfoRow label="Position"     value={capsule.positionCode} />
        <InfoRow label="Election"     value={`Kenya General ${capsule.electionYear}`} />
        <InfoRow label="Captured At"  value={new Date(capsule.capturedAt).toLocaleString()} />
        <InfoRow label="Local ID"     value={capsule.localId.slice(0, 8) + '…'} mono />
        {capsule.serverId && (
          <InfoRow label="Server ID" value={capsule.serverId.slice(0, 8) + '…'} mono />
        )}
      </InfoSection>

      {/* GPS */}
      {capsule.gps && (
        <InfoSection title="GPS">
          <InfoRow label="Latitude"  value={capsule.gps.latitude.toFixed(6)} />
          <InfoRow label="Longitude" value={capsule.gps.longitude.toFixed(6)} />
          {capsule.gps.accuracyMeters !== null && (
            <InfoRow label="Accuracy" value={`±${Math.round(capsule.gps.accuracyMeters)}m`} />
          )}
        </InfoSection>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>✓  Done — Capture Another</Text>
        </TouchableOpacity>
        {capsule.status !== 'UPLOADED' && (
          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
            <Text style={styles.discardBtnText}>Discard This Submission</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
  container:       { flex: 1, backgroundColor: '#0a1628' },
  centerContainer: { flex: 1, backgroundColor: '#0a1628', justifyContent: 'center', alignItems: 'center' },
  title:           { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  syncStatus:      { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 16 },
  preview:         { width: '100%', height: 260, borderRadius: 10, marginBottom: 24, backgroundColor: '#1e293b' },
  section:         { marginBottom: 20 },
  sectionTitle:    { color: '#94a3b8', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  sectionBody:     { backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  hash:            { color: '#22d3ee', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  hint:            { color: '#475569', fontSize: 11, marginTop: 6 },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  infoLabel:       { color: '#64748b', fontSize: 13 },
  infoValue:       { color: '#cbd5e1', fontSize: 13, maxWidth: '60%', textAlign: 'right' },
  monoValue:       { fontFamily: 'monospace', color: '#94a3b8' },
  actions:         { gap: 10, marginTop: 8, marginBottom: 40 },
  doneBtn:         { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center' },
  doneBtnText:     { color: '#fff', fontSize: 15, fontWeight: '600' },
  discardBtn:      { borderRadius: 10, padding: 16, alignItems: 'center' },
  discardBtnText:  { color: '#ef4444', fontSize: 14 },
});
