// frontend/libs/shared/util/src/lib/use-safe-refetch.ts
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { notify } from './notifications';

export function useSafeRefetch(refetchFn: () => Promise<any>) {
  const queryClient = useQueryClient();
  const [isRefetching, setIsRefetching] = useState(false);

  const safeRefetch = useCallback(async () => {
    if (isRefetching) return;
    setIsRefetching(true);
    try {
      // 1. PUSH: Resume suspended mutations
      await queryClient.resumePausedMutations();
      
      // 2. WAIT: Drain mutation queue
      while (queryClient.isMutating() > 0) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // 2.5 CHECK: Are there any stuck/pending items left?
      const pendingMutations = queryClient.getMutationCache().getAll().filter(
        (m) => m.state.status === 'pending'
      );

      if (pendingMutations.length > 0) {
        notify.warn('Sync pending. Cannot refresh yet.', 'Offline Changes');
        return; 
      }

      // 3. PULL: Execute the actual refetch
      await refetchFn();
    } catch (error) {
      console.error('Safe refetch failed', error);
    } finally {
      setIsRefetching(false);
    }
  }, [queryClient, isRefetching, refetchFn]);

  return { safeRefetch, isRefetching };
}
