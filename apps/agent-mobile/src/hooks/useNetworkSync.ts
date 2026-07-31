// ============================================================
// VoteCapsule™ — Network + Sync Hook
// apps/agent-mobile/src/hooks/useNetworkSync.ts
//
// Watches connectivity and triggers sync when coming online.
// ============================================================
import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { runSync } from '../services/syncEngine';

interface UseNetworkSyncResult {
  isOnline: boolean;
  isWifi: boolean;
}

export function useNetworkSync(): UseNetworkSyncResult {
  const [isOnline, setIsOnline] = useState(true);
  const [isWifi, setIsWifi]     = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected ?? false;
      const wifi   = state.type === 'wifi';

      const wasOffline = !isOnline;
      setIsOnline(online);
      setIsWifi(wifi);

      // Came back online — immediately try to flush the queue
      if (wasOffline && online) {
        runSync();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  return { isOnline, isWifi };
}
