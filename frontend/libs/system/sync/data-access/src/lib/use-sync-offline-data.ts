import { useQueryClient } from '@tanstack/react-query';
import { CLIENTS_KEYS, fetchClients } from '@rootstock/iam/clients/clients-data-access';
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

      // Future: Add Orchards, Blocks, Varieties here
      
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
