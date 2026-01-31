import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useGetOrchard, useUpdateOrchard, OrchardFormData } from '@/features/assets/orchards/data';
import { ResourceEditLayout } from '@/components';
import { OrchardForm } from './orchard-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@/utils';

export function OrchardEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: orchard, isLoading, isError } = useGetOrchard(id!);
  const { mutate: updateOrchard, mutateAsync: updateOrchardAsync, isPending: isUpdating } = useUpdateOrchard();
  const { isConnected } = useNetInfo();

  const defaultValues = orchard ? {
    name: orchard.name,
    clientId:
      typeof orchard.clientId === 'string'
        ? orchard.clientId
        : orchard.clientId._id,
    userIds:
      orchard.userIds?.map((u) => (typeof u === 'string' ? u : u._id)) || [],
    isActive: orchard.isActive,
  } : undefined;

  const handleSubmit = async (data: OrchardFormData) => {
    if (!orchard) return;
    const isOnline = isConnected === true;
    const payload = { 
      id: id!, 
      data: {
        name: data.name,
        userIds: data.userIds,
        isActive: data.isActive,
        __v: orchard.__v
      } 
    };

    try {
      if (isOnline) {
        await updateOrchardAsync(payload);
      } else {
        updateOrchard(payload);
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
      error={isError || !orchard}
      title="Edit Orchard"
    >
      {orchard && (
        <OrchardForm
          mode="edit"
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isSubmitting={isUpdating}
        />
      )}
    </ResourceEditLayout>
  );
}
