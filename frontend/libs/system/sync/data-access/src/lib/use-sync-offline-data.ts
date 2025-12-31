import { useQueryClient } from '@tanstack/react-query';
import { CLIENTS_KEYS, fetchClients } from '@rootstock/iam/clients/clients-data-access';
import { ORCHARDS_KEYS, fetchOrchards } from '@rootstock/assets/orchards/orchards-data-access';
import { BLOCKS_KEYS, fetchBlocks } from '@rootstock/assets/blocks/blocks-data-access';
import { VARIETIES_KEYS, fetchVarieties } from '@rootstock/master-data/varieties/varieties-data-access';
import { useState, useCallback } from 'react';
import { notify } from '@rootstock/shared/util';

export function useSyncOfflineData() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const syncAll = useCallback(async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      
      // Prefetch Clients (Pilot)
      await queryClient.prefetchQuery({ 
        queryKey: CLIENTS_KEYS.lists(), 
        queryFn: fetchClients 
      });

      // Prefetch Orchards
      await queryClient.prefetchQuery({ 
        queryKey: ORCHARDS_KEYS.lists(), 
        queryFn: fetchOrchards 
      });

      // Prefetch Blocks
      await queryClient.prefetchQuery({ 
        queryKey: BLOCKS_KEYS.list(undefined), 
        queryFn: fetchBlocks 
      });

      // Prefetch Varieties
      await queryClient.prefetchQuery({ 
        queryKey: VARIETIES_KEYS.lists(), 
        queryFn: fetchVarieties 
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
