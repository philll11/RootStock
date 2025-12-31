import { useEffect } from 'react';
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

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
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
