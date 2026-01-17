import { useQueryClient } from '@tanstack/react-query';
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
      await queryClient.resumePausedMutations();

      // 2. WAIT: Ensure mutation queue is completely drained
      // This prevents "Overwrite Race Condition" where we fetch old data before our writes are processed
      while (queryClient.isMutating() > 0) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // 3. PULL: Fetch latest data (staleTime: 0 forces refresh)
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
      
      notify.success('Offline data synchronized successfully.', 'Sync Complete');
    } catch (error) {
      console.error('Sync failed:', error);
      notify.error('Failed to synchronize offline data.', 'Sync Failed');
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient, isSyncing]);

  return { syncAll, isSyncing };
}
