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
import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList, PositionCode } from '../types';
import { useCaptureStore } from '../store/captureStore';
import { useAuthStore } from '../store/authStore';
import { useGps } from '../hooks/useGps';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Capture'>;
  route: RouteProp<RootStackParamList, 'Capture'>;
};

const POSITIONS: { code: PositionCode; label: string }[] = [
  { code: 'PRESIDENT',  label: 'President' },
  { code: 'GOVERNOR',   label: 'Governor' },
  { code: 'SENATOR',    label: 'Senator' },
  { code: 'WOMEN_REP',  label: "Women's Rep" },
  { code: 'MP',         label: 'MP' },
  { code: 'MCA',        label: 'MCA' },
];

export default function CaptureScreen({ navigation, route }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady]   = useState(false);
  const [cameraOpen, setCameraOpen]     = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const { coords: gps, error: gpsError } = useGps();
  const { user } = useAuthStore();
  const {
    session, isProcessing, error,
    setStation, setPosition, setGps,
    captureImage, resetSession, clearError,
  } = useCaptureStore();

  // Attach GPS when available
  useEffect(() => {
    if (gps) setGps(gps);
  }, [gps]);

  // If a station code was passed (from StationSearch)
  useEffect(() => {
    if (route.params?.stationCode) {
      // Station will be resolved by StationSearch and passed back via store
    }
  }, [route.params?.stationCode]);

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        exif: false,
      });
      if (!photo?.uri) throw new Error('No photo URI returned');

      setCameraOpen(false);
      const localId = await captureImage(photo.uri, user!.tenantId, user!.userId);
      if (localId) {
        navigation.replace('Review', { localId });
      }
    } catch (err: unknown) {
      Alert.alert('Capture Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permText}>Camera access is required to capture evidence.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera viewfinder ──────────────────────────────────────
  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
        {/* Overlay guide */}
        <View style={styles.cameraOverlay}>
          <View style={styles.captureGuide}>
            <Text style={styles.captureGuideText}>Align Form 35A within frame</Text>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCameraOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shutterBtn, !cameraReady && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={!cameraReady || isProcessing}
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

  // ── Setup form ─────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingTop: 56 }}>
      <Text style={styles.title}>Capture Evidence</Text>
      <Text style={styles.subtitle}>Kenya General Election 2027</Text>

      {/* Station */}
      <Section title="Polling Station">
        {session.station ? (
          <View style={styles.selectedCard}>
            <Text style={styles.selectedMain}>{session.station.streamName}</Text>
            <Text style={styles.selectedSub}>
              {session.station.centreName} • {session.station.constituencyName}
            </Text>
            <Text style={styles.selectedCode}>{session.station.iebcCode}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('StationSearch')}>
              <Text style={styles.changeLink}>Change station</Text>
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

      {/* Position */}
      <Section title="Electoral Position">
        <View style={styles.positionGrid}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p.code}
              style={[
                styles.positionChip,
                session.positionCode === p.code && styles.positionChipSelected,
              ]}
              onPress={() => setPosition(p.code)}
            >
              <Text
                style={[
                  styles.positionChipText,
                  session.positionCode === p.code && styles.positionChipTextSelected,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* GPS status */}
      <Section title="GPS">
        <View style={styles.gpsRow}>
          <View style={[styles.dot, { backgroundColor: gps ? '#22c55e' : '#f59e0b' }]} />
          <Text style={styles.gpsText}>
            {gps
              ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)} (±${Math.round(gps.accuracyMeters ?? 0)}m)`
              : gpsError ?? 'Acquiring GPS…'}
          </Text>
        </View>
      </Section>

      {/* Error */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Open camera */}
      <TouchableOpacity
        style={[
          styles.captureBtn,
          (!session.station || !session.positionCode) && styles.captureBtnDisabled,
        ]}
        onPress={() => setCameraOpen(true)}
        disabled={!session.station || !session.positionCode || isProcessing}
      >
        <Text style={styles.captureBtnText}>📷  Open Camera</Text>
      </TouchableOpacity>

      {(!session.station || !session.positionCode) && (
        <Text style={styles.hint}>Select station and position before capturing.</Text>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#0a1628' },
  centerContainer:    { flex: 1, backgroundColor: '#0a1628', justifyContent: 'center', alignItems: 'center', padding: 32 },
  cameraContainer:    { flex: 1, backgroundColor: '#000' },
  cameraOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 24 },
  captureGuide:       { marginTop: 60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 8 },
  captureGuideText:   { color: '#fff', fontSize: 13 },
  cameraControls:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
  cancelBtn:          { width: 64, alignItems: 'center' },
  cancelBtnText:      { color: '#fff', fontSize: 15 },
  shutterBtn:         { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 3, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterDisabled:    { opacity: 0.5 },
  shutterInner:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  title:              { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  subtitle:           { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 24 },
  section:            { marginBottom: 24 },
  sectionTitle:       { color: '#94a3b8', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  selectedCard:       { backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  selectedMain:       { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  selectedSub:        { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  selectedCode:       { color: '#475569', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  changeLink:         { color: '#3b82f6', fontSize: 13, marginTop: 8 },
  selectBtn:          { backgroundColor: '#1e293b', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', alignItems: 'center' },
  selectBtnText:      { color: '#94a3b8', fontSize: 15 },
  positionGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  positionChip:       { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#334155' },
  positionChipSelected: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  positionChipText:   { color: '#94a3b8', fontSize: 14 },
  positionChipTextSelected: { color: '#fff', fontWeight: '600' },
  gpsRow:             { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:                { width: 8, height: 8, borderRadius: 4 },
  gpsText:            { color: '#94a3b8', fontSize: 12, flex: 1 },
  errorBanner:        { backgroundColor: '#7f1d1d', borderRadius: 8, padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  errorText:          { color: '#fca5a5', fontSize: 13, flex: 1 },
  errorDismiss:       { color: '#f87171', fontSize: 12, marginLeft: 8 },
  captureBtn:         { backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  captureBtnDisabled: { backgroundColor: '#1e3a5f', opacity: 0.5 },
  captureBtnText:     { color: '#fff', fontSize: 16, fontWeight: '600' },
  hint:               { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8 },
  permText:           { color: '#94a3b8', fontSize: 15, textAlign: 'center', marginBottom: 20 },
  button:             { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  buttonText:         { color: '#fff', fontSize: 15, fontWeight: '600' },
});
