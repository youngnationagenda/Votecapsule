// ============================================================
// VoteCapsule™ — Review Screen (Multi-Image)
// apps/agent-mobile/src/screens/ReviewScreen.tsx
//
// Shows the captured capsule:
//  - Swipeable image carousel (all pages)
//  - Page indicators (dots)
//  - Per-page SHA-256 hash
//  - GPS, station, submission details
//  - Actions: Enter Tally / Done / Discard
// ============================================================
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator,
  FlatList, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList, LocalCapsule, CapsuleStatus, CapsulePage } from '../types';
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
const SCREEN_W = Dimensions.get('window').width;

export default function ReviewScreen({ navigation, route }: Props) {
  const [capsule, setCapsule]         = useState<LocalCapsule | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const { resetSession } = useCaptureStore();
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const carouselRef = useRef<FlatList>(null);
  const insets     = useSafeAreaInsets();

  const loadCapsule = async () => {
    const c = await getCapsule(route.params.localId);
    if (c) setCapsule(c);
    return c;
  };

  useEffect(() => {
    loadCapsule();
    pollRef.current = setInterval(async () => {
      const c = await loadCapsule();
      if (c && TERMINAL_STATUSES.includes(c.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [route.params.localId]);

  const handleDiscard = () => {
    Alert.alert(
      'Discard Submission',
      'This will permanently delete all captured pages from this device. Are you sure?',
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

  // Build pages array — support both old (single imageUri) and new (pages[]) format
  const pages: CapsulePage[] = capsule.pages?.length
    ? capsule.pages
    : [{ pageNumber: 1, imageUri: capsule.imageUri, imageSha256: capsule.imageSha256, imageSizeBytes: capsule.imageSizeBytes, capturedAt: capsule.capturedAt }];

  const isMultiPage = pages.length > 1;
  const isUploaded  = capsule.status === 'UPLOADED';
  const isFailed    = capsule.status === 'FAILED';

  const activePage = pages[currentPage];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 40,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Title + status ─────────────────────────────────── */}
      <View style={[styles.titleRow, { paddingHorizontal: 24 }]}>
        <View>
          <Text style={styles.title}>Evidence Review</Text>
          <Text style={styles.localId}>ID: {capsule.localId.slice(0, 8)}…</Text>
        </View>
        <StatusBadge status={capsule.status} showDot />
      </View>

      {/* ── Image carousel ─────────────────────────────────── */}
      <View style={styles.carouselWrapper}>
        <FlatList
          ref={carouselRef}
          data={pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => String(p.pageNumber)}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setCurrentPage(idx);
          }}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_W }}>
              <View style={styles.previewWrapper}>
                <Image
                  source={{ uri: item.imageUri }}
                  style={styles.preview}
                  resizeMode="contain"
                />
                {capsule.status === 'UPLOADING' && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="#3b82f6" size="large" />
                    <Text style={styles.uploadingText}>Uploading…</Text>
                  </View>
                )}
                {isUploaded && (
                  <View style={styles.uploadedBadge}>
                    <Text style={styles.uploadedBadgeText}>✓ Uploaded</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />

        {/* Page indicator dots */}
        {isMultiPage && (
          <View style={styles.dotRow}>
            {pages.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  carouselRef.current?.scrollToIndex({ index: i, animated: true });
                  setCurrentPage(i);
                }}
              >
                <View style={[styles.dot, i === currentPage && styles.dotActive]} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Page counter badge */}
        {isMultiPage && (
          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              Page {currentPage + 1} / {pages.length}
            </Text>
          </View>
        )}
      </View>

      {/* ── Per-page hash ───────────────────────────────────── */}
      <View style={{ paddingHorizontal: 24 }}>
        <SectionCard title={isMultiPage ? `Page ${currentPage + 1} — SHA-256 Hash` : 'Integrity Hash (SHA-256)'}>
          <Text style={styles.hash} selectable>
            {activePage?.imageSha256 ?? capsule.sha256Hash}
          </Text>
          {isMultiPage && (
            <Text style={styles.hashHint}>
              Each page has its own hash. Composite capsule hash: sealed at capture time.
            </Text>
          )}
          {!isMultiPage && (
            <Text style={styles.hashHint}>
              Sealed at capture time. Server rejects any capsule where the hash does not match.
            </Text>
          )}
        </SectionCard>

        {/* ── Submission details ───────────────────────────── */}
        <SectionCard title="Submission Details">
          <InfoRow label="Station Code"  value={capsule.iebcStationCode} mono />
          <InfoRow label="Position"      value={capsule.positionCode} />
          <InfoRow label="Election"      value={`Kenya General ${capsule.electionYear}`} />
          <InfoRow label="Pages"         value={`${pages.length} page${pages.length > 1 ? 's' : ''}`} />
          <InfoRow label="Captured At"   value={new Date(capsule.capturedAt).toLocaleString()} />
          <InfoRow label="Total Size"    value={`${(pages.reduce((acc, p) => acc + (p.imageSizeBytes ?? 0), 0) / 1024).toFixed(1)} KB`} />
          <InfoRow label="Sync Attempts" value={String(capsule.syncAttempts)} />
          {capsule.serverId ? (
            <InfoRow label="Server ID"   value={capsule.serverId.slice(0, 16) + '…'} mono />
          ) : null}
        </SectionCard>

        {/* ── GPS ──────────────────────────────────────────── */}
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
          </SectionCard>
        ) : (
          <SectionCard title="GPS Coordinates">
            <Text style={styles.noGps}>No GPS data — captured without location</Text>
          </SectionCard>
        )}

        {/* ── All pages thumbnail strip ─────────────────────── */}
        {isMultiPage && (
          <SectionCard title={`${pages.length} Pages Captured`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {pages.map((p, i) => (
                  <TouchableOpacity
                    key={p.pageNumber}
                    onPress={() => {
                      carouselRef.current?.scrollToIndex({ index: i, animated: true });
                      setCurrentPage(i);
                    }}
                    style={[styles.allThumbWrap, i === currentPage && styles.allThumbActive]}
                  >
                    <Image source={{ uri: p.imageUri }} style={styles.allThumb} />
                    <Text style={styles.allThumbLabel}>Pg {p.pageNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </SectionCard>
        )}

        {/* ── Sync error ────────────────────────────────────── */}
        {isFailed && capsule.lastSyncError ? (
          <View style={styles.failedBanner}>
            <Text style={styles.failedTitle}>Upload Failed</Text>
            <Text style={styles.failedMsg}>{capsule.lastSyncError}</Text>
            <Text style={styles.failedHint}>
              Capsule saved locally. It will retry when connectivity is restored.
            </Text>
          </View>
        ) : null}

        {/* ── Actions ──────────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.tallyBtn} onPress={handleEnterTally}>
            <Text style={styles.tallyBtnText}>Enter Tally Data →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureAnotherBtn} onPress={handleCaptureAnother}>
            <Text style={styles.captureAnotherText}>📷  Capture Another Form</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>Done — Go to Home</Text>
          </TouchableOpacity>

          {!isUploaded && (
            <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
              <Text style={styles.discardBtnText}>Discard This Submission</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a1628' },
  centerContainer: { flex: 1, backgroundColor: '#0a1628', justifyContent: 'center', alignItems: 'center' },
  loadingText:     { color: '#475569', fontSize: 14, marginTop: 12 },

  titleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title:           { color: '#f1f5f9', fontSize: 22, fontWeight: '700' },
  localId:         { color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 3 },

  // Carousel
  carouselWrapper: { marginBottom: 16 },
  previewWrapper:  { position: 'relative', paddingHorizontal: 24 },
  preview:         { width: '100%', height: 260, borderRadius: 10, backgroundColor: '#1e293b' },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    marginHorizontal: 24,
    backgroundColor: 'rgba(10,22,40,0.75)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  uploadingText:   { color: '#94a3b8', fontSize: 13 },
  uploadedBadge: {
    position: 'absolute', bottom: 10, right: 34,
    backgroundColor: '#14532d', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#22c55e',
  },
  uploadedBadgeText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },

  // Page dots
  dotRow:          { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: '#334155' },
  dotActive:       { backgroundColor: '#3b82f6', width: 18 },
  pageCounter: {
    position: 'absolute', top: 12, right: 32,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  pageCounterText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Hash
  hash:       { color: '#22d3ee', fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  hashHint:   { color: '#475569', fontSize: 11, marginTop: 8, lineHeight: 16 },
  noGps:      { color: '#475569', fontSize: 13, fontStyle: 'italic' },

  // All-pages strip
  allThumbWrap:   { alignItems: 'center' },
  allThumb:       { width: 56, height: 72, borderRadius: 6, borderWidth: 1.5, borderColor: '#334155' },
  allThumbActive: { },
  allThumbLabel:  { color: '#64748b', fontSize: 10, marginTop: 3 },

  // Failed
  failedBanner: {
    backgroundColor: '#450a0a', borderRadius: 8, padding: 14, marginBottom: 20,
    borderLeftWidth: 3, borderLeftColor: '#ef4444',
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
  discardBtn:          { borderRadius: 10, padding: 16, alignItems: 'center' },
  discardBtnText:      { color: '#ef4444', fontSize: 14 },
});
