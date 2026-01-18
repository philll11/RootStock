import { useQueryClient, onlineManager } from '@tanstack/react-query';
import { CLIENTS_KEYS, getClients } from '@rootstock/iam/clients/clients-data-access';
import { ORCHARDS_KEYS, getOrchards } from '@rootstock/assets/orchards/orchards-data-access';
import { BLOCKS_KEYS, getBlocks } from '@rootstock/assets/blocks/blocks-data-access';
import { VARIETIES_KEYS, getVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useState, useCallback } from 'react';
import { notify } from '@rootstock/shared/util';

export function useSyncOfflineData() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAll = useCallback(async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      
      // 1. PUSH: Resume and flush local mutations
      // We leverage TanStack Query v5 'resumePausedMutations' which respects mutation scopes.
      // Mutations with distinct scopes (e.g. separate Client trees) will run in parallel.
      // Mutations with shared scopes will run serially.
      // 'resumePausedMutations' returns a promise that resolves when the resume process is *initiated*,
      // but not necessarily when all mutations are settled. So we must use the Wait loop below.
      
      const mutationCache = queryClient.getMutationCache();
      const pausedMutations = mutationCache
        .getAll()
        .filter((m) => m.state.isPaused);

      if (pausedMutations.length > 0) {
        notify.info(`Syncing ${pausedMutations.length} pending updates...`, 'Sync Started');
        await queryClient.resumePausedMutations();
      }

      // 2. WAIT: Stronger Drain Check
      // We check specifically for 'pending' or 'paused' mutations in the cache.
      const getQueueState = () => {
        const mutations = queryClient.getMutationCache().getAll();
        return {
          hasPending: mutations.some((m) => m.state.status === 'pending'),
          hasPaused: mutations.some((m) => m.state.isPaused),
        };
      };

      // Wait for PENDING (active) mutations to finish.
      // We do NOT wait indefinitely for PAUSED mutations (which implies network issues).
      // Timeout after 15 seconds to prevent infinite hanging.
      let attempts = 0;
      while (getQueueState().hasPending && attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      // Final Queue Check
      const finalState = getQueueState();

      if (finalState.hasPending) {
        // If still pending after timeout, likely stuck. Abort Pull to fail safe.
        throw new Error('Sync timeout: Mutations stuck in pending state.');
      }

      if (finalState.hasPaused) {
        // If mutations are paused, it means we couldn't push them (likely offline).
        // ABORT PULL: Pulling now would overwrite our local optimistic changes with old server data.
        console.warn('Sync aborted: Local changes are paused. Skipping pull to prevent data loss.');
        // We do not throw an error here, just return early. It's a valid "Partial Sync" state.
        return; 
      }

      // 3. PULL: Fetch latest data (staleTime: 0 forces refresh)
      // CRITICAL CHECK: If we are offline, prefetchQuery will PAUSE indefinitely waiting for connection.
      // We must abort here if onlineManager thinks we are offline.
      if (!onlineManager.isOnline()) {
        console.warn('Sync aborted: App is offline. Skipping pull to prevent hanging.');
        return;
      }

      const options = { staleTime: 0 };

      // Prefetch Clients
      await queryClient.prefetchQuery({ 
        queryKey: CLIENTS_KEYS.lists(), 
        queryFn: () => getClients(),
        ...options 
      });

      // Prefetch Orchards
      await queryClient.prefetchQuery({ 
        queryKey: ORCHARDS_KEYS.lists(), 
        queryFn: () => getOrchards(),
        ...options 
      });

      // Prefetch Blocks
      await queryClient.prefetchQuery({ 
        queryKey: BLOCKS_KEYS.list(undefined), 
        queryFn: () => getBlocks(),
        ...options 
      });

      // Prefetch Varieties
      await queryClient.prefetchQuery({ 
        queryKey: VARIETIES_KEYS.lists(), 
        queryFn: () => getVarieties(),
        ...options 
      });
      
      // Notify success ONLY if we actually reached good state (no early return)
      notify.success('Offline data synchronized successfully.', 'Sync Complete');
    } catch (error) {
      console.error('Sync failed:', error);
      // Only notify user of failure if it wasn't a silent abort
      notify.error('Failed to synchronize offline data.', 'Sync Failed');
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, isSyncing]);

  return { syncAll, isSyncing };
}
