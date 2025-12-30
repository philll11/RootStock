import React from 'react';
import { useRouter } from 'expo-router';
import { useClients } from '@rootstock/iam/clients/clients-data-access';
import { ClientForm, ClientFormData } from './client-form';

export const ClientCreateScreen = () => {
  const router = useRouter();
  const { createClient, isCreating } = useClients();

  const handleSubmit = async (data: ClientFormData) => {
    try {
      const { isActive, ...createData } = data;
      const newClient = await createClient(createData);
      router.replace(`/iam/clients/${newClient._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ClientForm
      onSubmit={handleSubmit}
      isSubmitting={isCreating}
      isEditMode={false}
    />
  );
};
