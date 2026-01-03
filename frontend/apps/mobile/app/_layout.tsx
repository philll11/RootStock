import { useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, DrawerProvider, NotificationProvider, useNetworkStatus } from '@rootstock/ui/mobile';
import { AppDrawer } from '../src/components/AppDrawer';
import { useAuthSession } from '@rootstock/iam/auth/auth-data-access';
import { useSyncOfflineData } from '@rootstock/system/sync/sync-data-access';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { initAuth } from '../src/config/auth';

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

  useEffect(() => {
    if (isAuthenticated && isOnline) {
      syncAll();
    }
  }, [isAuthenticated, isOnline]);

  useEffect(() => {
    if (isAuthenticated === null) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'forgot-password';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, segments]);

  const onLayoutRootView = useCallback(async () => {
    if (isAuthenticated !== null) {
      // This tells the splash screen to hide immediately! If we do this, it is too late!
      // We need to wait for navigation to be ready?
      // Actually, just hiding it when auth is determined is good enough for now.
      await SplashScreen.hideAsync();
    }
  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    return null; // Render nothing while splash screen is up
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
