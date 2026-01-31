import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetVariety, useUpdateVariety, VarietyFormData } from '@/features/master-data/varieties/data';
import { ResourceEditLayout } from '@/components';
import { VarietyForm } from './variety-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@/utils';

export const VarietyEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: updateVariety, mutateAsync: updateVarietyAsync, isPending: isUpdating } = useUpdateVariety();
  const { data: variety, isLoading } = useGetVariety(id!);
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: VarietyFormData) => {
    if (!id || !variety) return;
    const isOnline = isConnected === true;

    try {
      const payload = { 
        id, 
        data: { 
          ...data, 
          __v: variety.__v 
        } 
      };

      if (isOnline) {
        await updateVarietyAsync(payload);
      } else {
        updateVariety(payload);
        notify.success('Will sync when online', 'Changes queued');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceEditLayout
      isLoading={isLoading}
      error={!variety}
      title="Edit Variety"
    >
      {variety && (
        <VarietyForm
          defaultValues={{
            name: variety.name,
            isActive: variety.isActive
          }}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          isEditMode={true}
        />
      )}
    </ResourceEditLayout>
  );
};
