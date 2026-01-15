import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateClient, ClientFormData } from '@rootstock/iam/clients/clients-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { ClientForm } from './client-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';

export const ClientCreateScreen = () => {
  const router = useRouter();
  const { mutate: createClient, mutateAsync: createClientAsync, isPending: isCreating } = useCreateClient();
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: ClientFormData) => {
    const isOnline = isConnected === true;
    try {
      const { isActive, __v, ...createData } = data;
      
      if (isOnline) {
        // Online: Wait for server response and ID to redirect to details
        const newClient = await createClientAsync(createData);
        router.replace(`/iam/clients/${newClient._id}`);
      } else {
        // Offline: Queue it and go back to list
        createClient(createData);
        notify.success('Will sync when online', 'Saved to Outbox');
        router.back();
      }
    } catch (error) {
      console.error(error);
      // Online errors will be caught here
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
