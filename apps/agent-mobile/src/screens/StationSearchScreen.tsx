// ============================================================
// VoteCapsule™ — Station Search Screen
// apps/agent-mobile/src/screens/StationSearchScreen.tsx
//
// Agents find their polling station via:
//   1. Barcode scan — scan the IEBC barcode on Form 35A envelope
//   2. Direct 15-digit code entry
//   3. Name search (station, centre, or area name)
//
// Results are cached for offline use.
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, PollingStation } from '../types';
import { validateStation, searchStations as searchStationsApi } from '../services/api';
import { useCaptureStore } from '../store/captureStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'StationSearch'>;
};

const CACHE_KEY = 'vc:station_cache';

// IEBC barcode contains the 15-digit station code — extract it
function extractIebcCode(raw: string): string | null {
  // Direct 15-digit code
  if (/^\d{15}$/.test(raw.trim())) return raw.trim();
  // Code embedded in longer barcode data (e.g. "KE2027001001000100101")
  const match = raw.match(/\d{15}/);
  return match ? match[0] : null;
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

  // ── Barcode scan ─────────────────────────────────────────

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
    if (scanHandled) return; // prevent double-fire
    setScanHandled(true);
    setScannerOpen(false);

    const code = extractIebcCode(result.data);
    if (!code) {
      Alert.alert('Invalid Barcode', `Could not extract IEBC station code from: "${result.data}"`);
      setScanHandled(false);
      return;
    }

    setCodeInput(code);
    setIsValidating(true);
    try {
      const data = await validateStation(code);
      const station = mapStation(data);
      handleSelect(station);
    } catch {
      Alert.alert('Station Not Found', `Station code ${code} not found in NEC database.`);
      setScanHandled(false);
    } finally {
      setIsValidating(false);
    }
  }, [scanHandled]);

  // ── Manual code entry ─────────────────────────────────────

  const handleValidateCode = async () => {
    const code = codeInput.trim();
    if (code.length !== 15) {
      Alert.alert('Invalid Code', 'IEBC station code must be exactly 15 digits.');
      return;
    }
    setIsValidating(true);
    try {
      const data = await validateStation(code);
      const station = mapStation(data);
      handleSelect(station);
    } catch {
      Alert.alert('Not Found', `Station code ${code} not found in NEC database.`);
    } finally {
      setIsValidating(false);
    }
  };

  // ── Name search ───────────────────────────────────────────

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); return; }
    setIsSearching(true);
    try {
      const data = await searchStationsApi(q.trim());
      const stations = Array.isArray(data) ? mapStations(data) : [];
      setResults(stations);
      // Cache results for offline use
      if (stations.length > 0) {
        const cache = await loadCache();
        stations.forEach((s) => { cache[s.iebcCode] = s; });
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch {
      // Fall back to local cache
      const cache = await loadCache();
      const q_lower = q.toLowerCase();
      const cached = Object.values(cache).filter(
        (s: any) =>
          s.streamName?.toLowerCase().includes(q_lower) ||
          s.centreName?.toLowerCase().includes(q_lower) ||
          s.wardName?.toLowerCase().includes(q_lower) ||
          s.constituencyName?.toLowerCase().includes(q_lower),
      );
      setResults(cached as PollingStation[]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // ── Station select ────────────────────────────────────────

  const handleSelect = (station: PollingStation) => {
    setStation(station);
    navigation.navigate('Capture', { stationCode: station.iebcCode });
  };

  // ── Result card ───────────────────────────────────────────

  const renderResult = ({ item }: { item: PollingStation }) => (
    <TouchableOpacity style={styles.resultCard} onPress={() => handleSelect(item)}>
      <Text style={styles.resultStream}>{item.streamName}</Text>
      <Text style={styles.resultCentre}>{item.centreName}</Text>
      <Text style={styles.resultConst}>{item.constituencyName} · {item.countyName}</Text>
      <Text style={styles.resultCode}>{item.iebcCode}</Text>
      <Text style={styles.resultVoters}>{item.registeredVoters.toLocaleString()} registered voters</Text>
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
            barcodeScannerSettings={{ barcodeTypes: ['code128', 'code39', 'qr', 'ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScan}
          />
          {/* Scan guide overlay */}
          <View style={styles.scanOverlay}>
            <View style={styles.scanHeader}>
              <Text style={styles.scanTitle}>Scan IEBC Barcode</Text>
              <Text style={styles.scanSubtitle}>Point camera at the barcode on the Form 35A envelope</Text>
            </View>
            <View style={styles.scanFrame}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.scanFooter}>
              <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setScannerOpen(false)}>
                <Text style={styles.cancelScanText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Main screen ───────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Polling Station</Text>

      {/* Scan button — primary method per V8 spec */}
      <TouchableOpacity style={styles.scanBtn} onPress={handleOpenScanner}>
        <Text style={styles.scanBtnIcon}>📷</Text>
        <View style={styles.scanBtnText}>
          <Text style={styles.scanBtnLabel}>Scan IEBC Barcode</Text>
          <Text style={styles.scanBtnSub}>Scan barcode on Form 35A envelope</Text>
        </View>
        <Text style={styles.scanBtnArrow}>›</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or enter manually</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Direct 15-digit code entry */}
      <View style={styles.codeRow}>
        <TextInput
          style={styles.codeInput}
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="15-digit IEBC code"
          placeholderTextColor="#475569"
          keyboardType="numeric"
          maxLength={15}
        />
        <TouchableOpacity
          style={[styles.codeBtn, (isValidating || codeInput.length !== 15) && styles.codeBtnDisabled]}
          onPress={handleValidateCode}
          disabled={isValidating || codeInput.length !== 15}
        >
          {isValidating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.codeBtnText}>Go</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Name search */}
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Search by station, centre, or area name…"
        placeholderTextColor="#475569"
        clearButtonMode="always"
      />

      {isSearching && (
        <ActivityIndicator color="#3b82f6" style={{ marginVertical: 12 }} />
      )}

      <FlatList
        data={results}
        keyExtractor={(s) => s.iebcCode}
        renderItem={renderResult}
        contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 40 }}
        ListEmptyComponent={
          !isSearching && query.length >= 3 ? (
            <Text style={styles.noResults}>No stations found. Try a different name or scan the barcode.</Text>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, marginTop: 8 }}
      />
    </View>
  );
}

// ── Data helpers ──────────────────────────────────────────────

function mapStation(raw: any): PollingStation {
  return {
    iebcCode:          raw.iebcCode        ?? raw.iebc_code       ?? raw.iebcStationCode ?? '',
    streamName:        raw.streamName      ?? raw.stream_name     ?? raw.name            ?? '',
    registeredVoters:  raw.registeredVoters ?? raw.registered_voters ?? 0,
    countyCode:        raw.countyCode      ?? raw.county_code     ?? '',
    countyName:        raw.countyName      ?? raw.county_name     ?? '',
    constituencyCode:  raw.constituencyCode ?? raw.constituency_code ?? '',
    constituencyName:  raw.constituencyName ?? raw.constituency_name ?? '',
    wardCode:          raw.wardCode        ?? raw.ward_code       ?? '',
    wardName:          raw.wardName        ?? raw.ward_name       ?? '',
    centreName:        raw.centreName      ?? raw.centre_name     ?? '',
    centreCode:        raw.centreCode      ?? raw.centre_code     ?? '',
    latitude:          raw.latitude        ?? null,
    longitude:         raw.longitude       ?? null,
  };
}

function mapStations(raw: any[]): PollingStation[] {
  return raw.map(mapStation);
}

async function loadCache(): Promise<Record<string, PollingStation>> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : {};
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0a1628', padding: 16, paddingTop: 56 },
  title:            { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 16 },

  // Scan button
  scanBtn:          { backgroundColor: '#1e3a5f', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#2563eb', marginBottom: 16 },
  scanBtnIcon:      { fontSize: 28 },
  scanBtnText:      { flex: 1 },
  scanBtnLabel:     { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
  scanBtnSub:       { color: '#475569', fontSize: 12, marginTop: 2 },
  scanBtnArrow:     { color: '#3b82f6', fontSize: 22 },

  // Divider
  divider:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  dividerLine:      { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText:      { color: '#475569', fontSize: 12 },

  // Code entry
  codeRow:          { flexDirection: 'row', gap: 8, marginBottom: 12 },
  codeInput:        { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#334155', fontFamily: 'monospace' },
  codeBtn:          { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 20, justifyContent: 'center' },
  codeBtnDisabled:  { backgroundColor: '#1e3a5f', opacity: 0.6 },
  codeBtnText:      { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Search input
  searchInput:      { backgroundColor: '#1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 15, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#334155' },

  // Result cards
  resultCard:       { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 8 },
  resultStream:     { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  resultCentre:     { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  resultConst:      { color: '#64748b', fontSize: 12, marginTop: 2 },
  resultCode:       { color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  resultVoters:     { color: '#22c55e', fontSize: 11, marginTop: 2 },
  noResults:        { color: '#475569', fontSize: 14, textAlign: 'center', paddingTop: 32 },

  // Scanner modal
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scanOverlay:      { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  scanHeader:       { backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, paddingTop: 60, alignItems: 'center' },
  scanTitle:        { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanSubtitle:     { color: '#94a3b8', fontSize: 13, marginTop: 4, textAlign: 'center' },
  scanFrame:        { alignSelf: 'center', width: 280, height: 140, position: 'relative' },

  // Corner markers
  corner:           { position: 'absolute', width: 24, height: 24, borderColor: '#3b82f6', borderWidth: 3 },
  cornerTL:         { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR:         { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL:         { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR:         { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

  scanFooter:       { backgroundColor: 'rgba(0,0,0,0.7)', padding: 30, alignItems: 'center' },
  cancelScanBtn:    { backgroundColor: '#1e293b', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  cancelScanText:   { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
});
