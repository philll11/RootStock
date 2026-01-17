import { useEffect, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ThemeProvider, DrawerProvider, NotificationProvider, useNetworkStatus } from '@rootstock/ui/mobile';
import { AppDrawer } from '../src/components/AppDrawer';
import { useAuthSession } from '@rootstock/iam/auth/auth-data-access';
import { useSyncOfflineData } from '@rootstock/system/sync/sync-data-access';
import { View, ActivityIndicator, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initAuth } from '../src/config/auth';
import { apiClient, checkApiReachability } from '@rootstock/shared/api-client';

// Initialize Auth System (Storage + Interceptors)
initAuth();

// Configure TanStack Query Online Manager
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener(async (state) => {
    // Tiered Connection Check
    const hasConnection = !!state.isConnected;
    const hasInternet = !!state.isInternetReachable;

    // Fast Fail: If no physical connection or no internet, we are offline
    if (!hasConnection || (state.isInternetReachable !== null && !hasInternet)) {
      setOnline(false);
      return;
    }

    // Tier 3: API Ping
    const canReachApi = await checkApiReachability();
    setOnline(canReachApi);
  });
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
    mutations: {
      retry: 3,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

function RootLayoutNav() {
  const { isAuthenticated } = useAuthSession();
  const segments = useSegments();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { syncAll } = useSyncOfflineData();
  const lastSyncTime = useRef<number>(0);

  // App State Listener for Session Verification
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        // Verify session validity when app resumes
        apiClient.get('/auth/profile').catch(() => {
          // If 401, interceptor will handle refresh or logout
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  // Optimized Sync Logic
  useEffect(() => {
    if (isAuthenticated && isOnline) {
      const now = Date.now();
      // Sync if never synced or > 15 mins ago
      if (now - lastSyncTime.current > 15 * 60 * 1000) {
        syncAll();
        lastSyncTime.current = now;
      }
    }
  }, [isAuthenticated, isOnline, syncAll]);

  const inAuthGroup = segments[0] === 'login' || segments[0] === 'forgot-password';

  useEffect(() => {
    if (isAuthenticated === null) return;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, segments, inAuthGroup]);

  const onLayoutRootView = useCallback(async () => {
    if (isAuthenticated !== null) {
      await SplashScreen.hideAsync();
    }
  }, [isAuthenticated]);

  // Prevent rendering the UI until the navigation state matches the auth state
  // This avoids the "Flash of Unauthenticated Content" (FOUC)
  if (isAuthenticated === null || (!isAuthenticated && !inAuthGroup) || (isAuthenticated && inAuthGroup)) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <DrawerProvider>
        <NotificationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(root)" />
            <Stack.Screen name="login" />
            <Stack.Screen name="forgot-password" />
          </Stack>
          {isAuthenticated && <AppDrawer />}
        </NotificationProvider>
      </DrawerProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        dehydrateOptions: {
          shouldDehydrateMutation: (mutation) => true,
          shouldDehydrateQuery: (query) => {
            const queryState = query.state;
            if (queryState.data === undefined) return false;
            // Persist as long as we have data, even if the last fetch failed (e.g. offline)
            return true;
          },
        },
      }}
    >
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
