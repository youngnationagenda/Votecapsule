// ============================================================
// VoteCapsule™ — Review Screen
// apps/agent-mobile/src/screens/ReviewScreen.tsx
//
// Shows the just-captured capsule: image preview, integrity
// hash, GPS, station metadata. Agent confirms or discards.
// Auto-refreshes capsule status so upload progress is reflected.
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList, LocalCapsule, CapsuleStatus } from '../types';
import { getCapsule, deleteCapsule } from '../utils/storage';
import { useCaptureStore } from '../store/captureStore';
import { SectionCard }   from '../components/SectionCard';
import { InfoRow }       from '../components/InfoRow';
import { StatusBadge }   from '../components/StatusBadge';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Review'>;
  route: RouteProp<RootStackParamList, 'Review'>;
};

const TERMINAL_STATUSES: CapsuleStatus[] = ['UPLOADED', 'FAILED'];

export default function ReviewScreen({ navigation, route }: Props) {
  const [capsule, setCapsule] = useState<LocalCapsule | null>(null);
  const { resetSession } = useCaptureStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets  = useSafeAreaInsets();

  const loadCapsule = async () => {
    const c = await getCapsule(route.params.localId);
    if (c) setCapsule(c);
    return c;
  };

  useEffect(() => {
    loadCapsule();

    // Poll every 2 s until the capsule reaches a terminal state
    pollRef.current = setInterval(async () => {
      const c = await loadCapsule();
      if (c && TERMINAL_STATUSES.includes(c.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [route.params.localId]);

  const handleDiscard = () => {
    Alert.alert(
      'Discard Submission',
      'This will permanently delete this captured evidence from this device. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            if (pollRef.current) clearInterval(pollRef.current);
            await deleteCapsule(route.params.localId);
            resetSession();
            navigation.replace('Home');
          },
        },
      ],
    );
  };

  const handleEnterTally = () => {
    if (!capsule) return;
    navigation.replace('TallyEntry', { localId: capsule.localId });
  };

  const handleSkipTally = () => {
    resetSession();
    navigation.replace('Queue');
  };

  const handleDone = () => {
    resetSession();
    navigation.replace('Home');
  };

  const handleCaptureAnother = () => {
    resetSession();
    navigation.replace('Capture', {});
  };

  if (!capsule) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const isUploaded = capsule.status === 'UPLOADED';
  const isFailed   = capsule.status === 'FAILED';

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
      {/* ── Title + status ─────────────────────────────────── */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>Evidence Review</Text>
          <Text style={styles.localId}>ID: {capsule.localId.slice(0, 8)}…</Text>
        </View>
        <StatusBadge status={capsule.status} showDot />
      </View>

      {/* ── Image preview ──────────────────────────────────── */}
      <View style={styles.previewWrapper}>
        <Image
          source={{ uri: capsule.imageUri }}
          style={styles.preview}
          resizeMode="contain"
        />
        {capsule.status === 'UPLOADING' && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#3b82f6" size="large" />
            <Text style={styles.uploadingText}>Uploading to server…</Text>
          </View>
        )}
        {isUploaded && (
          <View style={styles.uploadedBadge}>
            <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
          </View>
        )}
      </View>

      {/* ── Integrity hash ─────────────────────────────────── */}
      <SectionCard title="Integrity Hash (SHA-256)">
        <Text style={styles.hash} selectable>{capsule.sha256Hash}</Text>
        <Text style={styles.hashHint}>
          Sealed at capture time. Server will reject any capsule where the hash does not match.
        </Text>
      </SectionCard>

      {/* ── Submission details ─────────────────────────────── */}
      <SectionCard title="Submission Details">
        <InfoRow label="Station Code"  value={capsule.iebcStationCode} mono />
        <InfoRow label="Position"      value={capsule.positionCode} />
        <InfoRow label="Election"      value={`Kenya General ${capsule.electionYear}`} />
        <InfoRow label="Captured At"   value={new Date(capsule.capturedAt).toLocaleString()} />
        <InfoRow label="Size"          value={`${(capsule.imageSizeBytes / 1024).toFixed(1)} KB`} />
        <InfoRow label="Sync Attempts" value={String(capsule.syncAttempts)} />
        {capsule.serverId ? (
          <InfoRow label="Server ID" value={capsule.serverId.slice(0, 16) + '…'} mono />
        ) : null}
      </SectionCard>

      {/* ── GPS ────────────────────────────────────────────── */}
      {capsule.gps ? (
        <SectionCard title="GPS Coordinates">
          <InfoRow label="Latitude"  value={capsule.gps.latitude.toFixed(6)} />
          <InfoRow label="Longitude" value={capsule.gps.longitude.toFixed(6)} />
          {capsule.gps.altitude !== null && (
            <InfoRow label="Altitude" value={`${capsule.gps.altitude?.toFixed(0)}m`} />
          )}
          {capsule.gps.accuracyMeters !== null && (
            <InfoRow label="Accuracy" value={`±${Math.round(capsule.gps.accuracyMeters ?? 0)}m`} />
          )}
          <InfoRow label="GPS time" value={new Date(capsule.gps.capturedAt).toLocaleTimeString()} />
        </SectionCard>
      ) : (
        <SectionCard title="GPS Coordinates">
          <Text style={styles.noGps}>No GPS data — captured without location</Text>
        </SectionCard>
      )}

      {/* ── Sync error ─────────────────────────────────────── */}
      {isFailed && capsule.lastSyncError ? (
        <View style={styles.failedBanner}>
          <Text style={styles.failedTitle}>Upload Failed</Text>
          <Text style={styles.failedMsg}>{capsule.lastSyncError}</Text>
          <Text style={styles.failedHint}>
            The capsule is saved locally. It will retry automatically when connectivity is restored,
            or you can retry from the Sync Queue screen.
          </Text>
        </View>
      ) : null}

      {/* ── Actions ────────────────────────────────────────── */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.tallyBtn} onPress={handleEnterTally}>
          <Text style={styles.tallyBtnText}>Enter Tally Data →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureAnotherBtn} onPress={handleCaptureAnother}>
          <Text style={styles.captureAnotherText}>📷  Capture Another</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done — Go to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipTallyBtn} onPress={handleSkipTally}>
          <Text style={styles.skipTallyText}>Skip Tally (photo only)</Text>
        </TouchableOpacity>

        {!isUploaded && (
          <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
            <Text style={styles.discardBtnText}>Discard This Submission</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a1628' },
  centerContainer: { flex: 1, backgroundColor: '#0a1628', justifyContent: 'center', alignItems: 'center' },
  loadingText:     { color: '#475569', fontSize: 14, marginTop: 12 },

  // Title row
  titleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title:           { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  localId:         { color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 3 },

  // Image
  previewWrapper:  { position: 'relative', marginBottom: 24 },
  preview:         { width: '100%', height: 260, borderRadius: 10, backgroundColor: '#1e293b' },
  uploadingOverlay:{
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,22,40,0.75)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  uploadingText:   { color: '#94a3b8', fontSize: 13 },
  uploadedBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#14532d',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  uploadedBadgeText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },

  // Hash
  hash:       { color: '#22d3ee', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  hashHint:   { color: '#475569', fontSize: 11, marginTop: 8, lineHeight: 16 },

  // No GPS
  noGps:      { color: '#475569', fontSize: 13, fontStyle: 'italic' },

  // Failed
  failedBanner: {
    backgroundColor: '#450a0a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  failedTitle:  { color: '#ef4444', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  failedMsg:    { color: '#fca5a5', fontSize: 12, marginBottom: 8, fontFamily: 'monospace' },
  failedHint:   { color: '#7f1d1d', fontSize: 12, lineHeight: 17 },

  // Actions
  actions:             { gap: 10 },
  tallyBtn:            { backgroundColor: '#0f4c2e', borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e' },
  tallyBtnText:        { color: '#22c55e', fontSize: 15, fontWeight: '700' },
  captureAnotherBtn:   { backgroundColor: '#1e3a5f', borderRadius: 10, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2563eb' },
  captureAnotherText:  { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  doneBtn:             { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center' },
  doneBtnText:         { color: '#fff', fontSize: 15, fontWeight: '600' },
  skipTallyBtn:        { borderRadius: 10, padding: 12, alignItems: 'center' },
  skipTallyText:       { color: '#64748b', fontSize: 13 },
  discardBtn:          { borderRadius: 10, padding: 16, alignItems: 'center' },
  discardBtnText:      { color: '#ef4444', fontSize: 14 },
});
