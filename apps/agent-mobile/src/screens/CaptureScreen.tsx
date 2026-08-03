// ============================================================
// VoteCapsule™ — Capture Screen
// apps/agent-mobile/src/screens/CaptureScreen.tsx
//
// Primary agent workflow:
//   1. Station pre-selected (from StationSearch) OR manual entry
//   2. Position selector (PRESIDENT → MCA)
//   3. Camera opens — agent photographs Form 35A
//   4. On capture: SHA-256 computed, capsule saved, queued
//   5. Navigate to Review screen
// ============================================================
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList, PositionCode } from '../types';
import { useCaptureStore } from '../store/captureStore';
import { useAuthStore }    from '../store/authStore';
import { useGps }          from '../hooks/useGps';
import { Section }         from '../components/Section';
import { ErrorBanner }     from '../components/ErrorBanner';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Capture'>;
  route: RouteProp<RootStackParamList, 'Capture'>;
};

const POSITIONS: { code: PositionCode; label: string }[] = [
  { code: 'PRESIDENT',  label: 'President'     },
  { code: 'GOVERNOR',   label: 'Governor'      },
  { code: 'SENATOR',    label: 'Senator'       },
  { code: 'WOMEN_REP',  label: "Women's Rep"   },
  { code: 'MP',         label: 'MP'            },
  { code: 'MCA',        label: 'MCA'           },
];

