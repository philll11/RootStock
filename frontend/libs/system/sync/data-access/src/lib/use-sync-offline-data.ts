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
      
      // Prefetch Clients
      await queryClient.prefetchQuery({ 
        queryKey: CLIENTS_KEYS.lists(), 
        queryFn: () => getClients() 
      });

      // Prefetch Orchards
      await queryClient.prefetchQuery({ 
        queryKey: ORCHARDS_KEYS.lists(), 
        queryFn: () => getOrchards() 
      });

      // Prefetch Blocks
      await queryClient.prefetchQuery({ 
        queryKey: BLOCKS_KEYS.list(undefined), 
        queryFn: () => getBlocks() 
      });

      // Prefetch Varieties
      await queryClient.prefetchQuery({ 
        queryKey: VARIETIES_KEYS.lists(), 
        queryFn: () => getVarieties() 
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
