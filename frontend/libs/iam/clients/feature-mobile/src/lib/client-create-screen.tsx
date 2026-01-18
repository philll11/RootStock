import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateClient, ClientFormData } from '@rootstock/iam/clients/clients-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { ClientForm } from './client-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';
import 'react-native-get-random-values';
import { v4 as uuid } from 'uuid';

export const ClientCreateScreen = () => {
  const router = useRouter();
  // Generate a stable ID for this screen session to scope the mutation queue
  const tempId = React.useMemo(() => uuid(), []);
  const { mutate: createClient, mutateAsync: createClientAsync, isPending: isCreating } = useCreateClient({ 
    scope: { id: tempId } 
  });
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: ClientFormData) => {
    const isOnline = isConnected === true;
    try {
      const { isActive, __v, ...createData } = data;
      
      if (isOnline) {
        // Online: Wait for server response and ID to redirect to details
        // Note: The hook strips _id for online calls, so backend generates strict ID
        const newClient = await createClientAsync({ ...createData, _id: tempId });
        router.replace(`/iam/clients/${newClient._id}`);
      } else {
        // Offline: Queue it with the stable Scope ID and go back to list
        createClient({ ...createData, _id: tempId });
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
