import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateVariety, VarietyFormData } from '@rootstock/master-data/varieties/varieties-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { VarietyForm } from './variety-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';

export const VarietyCreateScreen = () => {
  const router = useRouter();
  const { mutate: createVariety, mutateAsync: createVarietyAsync, isPending: isCreating } = useCreateVariety();
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: VarietyFormData) => {
    const isOnline = isConnected === true;
    try {
      const { isActive, ...createData } = data;
      
      if (isOnline) {
        const newVariety = await createVarietyAsync(createData);
        router.replace(`/master-data/varieties/${newVariety._id}`);
      } else {
        createVariety(createData);
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