export default function CaptureScreen({ navigation, route }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady]   = useState(false);
  const [cameraOpen, setCameraOpen]     = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  const { coords: gps, error: gpsError, isLoading: gpsLoading, refresh: refreshGps } = useGps();
  const { user } = useAuthStore();
  const {
    session, isProcessing, error,
    setStation, setPosition, setGps,
    captureImage, resetSession, clearError,
  } = useCaptureStore();

  // Attach GPS coordinates to the capture session whenever they become available
  useEffect(() => {
    if (gps) setGps(gps);
  }, [gps]);

  // When navigating back from StationSearch the store will already have the
  // station set — nothing extra needed here (store is persistent across screens).
  useFocusEffect(
    useCallback(() => {
      // Refresh GPS whenever this screen is focused
      refreshGps();
    }, []),
  );

  // ── Camera handler ────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    if (!user) {
      Alert.alert('Not authenticated', 'Please sign in again.');
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        base64: false,
        exif: false,
      });
      if (!photo?.uri) throw new Error('No photo URI returned from camera');

      setCameraOpen(false);

      const localId = await captureImage(photo.uri, user.tenantId, user.userId);
      if (localId) {
        navigation.replace('Review', { localId });
      }
    } catch (err: unknown) {
      Alert.alert(
        'Capture Error',
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
    }
  };

  // ── Permissions not yet resolved ──────────────────────────
  if (!permission) {
    return <View style={styles.container} />;
  }

  // ── Camera permission denied ──────────────────────────────
  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera Required</Text>
        <Text style={styles.permText}>
          VoteCapsule requires camera access to photograph election result forms (Form 35A).
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera viewfinder ─────────────────────────────────────
  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={[styles.cameraOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {/* Station / position indicator */}
          <View style={styles.captureInfo}>
            <Text style={styles.captureInfoText} numberOfLines={1}>
              📍 {session.station?.streamName ?? 'Unknown Station'}
            </Text>
            <Text style={styles.captureInfoSub}>
              {session.positionCode} · {session.electionYear}
            </Text>
          </View>

          {/* Form guide */}
          <View style={styles.guideFrame}>
            <View style={[styles.guideCorner, styles.guideTL]} />
            <View style={[styles.guideCorner, styles.guideTR]} />
            <View style={[styles.guideCorner, styles.guideBL]} />
            <View style={[styles.guideCorner, styles.guideBR]} />
            <Text style={styles.guideText}>Align Form 35A within frame</Text>
          </View>

          {/* Controls */}
          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setCameraOpen(false); setCameraReady(false); }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutterBtn, (!cameraReady || isProcessing) && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={!cameraReady || isProcessing}
              accessibilityLabel="Take photo"
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <View style={{ width: 64 }} />
          </View>
        </View>
      </View>
    );
  }

  // ── Setup form ────────────────────────────────────────────
  const readyToCapture = Boolean(session.station && session.positionCode);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: 24,
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Capture Evidence</Text>
      <Text style={styles.subtitle}>Kenya General Election {session.electionYear}</Text>

      {/* ── Error banner ───────────────────────────────────── */}
      {error ? <ErrorBanner message={error} onDismiss={clearError} /> : null}

      {/* ── Polling Station ────────────────────────────────── */}
      <Section title="Polling Station">
        {session.station ? (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedMain}>{session.station.streamName}</Text>
            <Text style={styles.selectedSub}>
              {session.station.centreName} · {session.station.constituencyName}
            </Text>
            <Text style={styles.selectedCode}>{session.station.iebcCode}</Text>
            <Text style={styles.selectedVoters}>
              {session.station.registeredVoters.toLocaleString()} registered voters
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('StationSearch')}
              style={styles.changeLink}
            >
              <Text style={styles.changeLinkText}>Change station →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => navigation.navigate('StationSearch')}
          >
            <Text style={styles.selectBtnText}>📍  Select Polling Station</Text>
          </TouchableOpacity>
        )}
      </Section>

      {/* ── Electoral Position ─────────────────────────────── */}
      <Section title="Electoral Position">
        <View style={styles.positionGrid}>
          {POSITIONS.map((p) => {
            const selected = session.positionCode === p.code;
            return (
              <TouchableOpacity
                key={p.code}
                style={[styles.positionChip, selected && styles.positionChipSelected]}
                onPress={() => setPosition(p.code)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.positionChipText, selected && styles.positionChipTextSelected]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Section>

      {/* ── GPS ────────────────────────────────────────────── */}
      <Section title="GPS Location">
        <View style={styles.gpsRow}>
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" style={{ marginRight: 8 }} />
          ) : (
            <View style={[styles.gpsDot, { backgroundColor: gps ? '#22c55e' : '#f59e0b' }]} />
          )}
          <Text style={styles.gpsText} numberOfLines={2}>
            {gpsLoading
              ? 'Acquiring GPS…'
              : gps
              ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}  (±${Math.round(gps.accuracyMeters ?? 0)}m)`
              : gpsError ?? 'GPS unavailable — capture will proceed without coordinates'}
          </Text>
          {!gpsLoading && !gps && (
            <TouchableOpacity onPress={refreshGps} style={styles.gpsRetryBtn}>
              <Text style={styles.gpsRetryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </Section>

      {/* ── Readiness hint ─────────────────────────────────── */}
      {!readyToCapture && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            {!session.station && !session.positionCode
              ? '① Select a polling station  ② Select an electoral position'
              : !session.station
              ? '① Select a polling station to continue'
              : '② Select an electoral position to continue'}
          </Text>
        </View>
      )}

      {/* ── Open camera ────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.captureBtn, !readyToCapture && styles.captureBtnDisabled]}
        onPress={() => { setCameraReady(false); setCameraOpen(true); }}
        disabled={!readyToCapture || isProcessing}
        accessibilityRole="button"
        accessibilityLabel="Open camera to capture Form 35A"
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.captureBtnText}>📷  Open Camera</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  centerContainer:  { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', padding: 32 },

  // Permission screen
  permIcon:         { fontSize: 56, marginBottom: 16, marginTop: 40 },
  permTitle:        { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  permText:         { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permBtn:          { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 13, paddingHorizontal: 24 },
  permBtnText:      { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Camera
  cameraContainer:  { flex: 1, backgroundColor: '#000' },
  cameraOverlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', paddingHorizontal: 24 },
  captureInfo:      { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 10, marginTop: 8 },
  captureInfoText:  { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  captureInfoSub:   { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  guideFrame: {
    alignSelf: 'center',
    width: '90%',
    height: 220,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCorner:      { position: 'absolute', width: 28, height: 28, borderColor: '#3b82f6', borderWidth: 3 },
  guideTL:          { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  guideTR:          { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  guideBL:          { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  guideBR:          { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  guideText:        { color: 'rgba(255,255,255,0.7)', fontSize: 12, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  cameraControls:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cancelBtn:        { width: 64, alignItems: 'center', paddingVertical: 8 },
  cancelBtnText:    { color: '#fff', fontSize: 15 },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterDisabled:  { opacity: 0.4 },
  shutterInner:     { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  // Setup form
  title:            { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  subtitle:         { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 24 },
  selectedCard:     { backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  selectedMain:     { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  selectedSub:      { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  selectedCode:     { color: '#475569', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  selectedVoters:   { color: '#22c55e', fontSize: 11, marginTop: 2 },
  changeLink:       { marginTop: 10 },
  changeLinkText:   { color: '#3b82f6', fontSize: 13 },
  selectBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  selectBtnText:    { color: '#94a3b8', fontSize: 15 },
  positionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  positionChip: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#334155',
  },
  positionChipSelected:     { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  positionChipText:         { color: '#94a3b8', fontSize: 14 },
  positionChipTextSelected: { color: '#fff', fontWeight: '600' },

  // GPS
  gpsRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', borderRadius: 8, padding: 12 },
  gpsDot:           { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  gpsText:          { color: '#94a3b8', fontSize: 12, flex: 1, lineHeight: 17 },
  gpsRetryBtn:      { backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  gpsRetryText:     { color: '#60a5fa', fontSize: 12 },

  // Hints
  hintBox:          { backgroundColor: '#1c2a1c', borderRadius: 8, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  hintText:         { color: '#86efac', fontSize: 13, lineHeight: 18 },

  // Capture button
  captureBtn:       { backgroundColor: '#3b82f6', borderRadius: 10, padding: 17, alignItems: 'center', marginTop: 8 },
  captureBtnDisabled:{ backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  captureBtnText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
});
