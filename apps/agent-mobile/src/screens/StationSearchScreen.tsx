// ============================================================
// VoteCapsule™ — Station Search Screen
// apps/agent-mobile/src/screens/StationSearchScreen.tsx
//
// Agents find their polling station via:
//   1. Barcode scan — scan the IEBC barcode on Form 35A envelope
//   2. Direct 15-digit code entry
//   3. Name / area search (with local offline cache fallback)
//
// Results are cached offline in AsyncStorage.
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { RootStackParamList, PollingStation } from '../types';
import { validateStation, searchStations as searchStationsApi } from '../services/api';
import { useCaptureStore } from '../store/captureStore';
import { EmptyState } from '../components/EmptyState';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'StationSearch'>;
};

const CACHE_KEY = 'vc:station_cache';

/** Extract a 15-digit IEBC station code from raw barcode data. */
function extractIebcCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{15}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/\d{15}/);
  return match ? match[0] : null;
}

async function loadCache(): Promise<Record<string, PollingStation>> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveToCache(stations: PollingStation[]): Promise<void> {
  try {
    const cache = await loadCache();
    stations.forEach((s) => { cache[s.iebcCode] = s; });
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache is best-effort
  }
}

function mapStation(raw: any): PollingStation {
  return {
    iebcCode:          raw.iebcCode          ?? raw.iebc_code          ?? raw.iebcStationCode ?? '',
    streamName:        raw.streamName         ?? raw.stream_name         ?? raw.name            ?? '',
    registeredVoters:  raw.registeredVoters   ?? raw.registered_voters   ?? 0,
    countyCode:        raw.countyCode         ?? raw.county_code         ?? '',
    countyName:        raw.countyName         ?? raw.county_name         ?? '',
    constituencyCode:  raw.constituencyCode   ?? raw.constituency_code   ?? '',
    constituencyName:  raw.constituencyName   ?? raw.constituency_name   ?? '',
    wardCode:          raw.wardCode           ?? raw.ward_code           ?? '',
    wardName:          raw.wardName           ?? raw.ward_name           ?? '',
    centreName:        raw.centreName         ?? raw.centre_name         ?? '',
    centreCode:        raw.centreCode         ?? raw.centre_code         ?? '',
    latitude:          raw.latitude           ?? null,
    longitude:         raw.longitude          ?? null,
  };
}

