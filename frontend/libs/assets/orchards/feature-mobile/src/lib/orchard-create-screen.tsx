import React from 'react';
import { useRouter } from 'expo-router';
import { useCreateOrchard, OrchardFormData } from '@rootstock/assets/orchards/orchards-data-access';
import { ResourceCreateLayout } from '@rootstock/ui/mobile';
import { OrchardForm } from './orchard-form';
import { useNetInfo } from '@react-native-community/netinfo';
import { notify } from '@rootstock/shared/util';

export function OrchardCreateScreen() {
  const router = useRouter();
  const { mutate: createOrchard, mutateAsync: createOrchardAsync, isPending: isCreating } = useCreateOrchard();
  const { isConnected } = useNetInfo();

  const handleSubmit = async (data: OrchardFormData) => {
    if (!data.clientId) return;
    
    const isOnline = isConnected === true;
    try {
      if (isOnline) {
        await createOrchardAsync({
          name: data.name,
          clientId: data.clientId,
          userIds: data.userIds,
        });
      } else {
        createOrchard({
          name: data.name,
          clientId: data.clientId,
          userIds: data.userIds,
        });
        notify.success('Will sync when online', 'Saved to Outbox');
      }
      router.back();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <ResourceCreateLayout title="Create Orchard">
      <OrchardForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isSubmitting={isCreating}
      />
    </ResourceCreateLayout>
  );
}
