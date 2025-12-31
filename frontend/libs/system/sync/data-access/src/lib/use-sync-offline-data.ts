import { useQueryClient } from '@tanstack/react-query';
import { CLIENTS_KEYS, fetchClients } from '@rootstock/iam/clients/clients-data-access';
import { ORCHARDS_KEYS, fetchOrchards } from '@rootstock/assets/orchards/orchards-data-access';
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

      // Future: Add Blocks, Varieties here
      
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