export default function StationSearchScreen({ navigation }: Props) {
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<PollingStation[]>([]);
  const [isSearching, setIsSearching]   = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [codeInput, setCodeInput]       = useState('');
  const [scannerOpen, setScannerOpen]   = useState(false);
  const [scanHandled, setScanHandled]   = useState(false);

  const [permission, requestPermission] = useCameraPermissions();
  const { setStation } = useCaptureStore();
  const insets = useSafeAreaInsets();

  // ── Station select ────────────────────────────────────────

  const handleSelect = useCallback((station: PollingStation) => {
    setStation(station);
    navigation.navigate('Capture', { stationCode: station.iebcCode });
  }, [setStation, navigation]);

  // ── Barcode scanner ───────────────────────────────────────

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera Permission', 'Camera access is required to scan barcodes.');
        return;
      }
    }
    setScanHandled(false);
    setScannerOpen(true);
  };

  const handleBarcodeScan = useCallback(async (result: BarcodeScanningResult) => {
    if (scanHandled) return;
    setScanHandled(true);
    setScannerOpen(false);

    const code = extractIebcCode(result.data);
    if (!code) {
      Alert.alert('Invalid Barcode', `Could not find a 15-digit IEBC code in:\n"${result.data}"`);
      setScanHandled(false);
      return;
    }

    setCodeInput(code);
    setIsValidating(true);
    try {
      const data    = await validateStation(code);
      const station = mapStation(data);
      await saveToCache([station]);
      handleSelect(station);
    } catch {
      Alert.alert('Station Not Found', `Station code ${code} is not in the NEC database.\n\nCheck the barcode and try again.`);
      setScanHandled(false);
    } finally {
      setIsValidating(false);
    }
  }, [scanHandled, handleSelect]);

  // ── Manual code entry ─────────────────────────────────────

  const handleValidateCode = async () => {
    const code = codeInput.trim();
    if (!/^\d{15}$/.test(code)) {
      Alert.alert('Invalid Code', 'IEBC station code must be exactly 15 digits.');
      return;
    }
    setIsValidating(true);
    try {
      const data    = await validateStation(code);
      const station = mapStation(data);
      await saveToCache([station]);
      handleSelect(station);
    } catch {
      Alert.alert('Not Found', `Station code ${code} was not found in the NEC database.`);
    } finally {
      setIsValidating(false);
    }
  };

  // ── Name search ───────────────────────────────────────────

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); return; }
    setIsSearching(true);
    try {
      const data     = await searchStationsApi(q.trim());
      const stations = (Array.isArray(data) ? data : []).map(mapStation);
      setResults(stations);
      if (stations.length > 0) await saveToCache(stations);
    } catch {
      // Offline fallback — search local cache
      const cache   = await loadCache();
      const q_lower = q.toLowerCase();
      const cached  = Object.values(cache).filter(
        (s: any) =>
          s.streamName?.toLowerCase().includes(q_lower)        ||
          s.centreName?.toLowerCase().includes(q_lower)        ||
          s.wardName?.toLowerCase().includes(q_lower)          ||
          s.constituencyName?.toLowerCase().includes(q_lower)  ||
          s.countyName?.toLowerCase().includes(q_lower),
      ) as PollingStation[];
      setResults(cached);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // ── Result card ───────────────────────────────────────────

  const renderResult = ({ item }: { item: PollingStation }) => (
    <TouchableOpacity style={styles.resultCard} onPress={() => handleSelect(item)} activeOpacity={0.75}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultStream} numberOfLines={1}>{item.streamName}</Text>
        <Text style={styles.resultVoters}>{item.registeredVoters.toLocaleString()} voters</Text>
      </View>
      <Text style={styles.resultCentre} numberOfLines={1}>{item.centreName}</Text>
      <Text style={styles.resultConst}>{item.wardName} · {item.constituencyName} · {item.countyName}</Text>
      <Text style={styles.resultCode}>{item.iebcCode}</Text>
    </TouchableOpacity>
  );

  // ── Barcode scanner modal ─────────────────────────────────

  if (scannerOpen) {
    return (
      <Modal visible animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'pdf417'],
            }}
            onBarcodeScanned={handleBarcodeScan}
          />
          <View style={[styles.scanOverlay, { paddingTop: insets.top }]}>
            <View style={styles.scanHeader}>
              <Text style={styles.scanTitle}>Scan IEBC Barcode</Text>
              <Text style={styles.scanSubtitle}>
                Point at the barcode on the Form 35A envelope
              </Text>
            </View>

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.scanLine} />
            </View>

            <View style={[styles.scanFooter, { paddingBottom: insets.bottom + 20 }]}>
              <Text style={styles.scanHint}>Barcode will be scanned automatically</Text>
              <TouchableOpacity
                style={styles.cancelScanBtn}
                onPress={() => setScannerOpen(false)}
              >
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Main search screen ────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Title */}
      <Text style={styles.title}>Find Polling Station</Text>

      {/* ── Scan button ────────────────────────────────────── */}
      <TouchableOpacity style={styles.scanBtn} onPress={handleOpenScanner}>
        <Text style={styles.scanBtnIcon}>📷</Text>
        <View style={styles.scanBtnBody}>
          <Text style={styles.scanBtnLabel}>Scan IEBC Barcode</Text>
          <Text style={styles.scanBtnSub}>Fastest — scan barcode on Form 35A envelope</Text>
        </View>
        <Text style={styles.scanBtnArrow}>›</Text>
      </TouchableOpacity>

      {/* ── Divider ────────────────────────────────────────── */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or enter manually</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* ── Code entry ─────────────────────────────────────── */}
      <View style={styles.codeRow}>
        <TextInput
          style={styles.codeInput}
          value={codeInput}
          onChangeText={(t) => setCodeInput(t.replace(/\D/g, '').slice(0, 15))}
          placeholder="15-digit IEBC code"
          placeholderTextColor="#475569"
          keyboardType="numeric"
          maxLength={15}
          returnKeyType="go"
          onSubmitEditing={handleValidateCode}
        />
        <TouchableOpacity
          style={[
            styles.codeBtn,
            (isValidating || codeInput.length !== 15) && styles.codeBtnDisabled,
          ]}
          onPress={handleValidateCode}
          disabled={isValidating || codeInput.length !== 15}
        >
          {isValidating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.codeBtnText}>Go</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Name search ────────────────────────────────────── */}
      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search station, centre, ward, constituency…"
          placeholderTextColor="#475569"
          clearButtonMode="always"
          returnKeyType="search"
        />
      </View>

      {isSearching && (
        <ActivityIndicator color="#3b82f6" style={{ marginVertical: 12 }} />
      )}

      {/* ── Results ────────────────────────────────────────── */}
      <FlatList
        data={results}
        keyExtractor={(s) => s.iebcCode}
        renderItem={renderResult}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        ListEmptyComponent={
          !isSearching && query.length >= 3 ? (
            <EmptyState
              icon="🔍"
              title="No stations found"
              subtitle={`No results for "${query}". Try a different name, scan the barcode, or enter the 15-digit code directly.`}
            />
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628', paddingHorizontal: 16 },
  title:            { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 16 },

  // Scan
  scanBtn: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    marginBottom: 16,
  },
  scanBtnIcon:   { fontSize: 28 },
  scanBtnBody:   { flex: 1 },
  scanBtnLabel:  { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  scanBtnSub:    { color: '#475569', fontSize: 12, marginTop: 2 },
  scanBtnArrow:  { color: '#3b82f6', fontSize: 22 },

  // Divider
  divider:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText:   { color: '#475569', fontSize: 12 },

  // Code entry
  codeRow:       { flexDirection: 'row', gap: 8, marginBottom: 12 },
  codeInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  codeBtn:         { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  codeBtnDisabled: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  codeBtnText:     { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 4,
  },
  searchIcon:    { paddingLeft: 12, fontSize: 16 },
  searchInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },

  // Result cards
  resultCard:    { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 8 },
  resultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  resultStream:  { color: '#f1f5f9', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  resultVoters:  { color: '#22c55e', fontSize: 11, paddingTop: 2 },
  resultCentre:  { color: '#94a3b8', fontSize: 12, marginBottom: 2 },
  resultConst:   { color: '#64748b', fontSize: 11, marginBottom: 4 },
  resultCode:    { color: '#334155', fontSize: 11, fontFamily: 'monospace' },

  // Scanner modal
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scanOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanHeader: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  scanTitle:     { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanSubtitle:  { color: '#94a3b8', fontSize: 13, marginTop: 6, textAlign: 'center' },
  scanFrame: {
    alignSelf: 'center',
    width: 300,
    height: 150,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner:        { position: 'absolute', width: 28, height: 28, borderColor: '#3b82f6', borderWidth: 3 },
  cornerTL:      { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR:      { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL:      { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR:      { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine:      { position: 'absolute', left: 4, right: 4, height: 2, backgroundColor: 'rgba(59,130,246,0.6)' },
  scanFooter: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingTop: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 14,
  },
  scanHint:      { color: '#64748b', fontSize: 13 },
  cancelScanBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 40 },
  cancelScanText:{ color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
});
