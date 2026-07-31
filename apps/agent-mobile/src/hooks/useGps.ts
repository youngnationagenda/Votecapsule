// ============================================================
// VoteCapsule™ — GPS Hook
// apps/agent-mobile/src/hooks/useGps.ts
//
// Requests location permission and provides current coordinates.
// GPS is optional — if unavailable, capture proceeds without it.
// ============================================================
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { GpsCoords } from '../types';

interface UseGpsResult {
  coords: GpsCoords | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useGps(): UseGpsResult {
  const [coords, setCoords] = useState<GpsCoords | null>(null);
  const [error, setError]   = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLocation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied — GPS will not be attached');
        setCoords(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCoords({
        latitude:      loc.coords.latitude,
        longitude:     loc.coords.longitude,
        altitude:      loc.coords.altitude,
        accuracyMeters: loc.coords.accuracy,
        capturedAt:    new Date(loc.timestamp).toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GPS error';
      setError(`GPS unavailable: ${msg}`);
      setCoords(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return { coords, error, isLoading, refresh: fetchLocation };
}
