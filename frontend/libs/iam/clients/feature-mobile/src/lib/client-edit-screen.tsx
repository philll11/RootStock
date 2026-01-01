import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useUpdateClient, useGetClient, ClientFormData } from '@rootstock/iam/clients/clients-data-access';
import { ResourceEditLayout } from '@rootstock/ui/mobile';
import { ClientForm } from './client-form';

export const ClientEditScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mutateAsync: updateClient, isPending: isUpdating } = useUpdateClient();
  const { data: client, isLoading } = useGetClient(id);

  const handleSubmit = async (data: ClientFormData) => {
    if (!id || !client) return;
    try {
      const { subsidiaryId, ...updateData } = data;
      await updateClient({ 
        id, 
        data: { 
          ...updateData, 
          __v: client.__v 
        } 
      });
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
