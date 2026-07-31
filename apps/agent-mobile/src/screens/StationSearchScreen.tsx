// ============================================================
// VoteCapsule™ — Station Search Screen
// apps/agent-mobile/src/screens/StationSearchScreen.tsx
//
// Agents search for their assigned polling station using the
// NEC SSoT via the Election Service.
// Supports offline: stations can be searched from a locally
// cached list if available.
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, PollingStation } from '../types';
import { validateStation, searchStations as searchStationsApi } from '../services/api';
import { useCaptureStore } from '../store/captureStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'StationSearch'>;
};

const CACHE_KEY = 'vc:station_cache';

export default function StationSearchScreen({ navigation }: Props) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<PollingStation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [codeInput, setCodeInput]   = useState('');

  const { setStation } = useCaptureStore();

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setResults([]); return; }
    setIsSearching(true);
    try {
      const data = await searchStationsApi(q.trim());
      const stations = Array.isArray(data) ? mapStations(data) : [];
      setResults(stations);
      // Cache for offline use
      if (stations.length > 0) {
        const cache = await loadCache();
        stations.forEach((s) => { cache[s.iebcCode] = s; });
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      }
    } catch {
      // Try from cache
      const cache = await loadCache();
      const cached = Object.values(cache).filter(
        (s: any) => s.streamName?.toLowerCase().includes(q.toLowerCase()) ||
                    s.centreName?.toLowerCase().includes(q.toLowerCase()),
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
    } catch (err: unknown) {
      Alert.alert('Not Found', `Station code ${code} not found in NEC database.`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSelect = (station: PollingStation) => {
    setStation(station);
    navigation.navigate('Capture', { stationCode: station.iebcCode });
  };

  const renderResult = ({ item }: { item: PollingStation }) => (
    <TouchableOpacity style={styles.resultCard} onPress={() => handleSelect(item)}>
      <Text style={styles.resultStream}>{item.streamName}</Text>
      <Text style={styles.resultCentre}>{item.centreName}</Text>
      <Text style={styles.resultConst}>{item.constituencyName} · {item.countyName}</Text>
      <Text style={styles.resultCode}>{item.iebcCode}</Text>
      <Text style={styles.resultVoters}>{item.registeredVoters.toLocaleString()} voters</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find Polling Station</Text>

      {/* Direct code entry */}
      <View style={styles.codeRow}>
        <TextInput
          style={styles.codeInput}
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="Enter 15-digit IEBC code"
          placeholderTextColor="#475569"
          keyboardType="numeric"
          maxLength={15}
        />
        <TouchableOpacity
          style={[styles.codeBtn, isValidating && styles.codeBtnDisabled]}
          onPress={handleValidateCode}
          disabled={isValidating}
        >
          {isValidating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.codeBtnText}>Go</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={styles.orText}>— or search by name —</Text>

      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Station, centre, or area name…"
        placeholderTextColor="#475569"
        autoFocus
        clearButtonMode="always"
      />

      {isSearching && (
        <ActivityIndicator color="#3b82f6" style={{ marginVertical: 12 }} />
      )}

      <FlatList
        data={results}
        keyExtractor={(s) => s.iebcCode}
        renderItem={renderResult}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          !isSearching && query.length >= 3 ? (
            <Text style={styles.noResults}>No stations found. Try a different name.</Text>
          ) : null
        }
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

// ── Helpers ───────────────────────────────────────────────

function mapStation(raw: any): PollingStation {
  return {
    iebcCode:          raw.iebcCode ?? raw.iebc_code ?? '',
    streamName:        raw.streamName ?? raw.stream_name ?? '',
    registeredVoters:  raw.registeredVoters ?? raw.registered_voters ?? 0,
    countyCode:        raw.countyCode ?? raw.county_code ?? '',
    countyName:        raw.countyName ?? raw.county_name ?? '',
    constituencyCode:  raw.constituencyCode ?? raw.constituency_code ?? '',
    constituencyName:  raw.constituencyName ?? raw.constituency_name ?? '',
    wardCode:          raw.wardCode ?? raw.ward_code ?? '',
    wardName:          raw.wardName ?? raw.ward_name ?? '',
    centreName:        raw.centreName ?? raw.centre_name ?? '',
    centreCode:        raw.centreCode ?? raw.centre_code ?? '',
    latitude:          raw.latitude ?? null,
    longitude:         raw.longitude ?? null,
  };
}

function mapStations(raw: any[]): PollingStation[] {
  return raw.map(mapStation);
}

async function loadCache(): Promise<Record<string, PollingStation>> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : {};
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0a1628', padding: 16, paddingTop: 56 },
  title:           { color: '#f1f5f9', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  codeRow:         { flexDirection: 'row', gap: 8, marginBottom: 8 },
  codeInput:       { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 14, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#334155', fontFamily: 'monospace' },
  codeBtn:         { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  codeBtnDisabled: { opacity: 0.5 },
  codeBtnText:     { color: '#fff', fontWeight: '600' },
  orText:          { color: '#475569', fontSize: 12, textAlign: 'center', marginVertical: 10 },
  searchInput:     { backgroundColor: '#1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 15, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 4 },
  resultCard:      { backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 8 },
  resultStream:    { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  resultCentre:    { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  resultConst:     { color: '#64748b', fontSize: 12, marginTop: 2 },
  resultCode:      { color: '#475569', fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  resultVoters:    { color: '#22c55e', fontSize: 11, marginTop: 2 },
  noResults:       { color: '#475569', fontSize: 14, textAlign: 'center', paddingTop: 32 },
});
