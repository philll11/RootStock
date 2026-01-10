import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateClient, ClientFormData } from '@rootstock/iam/clients/clients-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { ClientForm } from './client-form';

export const ClientCreateScreen = () => {
  const router = useRouter();
  const { mutateAsync: createClient, isPending: isCreating } = useCreateClient();

  const handleSubmit = async (data: ClientFormData) => {
    try {
      const { isActive, __v, ...createData } = data;
      const newClient = await createClient(createData);
      router.replace(`/iam/clients/${newClient._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Client">
      <ClientForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
        isEditMode={false}
      />
    </ResourceCreateLayout>
  );
};
