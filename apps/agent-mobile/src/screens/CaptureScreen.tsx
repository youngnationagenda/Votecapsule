// ============================================================
// VoteCapsule™ — Capture Screen (Assignment-Scoped + Geo-Fenced)
// apps/agent-mobile/src/screens/CaptureScreen.tsx
//
// Multi-page capture workflow WITH assignment enforcement:
//   1. Only shows ASSIGNED position (not all 6)
//   2. Only allows ASSIGNED station selection
//   3. Validates GPS proximity to station (geofence)
//   4. Blocks capture if agent is outside allowed radius
//
// Geo-fence levels:
//   WITHIN_RANGE (<500m) — green banner, proceed normally
//   WARNING (500m-2km) — yellow banner, allow with warning
//   OUT_OF_RANGE (>2km) — red banner, block capture
// ============================================================
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Image,
  FlatList, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';

import { RootStackParamList, PositionCode } from '../types';
import { useCaptureStore, MAX_PAGES } from '../store/captureStore';
import { useAuthStore }       from '../store/authStore';
import { useAssignmentStore } from '../store/assignmentStore';
import { useGps }             from '../hooks/useGps';
import { useGeofence, GeofenceStatus } from '../hooks/useGeofence';
import { Section }            from '../components/Section';
import { ErrorBanner }        from '../components/ErrorBanner';
import { getCapsule }         from '../utils/storage';
import { enqueueAndSync }     from '../services/syncEngine';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Capture'>;
  route: RouteProp<RootStackParamList, 'Capture'>;
};

const SCREEN_W = Dimensions.get('window').width;

// All positions — used only in free/unassigned mode
const ALL_POSITIONS: { code: PositionCode; label: string }[] = [
  { code: 'PRESIDENT',  label: 'President'   },
  { code: 'GOVERNOR',   label: 'Governor'    },
  { code: 'SENATOR',    label: 'Senator'     },
  { code: 'WOMEN_REP',  label: "Women's Rep" },
  { code: 'MP',         label: 'MP'          },
  { code: 'MCA',        label: 'MCA'         },
];

// One shot: either first page creation or additional page
type ShotMode = 'FIRST' | 'ADDITIONAL';

