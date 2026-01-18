import React from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateBlock, BlockFormData } from '@rootstock/assets/blocks/blocks-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { BlockForm } from './block-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';
import { ORCHARDS_KEYS, Orchard } from '@rootstock/assets/orchards/orchards-data-access';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

export function BlockCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isConnected } = useNetInfo();
  
  // State to track scope based on form selection
  const [scopeId, setScopeId] = React.useState<string | undefined>(undefined);

  // Generate a stable ID for this screen session (for the new record)
  const tempId = React.useMemo(() => uuid(), []);
  
  // Initialize hook with DYNAMIC scope derived from form state
  // If scopeId is undefined (initial), we default to undefined (global queue or no scope)
  // until the user selects an orchard.
  const { mutate: createBlock, mutateAsync: createBlockAsync, isPending: isCreating } = useCreateBlock({
    scope: scopeId ? { id: scopeId } : undefined
  });
  
  // Callback when user selects an orchard in the form
  const handleOrchardChange = React.useCallback((orchardId: string) => {
    const allOrchards = queryClient.getQueryData<Orchard[]>(ORCHARDS_KEYS.lists());
    const parentOrchard = allOrchards?.find(o => o._id === orchardId);
    
    // Handle potential populated object for clientId (string | object)
    const rawClientId = parentOrchard?.clientId;
    const newScopeId = (typeof rawClientId === 'object' ? rawClientId._id : rawClientId) || 'global';
    
    setScopeId(newScopeId);
  }, [queryClient]);

  const handleSubmit = async (data: BlockFormData) => {
    if (!data.orchardId) return;
    const isOnline = isConnected === true;

    try {
      const payload = {
        _id: tempId,
        name: data.name,
        orchardId: data.orchardId,
        plantings: data.plantings.map(p => ({
          varietyId: p.varietyId!,
          treeCount: p.treeCount
        })),
      };

      if (isOnline) {
        await createBlockAsync(payload);
      } else {
        createBlock(payload);
        notify.success('Will sync when online', 'Saved to Outbox');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Block">
      <BlockForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        onOrchardChange={handleOrchardChange}
        isSubmitting={isCreating}
        scopeId={scopeId}
      />
    </ResourceCreateLayout>
  );
}
