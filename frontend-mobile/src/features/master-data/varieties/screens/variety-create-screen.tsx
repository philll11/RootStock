import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCreateVariety, VarietyFormData } from '@/features/master-data/varieties/data';
import { ResourceCreateLayout } from '@/components';
import { VarietyForm } from './variety-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@/utils';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

export const VarietyCreateScreen = () => {
  const router = useRouter();
  // Check for injected scope (from Block Create flow)
  const { scopeId, forcedId } = useLocalSearchParams<{ scopeId?: string; forcedId?: string }>();
  
  // Generate a stable ID for this screen session
  // If forcedId is provided (by parent form), use it. Otherwise, separate UUID.
  const tempId = React.useMemo(() => forcedId || uuid(), [forcedId]);
  
  const { mutate: createVariety, mutateAsync: createVarietyAsync, isPending: isCreating } = useCreateVariety({
    scope: scopeId ? { id: scopeId } : undefined
  });
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: VarietyFormData) => {
    const isOnline = isConnected === true;

    try {
      const { isActive, ...createData } = data;
      
      const payload = { ...createData, _id: tempId };

      if (isOnline) {
        const newVariety = await createVarietyAsync(payload);
        
        // If we are in a nested flow (implied by scopeId/forcedId), just go back to parent.
        if (scopeId || forcedId) {
             router.back();
        } else {
             router.replace(`/master-data/varieties/${newVariety._id}`);
        }
      } else {
        createVariety(payload);
        notify.success('Will sync when online', 'Saved to Outbox');
        router.back();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Variety">
      <VarietyForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
        isEditMode={false}
      />
    </ResourceCreateLayout>
  );
};
