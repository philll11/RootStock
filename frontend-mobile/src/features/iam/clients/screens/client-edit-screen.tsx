import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUpdateClient, useGetClient, ClientFormData } from '@/features/iam/clients/data';
import { ResourceEditLayout } from '@/components';
import { ClientForm } from './client-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@/utils';

export const ClientEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutate: updateClient, mutateAsync: updateClientAsync, isPending: isUpdating } = useUpdateClient();
  const { data: client, isLoading } = useGetClient(id);
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: ClientFormData) => {
    if (!id || !client) return;
    const isOnline = isConnected === true;

    try {
      const { subsidiaryId, ...updateData } = data;
      const payload = { 
        id, 
        data: { 
          ...updateData, 
          __v: client.__v 
        } 
      };

      if (isOnline) {
        await updateClientAsync(payload);
      } else {
        updateClient(payload);
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
      error={!client}
    >
      {client && (
        <ClientForm
          defaultValues={{
            name: client.name,
            isActive: client.isActive
          }}
          onSubmit={handleSubmit}
          isSubmitting={isUpdating}
          isEditMode={true}
        />
      )}
    </ResourceEditLayout>
  );
};
