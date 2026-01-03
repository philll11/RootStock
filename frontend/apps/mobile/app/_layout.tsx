import { useEffect, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, DrawerProvider, NotificationProvider, useNetworkStatus } from '@rootstock/ui/mobile';
import { AppDrawer } from '../src/components/AppDrawer';
import { useAuthSession } from '@rootstock/iam/auth/auth-data-access';
import { useSyncOfflineData } from '@rootstock/system/sync/sync-data-access';
import { View, ActivityIndicator, AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initAuth } from '../src/config/auth';
import { apiClient } from '@rootstock/shared/api-client';

// Initialize Auth System (Storage + Interceptors)
initAuth();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
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
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