export default function CaptureScreen({ navigation, route }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady]   = useState(false);
  const [cameraOpen, setCameraOpen]     = useState(false);
  const [shotMode, setShotMode]         = useState<ShotMode>('FIRST');
  const [thumbnails, setThumbnails]     = useState<string[]>([]);
  const [activeCapsuleId, setActiveCapsuleId] = useState<string | null>(null);
  const [justCaptured, setJustCaptured] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const insets    = useSafeAreaInsets();

  const { coords: gps, error: gpsError, isLoading: gpsLoading, refresh: refreshGps } = useGps();
  const { user } = useAuthStore();
  const assignment = useAssignmentStore(s => s.assignment);
  const {
    session, isProcessing, error,
    setStation, setPosition, setGps,
    captureFirstPage, captureAdditionalPage, resetSession, clearError,
  } = useCaptureStore();

  // ── Geofence validation ──────────────────────────────────────
  const geofence = useGeofence(gps, session.station?.iebcCode ?? null);

  // ── Derived: Is agent in assignment mode? ────────────────────
  const hasAssignment = !!assignment && assignment.status === 'ACTIVE';
  const assignedPositionCode = assignment?.election.positionCode ?? null;
  const assignedPositionLabel = assignment?.election.positionLabel ?? null;
  const assignedElectionName = assignment?.election.electionName ?? null;
  const assignedStations = assignment?.stations ?? [];

  // Auto-set position from assignment
  useEffect(() => {
    if (hasAssignment && assignedPositionCode && session.positionCode !== assignedPositionCode) {
      setPosition(assignedPositionCode);
    }
  }, [hasAssignment, assignedPositionCode]);

  useEffect(() => { if (gps) setGps(gps); }, [gps]);
  useFocusEffect(useCallback(() => { refreshGps(); }, []));

  // ── Positions to show based on assignment ────────────────────
  const availablePositions: { code: PositionCode; label: string }[] = hasAssignment
    ? [{ code: assignedPositionCode!, label: assignedPositionLabel! }]
    : ALL_POSITIONS;

  // ── Geofence banner color ────────────────────────────────────
  const getGeofenceBannerStyle = (status: GeofenceStatus) => {
    switch (status) {
      case 'WITHIN_RANGE':   return styles.geoBannerGreen;
      case 'WARNING':        return styles.geoBannerYellow;
      case 'OUT_OF_RANGE':   return styles.geoBannerRed;
      case 'NO_GPS':         return styles.geoBannerYellow;
      case 'NO_STATION_GPS': return styles.geoBannerGreen;
      case 'UNASSIGNED':     return styles.geoBannerGreen;
    }
  };

  // ── Shoot handler ────────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    if (!user) { Alert.alert('Not authenticated', 'Please sign in again.'); return; }

    // Geofence enforcement
    if (!geofence.canProceed) {
      Alert.alert(
        'Location Blocked',
        geofence.message + '\n\nYou must be at your assigned polling station to capture evidence.',
      );
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        base64: false,
        exif: false,
      });
      if (!photo?.uri) throw new Error('No photo URI returned');

      // Flash feedback
      setJustCaptured(true);
      setTimeout(() => setJustCaptured(false), 600);

      if (shotMode === 'FIRST') {
        const localId = await captureFirstPage(photo.uri, user.tenantId, user.userId);
        if (localId) {
          setActiveCapsuleId(localId);
          setThumbnails([photo.uri]);
        }
      } else {
        if (!activeCapsuleId) return;
        const ok = await captureAdditionalPage(activeCapsuleId, photo.uri);
        if (ok) {
          setThumbnails((prev) => [...prev, photo.uri]);
        }
      }
    } catch (err: unknown) {
      Alert.alert('Capture Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ── Done — finalise and navigate to Review ──────────────────
  const handleDone = async () => {
    if (!activeCapsuleId) return;
    await enqueueAndSync(activeCapsuleId);
    setCameraOpen(false);
    navigation.replace('Review', { localId: activeCapsuleId });
  };

  // ── Add another page ────────────────────────────────────────
  const handleAddPage = async () => {
    if (!activeCapsuleId) return;
    const capsule = await getCapsule(activeCapsuleId);
    const pageCount = capsule?.pages?.length ?? 1;
    if (pageCount >= MAX_PAGES) {
      Alert.alert('Maximum Pages', `A capsule can have at most ${MAX_PAGES} pages. Tap "Done" to submit.`);
      return;
    }
    setShotMode('ADDITIONAL');
    setCameraReady(false);
  };

  // ── Station selection (scoped to assignment) ─────────────────
  const handleSelectStation = () => {
    if (hasAssignment && assignedStations.length > 0) {
      // Show only assigned stations — inline picker
      Alert.alert(
        'Select Your Station',
        `You are assigned to ${assignedStations.length} station(s) for ${assignedElectionName}`,
        [
          ...assignedStations.slice(0, 8).map((station) => ({
            text: `${station.name}${station.streamNumber ? ` (S${station.streamNumber})` : ''}`,
            onPress: () => setStation({
              iebcCode: station.iebcCode,
              streamName: station.name,
              centreName: station.centreName,
              constituencyName: station.constituencyName,
              registeredVoters: station.registeredVoters,
              countyCode: station.countyCode,
              countyName: station.countyName,
              constituencyCode: station.constituencyCode,
              wardCode: station.wardCode,
              wardName: station.wardName,
              centreCode: '',
              latitude: station.latitude,
              longitude: station.longitude,
            }),
          })),
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    } else {
      // Unassigned mode — use full search
      navigation.navigate('StationSearch');
    }
  };

  // ── Permissions ─────────────────────────────────────────────
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera Required</Text>
        <Text style={styles.permText}>
          VoteCapsule requires camera access to photograph election result forms.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Camera viewfinder ────────────────────────────────────────
  if (cameraOpen) {
    const pageCount    = thumbnails.length;
    const isMultiPage  = pageCount > 0;
    const canAddMore   = pageCount < MAX_PAGES;
    const pageLabel    = shotMode === 'FIRST'
      ? 'Page 1'
      : `Page ${pageCount + 1} of ${MAX_PAGES}`;

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />

        {/* Capture flash overlay */}
        {justCaptured && (
          <View style={styles.captureFlash} pointerEvents="none" />
        )}

        <View style={[styles.cameraOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

          {/* ── Top info bar ──────────────────────────── */}
          <View style={styles.cameraTopBar}>
            <View style={styles.captureInfo}>
              <Text style={styles.captureInfoText} numberOfLines={1}>
                📍 {session.station?.streamName ?? 'Unknown'}
              </Text>
              <Text style={styles.captureInfoSub}>
                {session.positionCode} · {hasAssignment ? assignedElectionName : `General ${session.electionYear}`} · {pageLabel}
              </Text>
            </View>

            {/* Geofence indicator in camera view */}
            <View style={[styles.geoIndicator, getGeofenceBannerStyle(geofence.status)]}>
              <Text style={styles.geoIndicatorText}>
                {geofence.status === 'WITHIN_RANGE' ? '✓' : geofence.status === 'WARNING' ? '⚠' : '✕'}{' '}
                {geofence.distanceMeters != null ? `${geofence.distanceMeters}m` : geofence.status}
              </Text>
            </View>
          </View>

          {/* ── Thumbnail strip ───────────────────────── */}
          {isMultiPage && (
            <View style={styles.thumbnailStrip}>
              <FlatList
                data={thumbnails}
                horizontal
                keyExtractor={(_, i) => String(i)}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 8, gap: 6 }}
                renderItem={({ item, index }) => (
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: item }} style={styles.thumb} />
                    <View style={styles.thumbBadge}>
                      <Text style={styles.thumbBadgeText}>{index + 1}</Text>
                    </View>
                  </View>
                )}
              />
              <Text style={styles.thumbHint}>
                {pageCount}/{MAX_PAGES} pages captured
              </Text>
            </View>
          )}

          {/* ── Form alignment guide ──────────────────── */}
          <View style={styles.guideFrame}>
            <View style={[styles.guideCorner, styles.guideTL]} />
            <View style={[styles.guideCorner, styles.guideTR]} />
            <View style={[styles.guideCorner, styles.guideBL]} />
            <View style={[styles.guideCorner, styles.guideBR]} />
            <Text style={styles.guideText}>
              {shotMode === 'FIRST'
                ? 'Align form within frame'
                : `Page ${pageCount + 1} — align next section`}
            </Text>
          </View>

          {/* ── Bottom controls ───────────────────────── */}
          <View style={styles.cameraControls}>
            {isMultiPage ? (
              <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
                <Text style={styles.doneBtnText}>✓ Done{'\n'}({pageCount}p)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setCameraOpen(false); setCameraReady(false); setShotMode('FIRST'); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.shutterBtn, (!cameraReady || isProcessing || !geofence.canProceed) && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={!cameraReady || isProcessing || !geofence.canProceed}
              accessibilityLabel="Take photo"
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            {isMultiPage && canAddMore ? (
              <TouchableOpacity style={styles.addPageBtn} onPress={handleAddPage}>
                <Text style={styles.addPageBtnIcon}>+</Text>
                <Text style={styles.addPageBtnText}>Page{'\n'}{pageCount + 1}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 64 }} />
            )}
          </View>
        </View>
      </View>
    );
  }

  // ── Setup form (station + position + GPS + geofence) ─────────
  const readyToCapture = Boolean(session.station && session.positionCode && geofence.canProceed);

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
      <Text style={styles.subtitle}>
        {hasAssignment ? assignedElectionName : `Kenya General Election ${session.electionYear}`}
      </Text>

      {/* Assignment scope banner */}
      {hasAssignment && (
        <View style={styles.scopeBanner}>
          <Text style={styles.scopeBannerText}>
            🔒 Scoped to: {assignedPositionLabel} — {assignment!.areaName}
          </Text>
          <Text style={styles.scopeBannerSub}>
            {assignedStations.length} station(s) assigned · {assignment!.geofenceRadiusMeters}m geo-fence
          </Text>
        </View>
      )}

      <Text style={styles.multiHint}>📄 Up to {MAX_PAGES} pages per capsule — capture front and back if needed</Text>

      {error ? <ErrorBanner message={error} onDismiss={clearError} /> : null}

      {/* Station */}
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
            <TouchableOpacity onPress={handleSelectStation} style={styles.changeLink}>
              <Text style={styles.changeLinkText}>
                {hasAssignment ? 'Change assigned station →' : 'Change station →'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.selectBtn} onPress={handleSelectStation}>
            <Text style={styles.selectBtnText}>
              {hasAssignment
                ? `📍  Select from ${assignedStations.length} assigned station(s)`
                : '📍  Select Polling Station'
              }
            </Text>
          </TouchableOpacity>
        )}
      </Section>

      {/* Position — single chip if assigned, grid if unassigned */}
      <Section title="Electoral Position">
        {hasAssignment ? (
          <View style={styles.positionLocked}>
            <View style={[styles.positionChip, styles.positionChipSelected]}>
              <Text style={[styles.positionChipText, styles.positionChipTextSelected]}>
                {assignedPositionLabel}
              </Text>
            </View>
            <Text style={styles.positionLockedHint}>
              Position locked by assignment
            </Text>
          </View>
        ) : (
          <View style={styles.positionGrid}>
            {availablePositions.map((p) => {
              const selected = session.positionCode === p.code;
              return (
                <TouchableOpacity
                  key={p.code}
                  style={[styles.positionChip, selected && styles.positionChipSelected]}
                  onPress={() => setPosition(p.code)}
                >
                  <Text style={[styles.positionChipText, selected && styles.positionChipTextSelected]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Section>

      {/* GPS + Geofence */}
      <Section title="GPS & Location Verification">
        <View style={styles.gpsRow}>
          {gpsLoading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
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

        {/* Geofence status banner */}
        {session.station && geofence.status !== 'UNASSIGNED' && (
          <View style={[styles.geofenceBanner, getGeofenceBannerStyle(geofence.status)]}>
            <Text style={styles.geofenceIcon}>
              {geofence.status === 'WITHIN_RANGE' ? '✓' :
               geofence.status === 'WARNING' ? '⚠️' :
               geofence.status === 'OUT_OF_RANGE' ? '✕' : 'ℹ'}
            </Text>
            <View style={styles.geofenceTextWrap}>
              <Text style={styles.geofenceMessage}>{geofence.message}</Text>
              {geofence.willServerReject && (
                <Text style={styles.geofenceReject}>Server will reject this submission</Text>
              )}
            </View>
          </View>
        )}
      </Section>

      {/* Readiness hint */}
      {!readyToCapture && (
        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            {!session.station && !session.positionCode
              ? '① Select a polling station  ② Select an electoral position'
              : !session.station
              ? '① Select a polling station to continue'
              : !session.positionCode
              ? '② Select an electoral position to continue'
              : !geofence.canProceed
              ? '⚠️ Move closer to your assigned station to capture'
              : ''}
          </Text>
        </View>
      )}

      {/* Capture button — disabled if geofence fails */}
      <TouchableOpacity
        style={[
          styles.captureBtn,
          !readyToCapture && styles.captureBtnDisabled,
          !geofence.canProceed && session.station && styles.captureBtnBlocked,
        ]}
        onPress={() => { setCameraReady(false); setShotMode('FIRST'); setCameraOpen(true); }}
        disabled={!readyToCapture || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.captureBtnText}>
            {!geofence.canProceed && session.station
              ? '🚫  Too Far From Station'
              : '📷  Open Camera'
            }
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628' },
  centerContainer:  { flex: 1, backgroundColor: '#0a1628', alignItems: 'center', padding: 32 },

  permIcon:         { fontSize: 56, marginBottom: 16, marginTop: 40 },
  permTitle:        { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  permText:         { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  permBtn:          { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 13, paddingHorizontal: 24 },
  permBtnText:      { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Camera
  cameraContainer:  { flex: 1, backgroundColor: '#000' },
  cameraOverlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  captureFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.35)',
    zIndex: 10,
  },
  cameraTopBar: { paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' },
  captureInfo: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  captureInfoText:  { color: '#f1f5f9', fontSize: 13, fontWeight: '600' },
  captureInfoSub:   { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  // Geo indicator (in-camera)
  geoIndicator: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  geoIndicatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

  // Thumbnail strip
  thumbnailStrip: {
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  thumbWrap:    { position: 'relative', width: 52, height: 68 },
  thumb:        { width: 52, height: 68, borderRadius: 4, borderWidth: 1.5, borderColor: '#3b82f6' },
  thumbBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText:   { color: '#fff', fontSize: 9, fontWeight: '700' },
  thumbHint:        { color: '#64748b', fontSize: 11, marginTop: 4 },

  // Guide frame
  guideFrame: {
    alignSelf: 'center',
    width: '92%',
    height: 200,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideCorner:  { position: 'absolute', width: 28, height: 28, borderColor: '#3b82f6', borderWidth: 3 },
  guideTL:      { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  guideTR:      { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  guideBL:      { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  guideBR:      { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },

  // Camera controls
  cameraControls:  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cancelBtn:       { width: 64, alignItems: 'center', paddingVertical: 8 },
  cancelBtnText:   { color: '#fff', fontSize: 15 },
  doneBtn: {
    width: 64,
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 8,
  },
  doneBtnText:     { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  shutterBtn: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 3, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  shutterDisabled: { opacity: 0.4 },
  shutterInner:    { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  addPageBtn: {
    width: 64,
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3b82f6',
    paddingVertical: 8,
  },
  addPageBtnIcon:  { color: '#60a5fa', fontSize: 20, fontWeight: '700' },
  addPageBtnText:  { color: '#60a5fa', fontSize: 10, textAlign: 'center', marginTop: 2 },

  // Setup form
  title:           { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  subtitle:        { color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 4 },

  // Scope banner
  scopeBanner: {
    backgroundColor: '#0f2d1e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#166534',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  scopeBannerText: {
    color: '#86efac',
    fontSize: 13,
    fontWeight: '600',
  },
  scopeBannerSub: {
    color: '#4ade80',
    fontSize: 11,
    marginTop: 2,
  },

  multiHint: {
    color: '#1d4ed8',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    marginBottom: 20,
    lineHeight: 18,
  },
  selectedCard:     { backgroundColor: '#1e293b', borderRadius: 10, padding: 14 },
  selectedMain:     { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  selectedSub:      { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  selectedCode:     { color: '#475569', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  selectedVoters:   { color: '#22c55e', fontSize: 11, marginTop: 2 },
  changeLink:       { marginTop: 10 },
  changeLinkText:   { color: '#3b82f6', fontSize: 13 },
  selectBtn: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 18,
    borderWidth: 1, borderColor: '#334155', borderStyle: 'dashed', alignItems: 'center',
  },
  selectBtnText:    { color: '#94a3b8', fontSize: 15 },

  // Position
  positionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  positionChip: {
    backgroundColor: '#1e293b', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: '#334155',
  },
  positionChipSelected:     { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  positionChipText:         { color: '#94a3b8', fontSize: 14 },
  positionChipTextSelected: { color: '#fff', fontWeight: '600' },
  positionLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  positionLockedHint: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },

  // GPS
  gpsRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1e293b', borderRadius: 8, padding: 12 },
  gpsDot:           { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  gpsText:          { color: '#94a3b8', fontSize: 12, flex: 1, lineHeight: 17 },
  gpsRetryBtn:      { backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  gpsRetryText:     { color: '#60a5fa', fontSize: 12 },

  // Geofence banner (setup form)
  geofenceBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    borderRadius: 8,
    padding: 12,
  },
  geoBannerGreen:  { backgroundColor: '#052e16', borderWidth: 1, borderColor: '#166534' },
  geoBannerYellow: { backgroundColor: '#422006', borderWidth: 1, borderColor: '#854d0e' },
  geoBannerRed:    { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#991b1b' },
  geofenceIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  geofenceTextWrap: { flex: 1 },
  geofenceMessage: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 17,
  },
  geofenceReject: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },

  // Hints & capture button
  hintBox:          { backgroundColor: '#1c2a1c', borderRadius: 8, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  hintText:         { color: '#86efac', fontSize: 13, lineHeight: 18 },
  captureBtn:       { backgroundColor: '#3b82f6', borderRadius: 10, padding: 17, alignItems: 'center', marginTop: 8 },
  captureBtnDisabled: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  captureBtnBlocked:  { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#991b1b' },
  captureBtnText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
});
