import { useEffect, useCallback, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, onlineManager, useIsRestoring } from '@tanstack/react-query';
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
import { BLOCKS_KEYS, createBlock, updateBlock, deleteBlock } from '@rootstock/assets/blocks/blocks-data-access';
import { CLIENTS_KEYS, createClient, updateClient, deleteClient } from '@rootstock/iam/clients/clients-data-access';
import { ORCHARDS_KEYS, createOrchard, updateOrchard, deleteOrchard } from '@rootstock/assets/orchards/orchards-data-access';
import { VARIETIES_KEYS, createVariety, updateVariety, deleteVariety } from '@rootstock/master-data/varieties/varieties-data-access';

// Initialize Auth System (Storage + Interceptors)
initAuth();

// Configure TanStack Query Online Manager to start offline
// This prevents default concurrent automatic query/mutation behavior.
onlineManager.setOnline(false);

// DISABLE Default Event Listener
// We must manage the online state manually to orchestrate serial sync.
// If we don't do this, the default listener will detect "Internet Reachable" 
// and immediately flip the switch to true, causing a concurrent flush race condition.
onlineManager.setEventListener((setOnline) => {
   // No-op. We will call setOnline() manually in our useEffect.
   return () => {};
});

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
    mutations: {
      retry: (failureCount, error) => {
        // Safety Net: Retry 404s caused by missing "Horizontal" dependencies (Varieties)
        // or "Vertical" dependencies (Clients/Orchards) created in parallel scopes.
        const status = (error as any)?.response?.status;
        
        // Axios stores request payload in error.config.data (usually JSON string)
        const dataStr = (error as any)?.config?.data;
        const hasDependency = typeof dataStr === 'string' && 
          (dataStr.includes('"varietyId"') || dataStr.includes('"clientId"') || dataStr.includes('"orchardId"'));

        if (status === 404 && hasDependency) {
          return failureCount < 5;
        }
        return failureCount < 3;
      },
    },
  },
});

// Register Mutation Defaults for Offline Persistence
// This ensures that when the app restarts, the restored mutations know which function to execute.
queryClient.setMutationDefaults(BLOCKS_KEYS.mutations.create, { mutationFn: createBlock });
queryClient.setMutationDefaults(BLOCKS_KEYS.mutations.update, { mutationFn: updateBlock });
queryClient.setMutationDefaults(BLOCKS_KEYS.mutations.delete, { mutationFn: deleteBlock });

queryClient.setMutationDefaults(CLIENTS_KEYS.mutations.create, { mutationFn: createClient });
queryClient.setMutationDefaults(CLIENTS_KEYS.mutations.update, { mutationFn: updateClient });
queryClient.setMutationDefaults(CLIENTS_KEYS.mutations.delete, { mutationFn: deleteClient });

queryClient.setMutationDefaults(ORCHARDS_KEYS.mutations.create, { mutationFn: createOrchard });
queryClient.setMutationDefaults(ORCHARDS_KEYS.mutations.update, { mutationFn: updateOrchard });
queryClient.setMutationDefaults(ORCHARDS_KEYS.mutations.delete, { mutationFn: deleteOrchard });

queryClient.setMutationDefaults(VARIETIES_KEYS.mutations.create, { mutationFn: createVariety });
queryClient.setMutationDefaults(VARIETIES_KEYS.mutations.update, { mutationFn: updateVariety });
queryClient.setMutationDefaults(VARIETIES_KEYS.mutations.delete, { mutationFn: deleteVariety });

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

function RootLayoutNav() {
  const { isAuthenticated } = useAuthSession();
  const segments = useSegments();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { syncAll } = useSyncOfflineData();
  const isRestoring = useIsRestoring();
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

  // Manual Network Manager & Sync Orchestrator
  useEffect(() => {
    // If we are restoring persistent state, do not mess with network yet.
    if (isRestoring) return;

    const handleNetworkChange = async (state: any) => {
       const hasConnection = !!state.isConnected;
       const hasInternet = !!state.isInternetReachable;
       
       // Strict check: Must have connection AND (internet reachable OR unknown, but usually reachable)
       const isPhysicallyOnline = hasConnection && (state.isInternetReachable === null || hasInternet);

       // Case 1: Unauthenticated
       // Just reflect the physical state so login requests (mutations) can proceed.
       // We do not need to orchestrate sync for a user who isn't logged in.
       if (!isAuthenticated) {
          onlineManager.setOnline(isPhysicallyOnline);
          return;
       }

       // Case 2: Authenticated but Offline
       if (!isPhysicallyOnline) {
         onlineManager.setOnline(false);
         return;
       }
       
       // Case 3: Authenticated and Physically Online -> Check API Reachability
       const canReachApi = await checkApiReachability();
       if (!canReachApi) {
          onlineManager.setOnline(false);
          return;
       }

       // Case 4: Fully Online -> Orchestrate Sync
       // Check if we have paused mutations pending.
       const mutationCache = queryClient.getMutationCache();
       const pausedCount = mutationCache
          .getAll()
          .filter(m => m.state.isPaused).length;

       if (pausedCount > 0) {
          console.log('[NetworkManager] Online with paused mutations. Triggering Manual Sync.');
          // Keep OnlineManager FALSE to prevent race and auto-resume.
          // Trigger syncAll manually and wait for it to complete.
          await syncAll();
          
          // Once sync is done (managed serially), we can safely go online for queries
          console.log('[NetworkManager] Sync complete. Enabling QueryClient.');
          // Force a final check to ensure we didn't drift
          if(await checkApiReachability()) {
             onlineManager.setOnline(true);
          }
       } else {
          console.log('[NetworkManager] Online with no pending work. Enabling QueryClient.');
          // Only set online if we aren't already (to avoid re-renders or loops)
          if (!onlineManager.isOnline()) {
             onlineManager.setOnline(true);
          }
       }
    };

    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    return () => unsubscribe();
  }, [isAuthenticated, isRestoring, syncAll]);

  // Optimized Sync Logic
  // Wait for restoration to complete before attempting to sync.
  // Otherwise, we might overwrite pending offline mutations with stale server data.
  // Note: Standard 'isOnline' updates might lag behind the manual manager, providing a secondary trigger for periodic syncs.
  useEffect(() => {
    if (isAuthenticated && isOnline && !isRestoring) {
      const now = Date.now();
      // Sync if never synced or > 15 mins ago
      if (now - lastSyncTime.current > 15 * 60 * 1000) {
        syncAll();
        lastSyncTime.current = now;
      }
    }
  }, [isAuthenticated, isOnline, isRestoring, syncAll]);

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
