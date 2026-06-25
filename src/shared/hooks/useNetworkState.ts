/**
 * useNetworkState.ts
 *
 * Monitors network connectivity. Components can call this hook to
 * show offline banners, disable network actions, or queue writes.
 *
 * Uses expo-network (included in Expo SDK 54).
 */
import { useState, useEffect } from 'react';
import * as Network             from 'expo-network';
import { AppState }             from 'react-native';

export interface NetworkState {
  isConnected:  boolean;
  isInternetReachable: boolean;
  type:         string;
}

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isConnected:          true,
    isInternetReachable:  true,
    type:                 'unknown',
  });

  const check = async () => {
    try {
      const net = await Network.getNetworkStateAsync();
      setState({
        isConnected:         net.isConnected ?? true,
        isInternetReachable: net.isInternetReachable ?? true,
        type:                net.type ?? 'unknown',
      });
    } catch {
      // Assume connected if check fails
    }
  };

  useEffect(() => {
    check();

    // Re-check when app comes to foreground
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });

    // Poll every 30 seconds
    const interval = setInterval(check, 30_000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  return state;
}
