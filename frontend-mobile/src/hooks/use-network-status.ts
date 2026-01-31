import { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const { isConnected, isInternetReachable } = useNetInfo();
  // Treat null as true (initial state) to avoid blocking
  const isOnline = isConnected ?? true; 
  return { isOnline };
}
